-- Compass: schema inicial.
--
-- auth.users (Supabase Auth) guarda e-mail, senha e OTP. Aqui ficam:
--   profiles               dados do cadastro (nome, telefone), 1:1 com auth.users
--   trip_requests          respostas do wizard; status da geração
--   generated_itineraries  JSON devolvido pela IA (uma versão por regeneração) + checklist marcado
--
-- Quem escreve o quê:
--   usuário (role authenticated, via RLS) cria e lê os próprios pedidos e marca o checklist;
--   o servidor (service_role, ignora RLS) muda o status do pedido e grava os roteiros gerados.

-- ---------------------------------------------------------------------------
-- Utilidades
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------

create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text not null default '' check (char_length(full_name) <= 120),
  phone       text check (phone ~ '^\+?[0-9 ()-]{8,20}$'),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Cria o profile no cadastro com o que o front mandou em options.data (signUp / signInWithOtp).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  raw_phone text := nullif(trim(new.raw_user_meta_data ->> 'phone'), '');
begin
  insert into public.profiles (id, full_name, phone)
  values (
    new.id,
    left(coalesce(new.raw_user_meta_data ->> 'full_name', ''), 120),
    case when raw_phone ~ '^\+?[0-9 ()-]{8,20}$' then raw_phone end
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- trip_requests
-- ---------------------------------------------------------------------------

create table public.trip_requests (
  id                          uuid primary key default gen_random_uuid(),
  user_id                     uuid not null default auth.uid() references auth.users (id) on delete cascade,

  -- Etapa 1: sub-região (mesmos ids de src/lib/constants.ts)
  subregion                   text not null check (subregion in (
                                'america-do-norte', 'america-central', 'america-do-sul',
                                'europa-do-norte', 'europa-do-sul', 'europa-central-leste',
                                'asia-leste', 'oriente-medio', 'sudeste-asiatico',
                                'africa-do-norte', 'africa-subsaariana', 'oceania')),
  -- Etapa 2: datas e flexibilidade
  start_date                  date not null,
  end_date                    date not null,
  flex_days_outbound          smallint not null default 0 check (flex_days_outbound between 0 and 5),
  flex_days_return            smallint not null default 0 check (flex_days_return between 0 and 5),
  -- 2026-09-10 a 2026-09-25 = 15 dias, como no exemplo do PRD
  total_days                  integer generated always as (end_date - start_date) stored,
  -- Etapa 3: auge da viagem
  highlight                   text not null check (char_length(highlight) between 2 and 120),
  -- Etapa 4: locais complementares e a evitar
  desired_places              text[] not null default '{}' check (cardinality(desired_places) <= 15),
  avoided_places              text[] not null default '{}' check (cardinality(avoided_places) <= 15),
  -- Etapa 5: origem e aeroportos
  origin_city                 text not null check (char_length(origin_city) between 2 and 120),
  accepts_alternate_airports  boolean not null default false,
  -- Etapa 6: ritmo
  pace                        text not null check (pace in ('lento', 'medio', 'acelerado')),
  -- Etapa 7: observações livres
  notes                       text not null default '' check (char_length(notes) <= 2000),

  status                      text not null default 'pending'
                                check (status in ('pending', 'generating', 'completed', 'failed')),
  error_message               text,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now(),

  constraint trip_requests_dates_check check (end_date > start_date and end_date - start_date <= 90)
);

create index trip_requests_user_created_idx on public.trip_requests (user_id, created_at desc);

create trigger trip_requests_set_updated_at
  before update on public.trip_requests
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- generated_itineraries
-- ---------------------------------------------------------------------------

create table public.generated_itineraries (
  id               uuid primary key default gen_random_uuid(),
  trip_request_id  uuid not null references public.trip_requests (id) on delete cascade,
  -- Copiado do pedido para a RLS não precisar de join
  user_id          uuid not null references auth.users (id) on delete cascade,
  version          integer not null default 1 check (version >= 1),

  title            text not null check (char_length(title) between 1 and 160),
  -- Resposta da IA já validada pelo Zod: { resumo_estrategico, pontos_mapa[] }
  -- coalesce: jsonb_typeof de chave ausente é null, e check com null passa
  itinerary        jsonb not null check (coalesce(
                     jsonb_typeof(itinerary -> 'resumo_estrategico') = 'object'
                     and jsonb_typeof(itinerary -> 'pontos_mapa') = 'array', false)),
  -- Itens marcados no mapa: { "<id_ponto>": [índices do checklist] }, ex.: { "p1": [0, 2] }
  checklist_state  jsonb not null default '{}' check (jsonb_typeof(checklist_state) = 'object'),

  -- Telemetria da geração (custo e tempo)
  model            text not null,
  input_tokens     integer,
  output_tokens    integer,
  latency_ms       integer,

  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),

  unique (trip_request_id, version)
);

create index generated_itineraries_user_created_idx on public.generated_itineraries (user_id, created_at desc);

create trigger generated_itineraries_set_updated_at
  before update on public.generated_itineraries
  for each row execute function public.set_updated_at();

-- O dono do roteiro tem de ser o dono do pedido (o servidor usa service_role e ignora RLS).
create or replace function public.check_itinerary_owner()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.trip_requests
    where id = new.trip_request_id and user_id = new.user_id
  ) then
    raise exception 'user_id do roteiro difere do dono do trip_request %', new.trip_request_id;
  end if;
  return new;
end;
$$;

create trigger generated_itineraries_check_owner
  before insert or update of trip_request_id, user_id on public.generated_itineraries
  for each row execute function public.check_itinerary_owner();

-- ---------------------------------------------------------------------------
-- Permissões: RLS por linha + grants por coluna
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.trip_requests enable row level security;
alter table public.generated_itineraries enable row level security;

-- O Supabase dá ALL para anon/authenticated em tabelas novas; partimos do zero.
revoke all on public.profiles, public.trip_requests, public.generated_itineraries from anon, authenticated;

-- profiles: ler e editar o próprio nome e telefone
grant select on public.profiles to authenticated;
grant update (full_name, phone) on public.profiles to authenticated;

create policy "profiles: dono lê"
  on public.profiles for select to authenticated
  using ((select auth.uid()) = id);

create policy "profiles: dono edita"
  on public.profiles for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- trip_requests: criar (só as respostas do wizard, nunca o status), ler e apagar os próprios
grant select, delete on public.trip_requests to authenticated;
grant insert (
  subregion, start_date, end_date, flex_days_outbound, flex_days_return, highlight,
  desired_places, avoided_places, origin_city, accepts_alternate_airports, pace, notes
) on public.trip_requests to authenticated;

create policy "trip_requests: dono lê"
  on public.trip_requests for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "trip_requests: dono cria"
  on public.trip_requests for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "trip_requests: dono apaga"
  on public.trip_requests for delete to authenticated
  using ((select auth.uid()) = user_id);

-- generated_itineraries: ler, renomear e marcar o checklist; quem grava é o servidor
grant select on public.generated_itineraries to authenticated;
grant update (title, checklist_state) on public.generated_itineraries to authenticated;

create policy "generated_itineraries: dono lê"
  on public.generated_itineraries for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "generated_itineraries: dono edita"
  on public.generated_itineraries for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- Limite de uso: gerações nas últimas 24 h (a API recusa acima do limite do plano)
-- ---------------------------------------------------------------------------

create or replace function public.generations_last_24h(p_user_id uuid)
returns integer
language sql
stable
set search_path = ''
as $$
  select count(*)::integer
  from public.generated_itineraries
  where user_id = p_user_id and created_at > now() - interval '24 hours';
$$;

revoke execute on function public.generations_last_24h(uuid) from public, anon, authenticated;
grant execute on function public.generations_last_24h(uuid) to service_role;

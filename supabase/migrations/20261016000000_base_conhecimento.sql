-- Base de conhecimento (Fase 1): fontes, destinos, lugares, trechos, dicas, eventos, roteiros base,
-- citações, fila de ingestão com revisão e busca semântica (pgvector).
-- Só admins leem e escrevem (RLS por is_admin()); o motor de geração lê pelo servidor (service_role).

create extension if not exists vector with schema extensions;

-- ---------------------------------------------------------------------------
-- Admins
-- ---------------------------------------------------------------------------

create table public.admins (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.admins enable row level security;
revoke all on public.admins from anon, authenticated;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admins where user_id = (select auth.uid()));
$$;
revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- ---------------------------------------------------------------------------
-- Fontes (de onde veio cada informação)
-- ---------------------------------------------------------------------------

create table public.fontes (
  id           uuid primary key default gen_random_uuid(),
  tipo         text not null check (tipo in ('relato_comunidade', 'roteiro_proprio', 'anotacao_propria', 'consultoria')),
  autoria      text not null check (autoria in ('propria', 'terceiro')),
  titulo       text not null check (char_length(titulo) between 1 and 200),
  arquivo_nome text,
  arquivo_path text,                       -- bucket privado "fontes"
  mime         text,
  hash         text unique,                -- sha-256 do arquivo: evita subir o mesmo duas vezes
  viagem_mes   text check (viagem_mes ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  texto        text,                       -- texto extraído; privado (só admin)
  criado_por   uuid references auth.users (id) on delete set null,
  created_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Conhecimento
-- ---------------------------------------------------------------------------

create table public.destinos (
  id                  uuid primary key default gen_random_uuid(),
  nome                text not null,
  nome_chave          text not null,       -- normalizado no app (minúsculas, sem acento)
  tipo                text not null check (tipo in ('pais', 'regiao', 'cidade')),
  pais_codigo         char(2) not null check (pais_codigo ~ '^[A-Z]{2}$'),
  pai_id              uuid references public.destinos (id) on delete set null,
  lat                 double precision check (lat between -90 and 90),
  lng                 double precision check (lng between -180 and 180),
  resumo              text,
  moeda               char(3),
  visto               text,
  visto_verificado_em date,
  melhor_epoca_meses  smallint[] not null default '{}',
  evitar_meses        smallint[] not null default '{}',
  clima_por_mes       jsonb,
  custo_diario        jsonb,               -- { economico, medio, conforto, moeda, ano }
  status              text not null default 'aprovado' check (status in ('aprovado', 'arquivado')),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (pais_codigo, tipo, nome_chave)
);
create index destinos_chave_idx on public.destinos (nome_chave);

create table public.lugares (
  id               uuid primary key default gen_random_uuid(),
  destino_id       uuid not null references public.destinos (id) on delete cascade,
  nome             text not null,
  nome_chave       text not null,
  tipo             text not null check (tipo in ('atracao', 'passeio', 'restaurante', 'hospedagem', 'bar', 'compras', 'operador')),
  tags             text[] not null default '{}',
  resumo           text not null,
  tempo_visita_min integer,
  custo            jsonb,                  -- { valor, moeda, ref, obs }
  reservar_antes   boolean,
  melhor_horario   text,
  lat              double precision,
  lng              double precision,
  veredito         text not null default 'neutro' check (veredito in ('recomendado', 'neutro', 'evitar')),
  mencoes          integer not null default 1 check (mencoes >= 1),
  status           text not null default 'aprovado' check (status in ('aprovado', 'arquivado')),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (destino_id, nome_chave)
);

create table public.trechos (
  id          uuid primary key default gen_random_uuid(),
  origem_id   uuid not null references public.destinos (id) on delete cascade,
  destino_id  uuid not null references public.destinos (id) on delete cascade,
  meio        text not null check (meio in ('voo', 'trem', 'ferry', 'barco', 'onibus', 'carro', 'taxi', 'outro')),
  duracao_min integer,
  custo       jsonb,
  operador    text,
  obs         text,
  mencoes     integer not null default 1 check (mencoes >= 1),
  status      text not null default 'aprovado' check (status in ('aprovado', 'arquivado')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (origem_id, destino_id, meio)
);

create table public.dicas (
  id         uuid primary key default gen_random_uuid(),
  destino_id uuid not null references public.destinos (id) on delete cascade,
  lugar_id   uuid references public.lugares (id) on delete set null,
  categoria  text not null,
  texto      text not null,
  ano_ref    smallint,
  status     text not null default 'aprovado' check (status in ('aprovado', 'arquivado')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index dicas_destino_idx on public.dicas (destino_id);

create table public.eventos (
  id         uuid primary key default gen_random_uuid(),
  destino_id uuid not null references public.destinos (id) on delete cascade,
  nome       text not null,
  nome_chave text not null,
  regra_data text not null,
  meses      smallint[] not null default '{}',
  status     text not null default 'aprovado' check (status in ('aprovado', 'arquivado')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (destino_id, nome_chave)
);

create table public.roteiros_base (
  id           uuid primary key default gen_random_uuid(),
  titulo       text not null,
  assinado     boolean not null default false,   -- vendido como "roteiro assinado"
  autoria      text not null check (autoria in ('propria', 'terceiro')),
  fonte_id     uuid references public.fontes (id) on delete set null,
  duracao_dias integer not null check (duracao_dias between 1 and 120),
  resumo       text not null default '',
  epoca        text,
  essencia     text[] not null default '{}',
  paises       text[] not null default '{}',
  status       text not null default 'aprovado' check (status in ('aprovado', 'arquivado')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table public.roteiro_base_dias (
  id           uuid primary key default gen_random_uuid(),
  roteiro_id   uuid not null references public.roteiros_base (id) on delete cascade,
  dia          integer not null check (dia >= 1),
  destino_id   uuid references public.destinos (id) on delete set null,
  cidade       text not null,
  pernoite     text,
  atividades   text[] not null default '{}',
  deslocamento jsonb,
  obs          text,
  unique (roteiro_id, dia)
);

-- Qual fonte sustenta qual registro (com um trecho curto para conferência)
create table public.citacoes (
  id            uuid primary key default gen_random_uuid(),
  fonte_id      uuid not null references public.fontes (id) on delete cascade,
  registro_tipo text not null check (registro_tipo in ('destino', 'lugar', 'trecho', 'dica', 'evento', 'roteiro')),
  registro_id   uuid not null,
  trecho        text check (char_length(trecho) <= 300),
  created_at    timestamptz not null default now()
);
create index citacoes_registro_idx on public.citacoes (registro_tipo, registro_id);
create index citacoes_fonte_idx on public.citacoes (fonte_id);

-- ---------------------------------------------------------------------------
-- Ingestão e revisão
-- ---------------------------------------------------------------------------

create table public.ingestoes (
  id            uuid primary key default gen_random_uuid(),
  fonte_id      uuid not null references public.fontes (id) on delete cascade,
  status        text not null default 'processando' check (status in ('processando', 'revisao', 'concluida', 'erro')),
  erro          text,
  modelo        text,
  input_tokens  integer,
  output_tokens integer,
  criado_por    uuid references auth.users (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table public.ingestao_itens (
  id           uuid primary key default gen_random_uuid(),
  ingestao_id  uuid not null references public.ingestoes (id) on delete cascade,
  ordem        integer not null,
  tipo         text not null check (tipo in ('destino', 'lugar', 'trecho', 'dica', 'evento', 'roteiro')),
  dados        jsonb not null,
  avisos       text[] not null default '{}',
  decisao      text not null default 'pendente' check (decisao in ('pendente', 'aprovado', 'rejeitado')),
  registro_id  uuid,                         -- o que foi criado ou mesclado ao aprovar
  revisado_por uuid references auth.users (id) on delete set null,
  revisado_em  timestamptz,
  created_at   timestamptz not null default now()
);
create index ingestao_itens_fila_idx on public.ingestao_itens (ingestao_id, decisao, ordem);

-- ---------------------------------------------------------------------------
-- Busca semântica
-- ---------------------------------------------------------------------------

create table public.conhecimento_busca (
  id            uuid primary key default gen_random_uuid(),
  registro_tipo text not null check (registro_tipo in ('destino', 'lugar', 'trecho', 'dica', 'evento', 'roteiro')),
  registro_id   uuid not null,
  destino_id    uuid references public.destinos (id) on delete cascade,
  pais_codigo   char(2),
  texto         text not null,
  embedding     extensions.vector(768),
  modelo        text,
  updated_at    timestamptz not null default now(),
  unique (registro_tipo, registro_id)
);
create index conhecimento_busca_pais_idx on public.conhecimento_busca (pais_codigo);
create index conhecimento_busca_embedding_idx on public.conhecimento_busca
  using hnsw (embedding extensions.vector_cosine_ops);

-- Mais próximos de um embedding de consulta, opcionalmente filtrando por país.
create or replace function public.buscar_conhecimento(
  p_embedding extensions.vector(768),
  p_paises text[] default null,
  p_limite integer default 30
)
returns table (registro_tipo text, registro_id uuid, pais_codigo char(2), texto text, similaridade double precision)
language sql
stable
set search_path = ''
as $$
  select b.registro_tipo, b.registro_id, b.pais_codigo, b.texto,
         1 - (b.embedding operator(extensions.<=>) p_embedding) as similaridade
  from public.conhecimento_busca b
  where b.embedding is not null
    and (p_paises is null or b.pais_codigo = any (p_paises))
  order by b.embedding operator(extensions.<=>) p_embedding
  limit least(greatest(p_limite, 1), 200);
$$;
revoke execute on function public.buscar_conhecimento(extensions.vector, text[], integer) from public, anon;
grant execute on function public.buscar_conhecimento(extensions.vector, text[], integer) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- updated_at
-- ---------------------------------------------------------------------------

create trigger destinos_set_updated_at before update on public.destinos for each row execute function public.set_updated_at();
create trigger lugares_set_updated_at before update on public.lugares for each row execute function public.set_updated_at();
create trigger trechos_set_updated_at before update on public.trechos for each row execute function public.set_updated_at();
create trigger dicas_set_updated_at before update on public.dicas for each row execute function public.set_updated_at();
create trigger eventos_set_updated_at before update on public.eventos for each row execute function public.set_updated_at();
create trigger roteiros_base_set_updated_at before update on public.roteiros_base for each row execute function public.set_updated_at();
create trigger ingestoes_set_updated_at before update on public.ingestoes for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Permissões: só admin (RLS); service_role ignora a RLS
-- ---------------------------------------------------------------------------

do $$
declare t text;
begin
  foreach t in array array['fontes', 'destinos', 'lugares', 'trechos', 'dicas', 'eventos', 'roteiros_base',
                           'roteiro_base_dias', 'citacoes', 'ingestoes', 'ingestao_itens', 'conhecimento_busca']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('create policy "%s: só admin" on public.%I for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()))', t, t);
  end loop;
end $$;

-- Arquivos originais: bucket privado, só admin
insert into storage.buckets (id, name, public, file_size_limit)
values ('fontes', 'fontes', false, 26214400)
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit;

create policy "fontes: admin lê" on storage.objects for select to authenticated
  using (bucket_id = 'fontes' and (select public.is_admin()));
create policy "fontes: admin envia" on storage.objects for insert to authenticated
  with check (bucket_id = 'fontes' and (select public.is_admin()));
create policy "fontes: admin apaga" on storage.objects for delete to authenticated
  using (bucket_id = 'fontes' and (select public.is_admin()));

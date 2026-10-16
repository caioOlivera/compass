-- B2B: agências (organizações) com membros e marca própria, usada no PDF enviado ao cliente final.
-- O plano (basic/premium) e a validade só o servidor altera (depende de pagamento).

create table public.organizacoes (
  id              uuid primary key default gen_random_uuid(),
  nome            text not null check (char_length(nome) between 2 and 120),
  logo_path       text,
  cor             text not null default '#1f6f5c' check (cor ~ '^#[0-9a-fA-F]{6}$'),
  contato         jsonb not null default '{}' check (jsonb_typeof(contato) = 'object'),
  plano           text check (plano in ('basic', 'premium')),
  plano_ativo_ate timestamptz,
  criado_por      uuid references auth.users (id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create trigger organizacoes_set_updated_at before update on public.organizacoes
  for each row execute function public.set_updated_at();

create table public.organizacao_membros (
  organizacao_id uuid not null references public.organizacoes (id) on delete cascade,
  user_id        uuid not null references auth.users (id) on delete cascade,
  papel          text not null default 'membro' check (papel in ('dono', 'membro')),
  created_at     timestamptz not null default now(),
  primary key (organizacao_id, user_id)
);
-- Uma agência por pessoa (simplifica permissões e cobrança)
create unique index organizacao_membros_usuario_idx on public.organizacao_membros (user_id);

create or replace function public.minha_organizacao()
returns uuid language sql stable security definer set search_path = '' as $$
  select organizacao_id from public.organizacao_membros where user_id = (select auth.uid());
$$;

create or replace function public.sou_dono_da_organizacao()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.organizacao_membros where user_id = (select auth.uid()) and papel = 'dono');
$$;

alter table public.organizacoes enable row level security;
alter table public.organizacao_membros enable row level security;
revoke all on public.organizacoes, public.organizacao_membros from anon, authenticated;
grant select on public.organizacoes, public.organizacao_membros to authenticated;
grant update (nome, logo_path, cor, contato) on public.organizacoes to authenticated;

create policy "organizacoes: membro lê" on public.organizacoes for select to authenticated
  using (id = (select public.minha_organizacao()) or (select public.is_admin()));
create policy "organizacoes: dono edita a marca" on public.organizacoes for update to authenticated
  using (id = (select public.minha_organizacao()) and (select public.sou_dono_da_organizacao()))
  with check (id = (select public.minha_organizacao()));
create policy "membros: colegas se veem" on public.organizacao_membros for select to authenticated
  using (organizacao_id = (select public.minha_organizacao()) or (select public.is_admin()));

-- Criar a agência: quem cria vira dono. Quem já está numa agência não cria outra.
create or replace function public.criar_organizacao(p_nome text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if (select auth.uid()) is null then raise exception 'sem sessão'; end if;
  if exists (select 1 from public.organizacao_membros where user_id = (select auth.uid())) then
    raise exception 'você já faz parte de uma agência';
  end if;
  insert into public.organizacoes (nome, criado_por) values (trim(p_nome), (select auth.uid())) returning id into v_id;
  insert into public.organizacao_membros (organizacao_id, user_id, papel) values (v_id, (select auth.uid()), 'dono');
  return v_id;
end $$;

-- Dono adiciona colega pelo e-mail (a pessoa precisa ter conta)
create or replace function public.adicionar_membro(p_email text)
returns text language plpgsql security definer set search_path = '' as $$
declare v_org uuid; v_user uuid;
begin
  if not public.sou_dono_da_organizacao() then raise exception 'só o dono da agência adiciona membros'; end if;
  v_org := public.minha_organizacao();
  select id into v_user from auth.users where lower(email) = lower(trim(p_email));
  if v_user is null then return 'sem_conta'; end if;
  if exists (select 1 from public.organizacao_membros where user_id = v_user) then return 'ja_em_agencia'; end if;
  if (select count(*) from public.organizacao_membros where organizacao_id = v_org) >= 20 then return 'limite'; end if;
  insert into public.organizacao_membros (organizacao_id, user_id, papel) values (v_org, v_user, 'membro');
  return 'ok';
end $$;

-- Remover membro: feito pelo servidor (ação do painel da agência), que confere se quem pede é o dono.

revoke execute on function public.minha_organizacao(), public.sou_dono_da_organizacao(),
  public.criar_organizacao(text), public.adicionar_membro(text) from public, anon;
grant execute on function public.minha_organizacao(), public.sou_dono_da_organizacao(),
  public.criar_organizacao(text), public.adicionar_membro(text) to authenticated;

-- Logos: bucket público, cada agência só mexe na própria pasta (dono)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('marcas', 'marcas', true, 1048576, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;
create policy "marcas: dono envia" on storage.objects for insert to authenticated
  with check (bucket_id = 'marcas' and (storage.foldername(name))[1] = (select public.minha_organizacao())::text
              and (select public.sou_dono_da_organizacao()));
create policy "marcas: dono lê a pasta" on storage.objects for select to authenticated
  using (bucket_id = 'marcas' and (storage.foldername(name))[1] = (select public.minha_organizacao())::text);
-- Sem apagar: cada logo novo tem nome novo; o antigo fica órfão (sem efeito para ninguém).

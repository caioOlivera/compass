-- Acessos gratuitos concedidos pelo admin (família, comunidade): tudo liberado até a data, ou sem fim.
create table public.acessos_gratis (
  id             uuid primary key default gen_random_uuid(),
  email          text not null,
  user_id        uuid references auth.users (id) on delete set null,
  valido_ate     timestamptz,
  motivo         text not null default '' check (char_length(motivo) <= 200),
  concedido_por  uuid references auth.users (id) on delete set null,
  revogado_em    timestamptz,
  created_at     timestamptz not null default now()
);
create index acessos_gratis_email_idx on public.acessos_gratis (lower(email));
create index acessos_gratis_user_idx on public.acessos_gratis (user_id);

-- Roteiro de boas-vindas: uma linha por pessoa que já recebeu (evita dar duas vezes)
create table public.boas_vindas (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Aceite dos termos (conteúdo digital entregue na hora) gravado no pedido
alter table public.pedidos add column termos_aceitos_em timestamptz;

insert into public.configuracoes (chave, valor, descricao) values
  ('atualizacao_completo', '{"dias": 15}', 'Por quantos dias as passagens e hotéis de um roteiro completo são atualizados (1 vez ao dia).'),
  ('roteiro_boas_vindas', 'true', 'Toda conta nova ganha 1 roteiro grátis (sem passagens e hotéis).')
on conflict (chave) do nothing;

alter table public.acessos_gratis enable row level security;
alter table public.boas_vindas enable row level security;
revoke all on public.acessos_gratis, public.boas_vindas from anon, authenticated;
grant select on public.acessos_gratis to authenticated;
create policy "acessos_gratis: só admin lê" on public.acessos_gratis for select to authenticated using ((select public.is_admin()));

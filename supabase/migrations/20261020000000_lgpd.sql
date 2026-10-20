-- LGPD: exclusão de conta pelo titular sem perder o que a lei manda guardar.
-- pedidos_arquivados: cópia dos pedidos pagos de quem excluiu a conta, sem nome, e-mail ou id da conta,
-- guardada 5 anos para obrigações fiscais e de defesa (LGPD art. 16, I e II).
-- contas_excluidas: só o hash do e-mail, para o roteiro de boas-vindas não renascer a cada conta nova.
-- As duas ficam sem políticas de RLS: só o servidor (service_role) lê e escreve.

create table if not exists public.pedidos_arquivados (
  id uuid primary key,
  produto text not null,
  valor numeric not null,
  status text not null,
  provedor text,
  provedor_id text,
  metodo text,
  pago_em timestamptz,
  criado_em timestamptz not null,
  arquivado_em timestamptz not null default now(),
  apagar_apos timestamptz not null default now() + interval '5 years'
);
alter table public.pedidos_arquivados enable row level security;

create table if not exists public.contas_excluidas (
  email_hash text primary key,
  excluida_em timestamptz not null default now()
);
alter table public.contas_excluidas enable row level security;

revoke all on public.pedidos_arquivados, public.contas_excluidas from anon, authenticated;

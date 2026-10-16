-- Suporte: chamados abertos pelo cliente logado e a conversa de cada um. O cliente lê os seus;
-- o admin lê todos. Quem grava é o servidor (service_role), depois de conferir a sessão.

create table public.chamados (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  assunto    text not null check (char_length(assunto) between 3 and 140),
  categoria  text not null default 'outro' check (categoria in ('roteiro', 'pagamento', 'conta', 'agencia', 'consultoria', 'outro')),
  status     text not null default 'aberto' check (status in ('aberto', 'respondido', 'fechado')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index chamados_usuario_idx on public.chamados (user_id, updated_at desc);
create index chamados_status_idx on public.chamados (status, updated_at desc);
create trigger chamados_set_updated_at before update on public.chamados for each row execute function public.set_updated_at();

create table public.chamado_mensagens (
  id         uuid primary key default gen_random_uuid(),
  chamado_id uuid not null references public.chamados (id) on delete cascade,
  autor      text not null check (autor in ('cliente', 'equipe')),
  autor_id   uuid references auth.users (id) on delete set null,
  texto      text not null check (char_length(texto) between 1 and 5000),
  created_at timestamptz not null default now()
);
create index chamado_mensagens_idx on public.chamado_mensagens (chamado_id, created_at);

alter table public.chamados enable row level security;
alter table public.chamado_mensagens enable row level security;
revoke all on public.chamados, public.chamado_mensagens from anon, authenticated;
grant select on public.chamados, public.chamado_mensagens to authenticated;

create policy "chamados: dono e admin leem" on public.chamados for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy "chamado_mensagens: dono e admin leem" on public.chamado_mensagens for select to authenticated
  using (
    (select public.is_admin())
    or exists (select 1 from public.chamados c where c.id = chamado_id and c.user_id = (select auth.uid()))
  );

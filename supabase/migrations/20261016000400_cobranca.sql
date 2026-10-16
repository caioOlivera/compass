-- Fase 5: cobrança. Pedidos (compras avulsas e assinaturas), livro-razão de créditos com validade,
-- assinaturas B2B e consultorias pessoais. Tudo gravado pelo servidor (service_role); o cliente só lê
-- o que é dele. O livro-razão só recebe inserções: crédito entra como lote (+N) e o uso aponta o lote.

insert into public.configuracoes (chave, valor, descricao) values
  ('cobranca_ativa', 'false', 'Liga a cobrança: com false, gerar roteiros segue grátis (só o limite diário). Ligue depois de configurar o Mercado Pago.')
on conflict (chave) do nothing;

create table public.pedidos (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users (id) on delete cascade,
  organizacao_id uuid references public.organizacoes (id) on delete set null,
  produto        text not null check (produto in ('roteiro', 'assinado', 'completo', 'consultoria', 'basic', 'premium')),
  valor          numeric(10, 2) not null check (valor > 0),
  status         text not null default 'pendente' check (status in ('pendente', 'pago', 'cancelado', 'estornado', 'expirado')),
  provedor       text not null default 'mercadopago',
  provedor_id    text,              -- id do pagamento ou da assinatura no provedor
  metodo         text,              -- pix, credit_card...
  referencia     jsonb not null default '{}',  -- ex.: { "roteiro_base_id": "..." }
  pago_em        timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index pedidos_usuario_idx on public.pedidos (user_id, created_at desc);
create trigger pedidos_set_updated_at before update on public.pedidos for each row execute function public.set_updated_at();

create table public.creditos (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references auth.users (id) on delete cascade,
  organizacao_id  uuid references public.organizacoes (id) on delete cascade,
  tipo            text not null check (tipo in ('roteiro', 'assinado', 'completo', 'consultoria')),
  quantidade      integer not null check (quantidade <> 0),
  motivo          text not null check (motivo in ('compra', 'uso', 'ajuste_extra', 'reembolso', 'plano_mensal', 'cortesia')),
  lote_id         uuid references public.creditos (id),   -- no uso/reembolso: de qual lote saiu
  pedido_id       uuid references public.pedidos (id) on delete set null,
  trip_request_id uuid references public.trip_requests (id) on delete set null,
  valido_ate      timestamptz,                             -- só nos lotes (quantidade > 0)
  created_at      timestamptz not null default now(),
  check ((user_id is null) <> (organizacao_id is null)),
  check ((quantidade > 0) = (lote_id is null))
);
create index creditos_dono_idx on public.creditos (user_id, organizacao_id, tipo);
create index creditos_lote_idx on public.creditos (lote_id);

create table public.assinaturas (
  id             uuid primary key default gen_random_uuid(),
  organizacao_id uuid not null references public.organizacoes (id) on delete cascade,
  plano          text not null check (plano in ('basic', 'premium')),
  status         text not null default 'pendente' check (status in ('pendente', 'ativa', 'pausada', 'cancelada')),
  provedor       text not null default 'mercadopago',
  provedor_id    text unique,
  atual_ate      timestamptz,
  criado_por     uuid references auth.users (id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create trigger assinaturas_set_updated_at before update on public.assinaturas for each row execute function public.set_updated_at();

create table public.consultorias (
  id         uuid primary key default gen_random_uuid(),
  pedido_id  uuid not null unique references public.pedidos (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  briefing   jsonb,
  status     text not null default 'aguardando_briefing' check (status in ('aguardando_briefing', 'nova', 'em_andamento', 'entregue')),
  notas      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger consultorias_set_updated_at before update on public.consultorias for each row execute function public.set_updated_at();

-- Eventos de webhook já processados (o provedor pode reenviar o mesmo)
create table public.webhooks_recebidos (
  chave      text primary key,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Saldo e consumo
-- ---------------------------------------------------------------------------

-- Lotes válidos com o que ainda resta em cada um
create or replace view public.creditos_lotes with (security_invoker = true) as
select l.id, l.user_id, l.organizacao_id, l.tipo, l.valido_ate, l.created_at,
       l.quantidade + coalesce((select sum(u.quantidade) from public.creditos u where u.lote_id = l.id), 0) as restante
from public.creditos l
where l.quantidade > 0;

-- Consome 1 crédito do lote que vence primeiro. Trava os lotes do dono para não gastar o mesmo duas vezes.
create or replace function public.consumir_credito(
  p_user_id uuid, p_organizacao_id uuid, p_tipos text[], p_motivo text, p_trip_request_id uuid
) returns uuid language plpgsql security definer set search_path = '' as $$
declare v_lote uuid; v_tipo text; v_uso uuid;
begin
  perform 1 from public.creditos
   where quantidade > 0
     and (user_id = p_user_id or (p_organizacao_id is not null and organizacao_id = p_organizacao_id))
   for update;
  select l.id, l.tipo into v_lote, v_tipo
    from public.creditos_lotes l
   where l.restante > 0
     and l.tipo = any (p_tipos)
     and (l.valido_ate is null or l.valido_ate > now())
     and ((p_organizacao_id is not null and l.organizacao_id = p_organizacao_id) or l.user_id = p_user_id)
   order by (l.organizacao_id is null), l.valido_ate nulls last, l.created_at
   limit 1;
  if v_lote is null then return null; end if;
  insert into public.creditos (user_id, organizacao_id, tipo, quantidade, motivo, lote_id, trip_request_id)
  select user_id, organizacao_id, tipo, -1, p_motivo, id, p_trip_request_id from public.creditos where id = v_lote
  returning id into v_uso;
  return v_uso;
end $$;
revoke execute on function public.consumir_credito(uuid, uuid, text[], text, uuid) from public, anon, authenticated;
grant execute on function public.consumir_credito(uuid, uuid, text[], text, uuid) to service_role;

-- ---------------------------------------------------------------------------
-- Permissões: dono lê o que é seu; admin lê tudo; quem grava é o servidor
-- ---------------------------------------------------------------------------

alter table public.pedidos enable row level security;
alter table public.creditos enable row level security;
alter table public.assinaturas enable row level security;
alter table public.consultorias enable row level security;
alter table public.webhooks_recebidos enable row level security;
revoke all on public.pedidos, public.creditos, public.assinaturas, public.consultorias, public.webhooks_recebidos from anon, authenticated;
grant select on public.pedidos, public.creditos, public.assinaturas, public.consultorias to authenticated;
grant select on public.creditos_lotes to authenticated;
grant update (briefing) on public.consultorias to authenticated;

create policy "pedidos: dono e admin leem" on public.pedidos for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy "creditos: dono, agência e admin leem" on public.creditos for select to authenticated
  using (user_id = (select auth.uid()) or organizacao_id = (select public.minha_organizacao()) or (select public.is_admin()));
create policy "assinaturas: agência e admin leem" on public.assinaturas for select to authenticated
  using (organizacao_id = (select public.minha_organizacao()) or (select public.is_admin()));
create policy "consultorias: dono e admin leem" on public.consultorias for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy "consultorias: dono envia o briefing" on public.consultorias for update to authenticated
  using (user_id = (select auth.uid()) and status = 'aguardando_briefing')
  with check (user_id = (select auth.uid()));

-- Fase 4: briefing completo (várias regiões, orçamento, quem viaja, interesses, produto), roteiro
-- com referências à base, ajustes como novas versões, configurações de negócio e medição de custo.

-- ---------------------------------------------------------------------------
-- trip_requests: o briefing
-- ---------------------------------------------------------------------------

alter table public.trip_requests alter column subregion drop not null;

alter table public.trip_requests
  add column regions text[] not null default '{}' check (
    cardinality(regions) <= 4 and regions <@ array[
      'america-do-norte', 'america-central', 'america-do-sul', 'europa',
      'asia-leste', 'asia-sul', 'oriente-medio', 'sudeste-asiatico',
      'africa-do-norte', 'africa-subsaariana', 'oceania']::text[]),
  add column budget_level text check (budget_level in ('economico', 'medio', 'conforto', 'luxo')),
  add column adults smallint not null default 2 check (adults between 1 and 20),
  add column children smallint not null default 0 check (children between 0 and 20),
  add column interests text[] not null default '{}' check (cardinality(interests) <= 12),
  add column product text not null default 'roteiro' check (product in ('roteiro', 'assinado', 'completo', 'consultoria')),
  add column base_itinerary_id uuid references public.roteiros_base (id) on delete set null;

-- Pedidos antigos: a região única vira a lista
update public.trip_requests set regions = array[case
  when subregion in ('europa-do-norte', 'europa-do-sul', 'europa-central-leste') then 'europa' else subregion end]
where cardinality(regions) = 0 and subregion is not null;

grant insert (regions, budget_level, adults, children, interests) on public.trip_requests to authenticated;
-- product e base_itinerary_id: só o servidor define (depende de pagamento)

-- ---------------------------------------------------------------------------
-- generated_itineraries: citações da base e ajustes
-- ---------------------------------------------------------------------------

alter table public.generated_itineraries
  add column kb_refs jsonb not null default '[]' check (jsonb_typeof(kb_refs) = 'array'),
  add column adjustment_request text check (char_length(adjustment_request) <= 1000);

-- ---------------------------------------------------------------------------
-- Configurações de negócio (números editáveis sem deploy)
-- ---------------------------------------------------------------------------

create table public.configuracoes (
  chave      text primary key,
  valor      jsonb not null,
  descricao  text,
  updated_at timestamptz not null default now()
);
create trigger configuracoes_set_updated_at before update on public.configuracoes
  for each row execute function public.set_updated_at();

insert into public.configuracoes (chave, valor, descricao) values
  ('ajustes_inclusos', '3', 'Ajustes incluídos em cada consulta; a partir do seguinte, consome um novo crédito do mesmo tipo.'),
  ('validade_meses_b2c', '12', 'Validade das compras avulsas B2C, em meses.'),
  ('reembolso_dias', '7', 'Prazo para devolver créditos não usados (validar com advogado).'),
  ('uso_justo_premium', '{"alerta_mes": 150, "limite_hora": 20}', 'Premium: alerta interno acima de N consultas no mês e teto por hora contra automação.'),
  ('precos_produtos', '{"roteiro": 9.90, "assinado": 14.90, "completo": 49.90, "consultoria": 149.90, "basic": 199.90, "premium": 399.90}', 'Preços em R$.'),
  ('creditos_basic_mes', '30', 'Consultas completas por mês no plano Basic (renovam e não acumulam).'),
  ('cambio_usd_brl', '5.40', 'Câmbio usado para converter o custo das APIs (atualize quando mudar).'),
  ('precos_modelos', '{"padrao": {"entrada": 0.30, "saida": 2.50}, "gemini-3.8-flash": {"entrada": 0.30, "saida": 2.50}, "gemini-3.5-flash-lite": {"entrada": 0.10, "saida": 0.40}, "gemini-embedding-001": {"entrada": 0.15, "saida": 0}}', 'US$ por 1 milhão de tokens. Estimativas de tabela: confira no site do provedor. No plano grátis o custo real é zero, mas o registro mostra quanto custaria.')
on conflict (chave) do nothing;

-- ---------------------------------------------------------------------------
-- Medição: cada chamada paga (IA, embeddings, voos, hotéis) vira uma linha
-- ---------------------------------------------------------------------------

create table public.eventos_uso (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references auth.users (id) on delete set null,
  trip_request_id uuid references public.trip_requests (id) on delete set null,
  itinerary_id    uuid references public.generated_itineraries (id) on delete set null,
  tipo            text not null check (tipo in ('geracao', 'ajuste', 'adaptacao', 'extracao', 'embedding', 'busca_voo', 'busca_hotel')),
  produto         text,
  provedor        text,
  modelo          text,
  input_tokens    integer not null default 0,
  output_tokens   integer not null default 0,
  unidades        integer not null default 0,
  custo_usd       numeric(12, 6) not null default 0,
  custo_brl       numeric(12, 4) not null default 0,
  sucesso         boolean not null default true,
  meta            jsonb not null default '{}',
  created_at      timestamptz not null default now()
);
create index eventos_uso_criado_idx on public.eventos_uso (created_at desc);
create index eventos_uso_usuario_idx on public.eventos_uso (user_id, created_at desc);

do $$
declare t text;
begin
  foreach t in array array['configuracoes', 'eventos_uso'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('create policy "%s: só admin" on public.%I for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()))', t, t);
  end loop;
end $$;

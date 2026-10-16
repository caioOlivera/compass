-- Fases 2 e 3: cotações de passagens e hotéis (preço de referência com data da cotação),
-- estudo das 20 rotas e os extras do produto "completo" no roteiro.

-- Cache das cotações: a mesma consulta dentro da validade não chama a API de novo.
create table public.cotacoes (
  chave       text primary key,          -- tipo|provedor|parâmetros normalizados
  tipo        text not null check (tipo in ('voo', 'hotel')),
  provedor    text not null,
  consulta    jsonb not null,
  resultado   jsonb not null,            -- lista de ofertas já no formato do Compass
  cotado_em   timestamptz not null default now(),
  expira_em   timestamptz not null
);
create index cotacoes_expira_idx on public.cotacoes (expira_em);

-- Estudo de rotas: cada linha é uma consulta de teste (rota × provedor × variante)
create table public.estudo_rotas (
  id          uuid primary key default gen_random_uuid(),
  rodada      uuid not null,
  rota        integer not null,
  provedor    text not null,
  variante    text not null,
  origem      text not null,
  destino     text not null,
  ida         date not null,
  volta       date,
  encontrou   boolean not null,
  ofertas     integer not null default 0,
  preco_brl   numeric(10, 2),
  latencia_ms integer,
  erro        text,
  detalhe     jsonb,
  created_at  timestamptz not null default now()
);
create index estudo_rotas_rodada_idx on public.estudo_rotas (rodada, rota);

-- Produto completo: passagens e hotéis sugeridos ficam junto da versão do roteiro
alter table public.generated_itineraries add column extras jsonb;

insert into public.configuracoes (chave, valor, descricao) values
  ('precos_apis', '{"serpapi_busca": 0.025, "travelpayouts_busca": 0}', 'US$ por chamada das APIs de viagem (SerpApi cobra por busca bem-sucedida; o cache de 1 h deles não cobra).'),
  ('validade_cotacao_horas', '{"voo": 24, "hotel": 72}', 'Por quanto tempo uma cotação é reaproveitada antes de consultar de novo.')
on conflict (chave) do nothing;

alter table public.cotacoes enable row level security;
alter table public.estudo_rotas enable row level security;
revoke all on public.cotacoes, public.estudo_rotas from anon, authenticated;
grant select on public.cotacoes, public.estudo_rotas to authenticated;
create policy "cotacoes: só admin lê" on public.cotacoes for select to authenticated using ((select public.is_admin()));
create policy "estudo_rotas: só admin lê" on public.estudo_rotas for select to authenticated using ((select public.is_admin()));

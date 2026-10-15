-- Europa vira uma opção só no questionário. Os ids antigos continuam válidos para os pedidos
-- já gravados; novos pedidos usam 'europa'. Mesma lista de src/lib/constants.ts + os antigos.
alter table public.trip_requests drop constraint trip_requests_subregion_check;
alter table public.trip_requests add constraint trip_requests_subregion_check check (subregion in (
  'america-do-norte', 'america-central', 'america-do-sul',
  'europa',
  'asia-leste', 'asia-sul', 'oriente-medio', 'sudeste-asiatico',
  'africa-do-norte', 'africa-subsaariana', 'oceania',
  -- antigos (somente leitura)
  'europa-do-norte', 'europa-do-sul', 'europa-central-leste'));

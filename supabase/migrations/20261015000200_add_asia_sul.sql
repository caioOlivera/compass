-- Nova sub-região: Sul da Ásia (Índia, Sri Lanka, Nepal, Maldivas...).
-- Mesma lista de src/lib/constants.ts.
alter table public.trip_requests drop constraint trip_requests_subregion_check;
alter table public.trip_requests add constraint trip_requests_subregion_check check (subregion in (
  'america-do-norte', 'america-central', 'america-do-sul',
  'europa-do-norte', 'europa-do-sul', 'europa-central-leste',
  'asia-leste', 'asia-sul', 'oriente-medio', 'sudeste-asiatico',
  'africa-do-norte', 'africa-subsaariana', 'oceania'));

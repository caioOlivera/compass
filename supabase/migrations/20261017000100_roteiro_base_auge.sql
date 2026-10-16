-- Auge declarado do roteiro pronto (ex.: "Dolomitas"). Sem ele, a adaptação usa a cidade com mais dias.
alter table public.roteiros_base add column auge text check (auge is null or char_length(auge) <= 120);

-- Vitrine dos roteiros assinados: só o que o cliente vê antes de comprar (sem fonte, sem atividades).
create or replace function public.catalogo_roteiros_assinados()
returns table (
  id uuid, titulo text, duracao_dias integer, resumo text, epoca text,
  paises text[], essencia text[], cidades text[]
)
language sql
stable
security definer
set search_path = ''
as $$
  select r.id, r.titulo, r.duracao_dias, r.resumo, r.epoca, r.paises, r.essencia,
         array(
           select d.cidade from public.roteiro_base_dias d
           where d.roteiro_id = r.id
           group by d.cidade order by min(d.dia)
         ) as cidades
  from public.roteiros_base r
  where r.assinado and r.status = 'aprovado'
  order by r.created_at;
$$;
revoke execute on function public.catalogo_roteiros_assinados() from public;
grant execute on function public.catalogo_roteiros_assinados() to anon, authenticated, service_role;

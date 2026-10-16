-- Acha a conta pelo e-mail (só o servidor usa, ao conceder acesso gratuito).
create or replace function public.usuario_por_email(p_email text) returns uuid language sql stable security definer set search_path = '' as $$
  select id from auth.users where lower(email) = lower(trim(p_email)) limit 1
$$;
revoke execute on function public.usuario_por_email(text) from public, anon, authenticated;
grant execute on function public.usuario_por_email(text) to service_role;

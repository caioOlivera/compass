-- Funções de trigger não devem ser chamáveis via /rest/v1/rpc (advisor 0028/0029 do Supabase).
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.check_itinerary_owner() from public, anon, authenticated;
revoke execute on function public.set_updated_at() from public, anon, authenticated;

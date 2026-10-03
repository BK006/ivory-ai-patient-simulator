-- Trigger function is never called via RPC; is_supervisor stays callable by
-- authenticated because RLS policies evaluate it as the querying role.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.is_supervisor() from public, anon;

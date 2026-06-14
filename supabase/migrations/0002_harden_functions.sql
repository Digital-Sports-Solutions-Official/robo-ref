-- Hardening: pin search_path and limit SECURITY DEFINER function exposure.
-- Note: Supabase grants EXECUTE to anon/authenticated explicitly, so we revoke
-- from anon by name. Anonymous-auth users carry the `authenticated` role, so
-- create_session/join_session/is_session_member remain callable for them.

create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end; $$;

-- Trigger-only functions: not part of the REST API (triggers still fire).
revoke execute on function public.touch_updated_at() from public, anon, authenticated;
revoke execute on function public.add_owner_membership() from public, anon, authenticated;

-- API/helper functions: signed-in users only, never anon.
revoke execute on function public.is_session_member(uuid) from public, anon;
revoke execute on function public.create_session(text, text, integer) from public, anon;
revoke execute on function public.join_session(text) from public, anon;

grant execute on function public.is_session_member(uuid) to authenticated;
grant execute on function public.create_session(text, text, integer) to authenticated;
grant execute on function public.join_session(text) to authenticated;

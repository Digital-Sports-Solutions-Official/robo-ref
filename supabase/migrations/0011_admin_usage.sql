-- Admin-only usage snapshot for the /admin dashboard.
create or replace function public.admin_usage_stats()
returns json language plpgsql security definer set search_path = public, storage as $$
declare result json;
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;
  select json_build_object(
    'sessions',      (select count(*) from public.sessions),
    'incidents',     (select count(*) from public.incidents),
    'photos',        (select count(*) from public.team_photos),
    'members',       (select count(*) from public.session_members),
    'admins',        (select count(*) from public.admins),
    'db_bytes',      pg_database_size(current_database()),
    'storage_bytes', coalesce((select sum((metadata->>'size')::bigint) from storage.objects), 0),
    'photo_bytes',   coalesce((select sum(bytes) from public.team_photos), 0)
  ) into result;
  return result;
end; $$;
revoke execute on function public.admin_usage_stats() from public, anon;
grant execute on function public.admin_usage_stats() to authenticated;

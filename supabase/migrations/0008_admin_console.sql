create table if not exists public.admins (
  email text primary key,
  added_by text,
  created_at timestamptz not null default now()
);
alter table public.admins enable row level security;

create or replace function public.is_admin()
returns boolean language sql security definer set search_path = public stable as $$
  select exists (select 1 from public.admins a where a.email = lower(auth.jwt() ->> 'email'));
$$;
revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

drop policy if exists admins_select on public.admins;
create policy admins_select on public.admins for select to authenticated using (public.is_admin());
drop policy if exists admins_insert on public.admins;
create policy admins_insert on public.admins for insert to authenticated with check (public.is_admin());
drop policy if exists admins_delete on public.admins;
create policy admins_delete on public.admins for delete to authenticated using (public.is_admin());

insert into public.admins (email, added_by) values ('andrewef2000@gmail.com', 'seed') on conflict do nothing;

drop policy if exists sessions_admin_select on public.sessions;
create policy sessions_admin_select on public.sessions for select to authenticated using (public.is_admin());
drop policy if exists sessions_admin_delete on public.sessions;
create policy sessions_admin_delete on public.sessions for delete to authenticated using (public.is_admin());

drop policy if exists app_config_admin_write on public.app_config;
create policy app_config_admin_write on public.app_config for all to authenticated using (public.is_admin()) with check (public.is_admin());

create or replace function public.admin_list_sessions()
returns table (id uuid, code text, event_sku text, event_name text, owner_id uuid, created_at timestamptz, member_count bigint, incident_count bigint)
language sql security definer set search_path = public stable as $$
  select s.id, s.code, s.event_sku, s.event_name, s.owner_id, s.created_at,
    (select count(*) from public.session_members m where m.session_id = s.id) as member_count,
    (select count(*) from public.incidents i where i.session_id = s.id) as incident_count
  from public.sessions s
  where public.is_admin()
  order by s.created_at desc;
$$;
revoke execute on function public.admin_list_sessions() from public, anon;
grant execute on function public.admin_list_sessions() to authenticated;

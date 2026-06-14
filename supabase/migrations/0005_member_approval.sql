-- Request + host-approval membership.
alter table public.session_members
  add column if not exists status text not null default 'pending',
  add column if not exists member_name text;

update public.session_members set status = 'approved';
alter table public.session_members replica identity full;

create or replace function public.is_approved_member(p_session uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select exists (
    select 1 from public.session_members m
    where m.session_id = p_session and m.user_id = auth.uid() and m.status = 'approved'
  );
$$;
revoke execute on function public.is_approved_member(uuid) from public, anon;
grant execute on function public.is_approved_member(uuid) to authenticated;

create or replace function public.add_owner_membership()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.session_members (session_id, user_id, role, status)
  values (new.id, new.owner_id, 'owner', 'approved')
  on conflict do nothing;
  return new;
end; $$;

drop function if exists public.join_session(text);
create or replace function public.join_session(p_code text, p_name text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_session public.sessions;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  select * into v_session from public.sessions where code = upper(trim(p_code));
  if not found then raise exception 'No session found for code %', p_code; end if;
  insert into public.session_members (session_id, user_id, role, status, member_name)
  values (v_session.id, auth.uid(), 'referee', 'pending', p_name)
  on conflict (session_id, user_id)
    do update set member_name = coalesce(excluded.member_name, public.session_members.member_name);
  return v_session.id;
end; $$;
revoke execute on function public.join_session(text, text) from public, anon;
grant execute on function public.join_session(text, text) to authenticated;

drop policy if exists incidents_select on public.incidents;
create policy incidents_select on public.incidents for select to authenticated using (public.is_approved_member(session_id));
drop policy if exists incidents_insert on public.incidents;
create policy incidents_insert on public.incidents for insert to authenticated with check (public.is_approved_member(session_id) and author_id = auth.uid());

drop policy if exists members_select on public.session_members;
create policy members_select on public.session_members for select to authenticated using (
  user_id = auth.uid() or public.is_approved_member(session_id)
);

drop policy if exists members_update on public.session_members;
create policy members_update on public.session_members for update to authenticated using (
  exists (select 1 from public.sessions s where s.id = session_id and s.owner_id = auth.uid())
) with check (
  exists (select 1 from public.sessions s where s.id = session_id and s.owner_id = auth.uid())
);

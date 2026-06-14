-- robo-ref — initial schema
-- Local-first VEX referee app. Identity is anonymous (Supabase anonymous auth).
-- Online collaboration happens in "sessions" joined via a 6-digit code.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- profiles: display name per anonymous user (for attributing notes/violations)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  name        text not null default 'Referee',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- sessions: a shared referee room tied to a VEX event
-- ---------------------------------------------------------------------------
create table if not exists public.sessions (
  id          uuid primary key default gen_random_uuid(),
  code        text unique not null,
  event_sku   text not null,
  event_name  text,
  event_id    integer,
  owner_id    uuid not null references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now()
);
create index if not exists sessions_code_idx on public.sessions (code);

-- ---------------------------------------------------------------------------
-- session_members
-- ---------------------------------------------------------------------------
create table if not exists public.session_members (
  session_id  uuid not null references public.sessions(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  role        text not null default 'referee',
  joined_at   timestamptz not null default now(),
  primary key (session_id, user_id)
);

-- ---------------------------------------------------------------------------
-- incidents: violations / disqualifications / disablements against a team
-- ---------------------------------------------------------------------------
do $$ begin
  create type public.incident_outcome as enum ('general','minor','major','disabled','dq');
exception when duplicate_object then null; end $$;

create table if not exists public.incidents (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid not null references public.sessions(id) on delete cascade,
  division    text,
  match_name  text,
  match_id    integer,
  team        text not null,
  outcome     public.incident_outcome not null default 'general',
  rules       text[] not null default '{}',
  notes       text not null default '',
  author_id   uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists incidents_session_idx on public.incidents (session_id);

-- ---------------------------------------------------------------------------
-- notes: shared running notes (with authorship)
-- ---------------------------------------------------------------------------
create table if not exists public.notes (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid not null references public.sessions(id) on delete cascade,
  match_name  text,
  body        text not null default '',
  author_id   uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists notes_session_idx on public.notes (session_id);

-- ---------------------------------------------------------------------------
-- helper functions (SECURITY DEFINER avoids recursive RLS on session_members)
-- ---------------------------------------------------------------------------
create or replace function public.is_session_member(p_session uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select exists (
    select 1 from public.session_members m
    where m.session_id = p_session and m.user_id = auth.uid()
  );
$$;

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create or replace function public.add_owner_membership()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.session_members (session_id, user_id, role)
  values (new.id, new.owner_id, 'owner')
  on conflict do nothing;
  return new;
end; $$;

drop trigger if exists trg_sessions_owner on public.sessions;
create trigger trg_sessions_owner after insert on public.sessions
  for each row execute function public.add_owner_membership();

drop trigger if exists trg_profiles_touch on public.profiles;
create trigger trg_profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

drop trigger if exists trg_incidents_touch on public.incidents;
create trigger trg_incidents_touch before update on public.incidents
  for each row execute function public.touch_updated_at();

drop trigger if exists trg_notes_touch on public.notes;
create trigger trg_notes_touch before update on public.notes
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- RPCs
-- ---------------------------------------------------------------------------
create or replace function public.create_session(
  p_event_sku text,
  p_event_name text default null,
  p_event_id integer default null
) returns public.sessions
language plpgsql security definer set search_path = public as $$
declare
  v_code text;
  v_row  public.sessions;
  v_try  int := 0;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  loop
    v_try := v_try + 1;
    v_code := lpad((floor(random() * 1000000))::int::text, 6, '0');
    begin
      insert into public.sessions (code, event_sku, event_name, event_id, owner_id)
      values (v_code, p_event_sku, p_event_name, p_event_id, auth.uid())
      returning * into v_row;
      return v_row;
    exception when unique_violation then
      if v_try > 10 then raise; end if;
    end;
  end loop;
end; $$;

create or replace function public.join_session(p_code text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_session public.sessions;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  select * into v_session from public.sessions where code = p_code;
  if not found then raise exception 'No session found for code %', p_code; end if;
  insert into public.session_members (session_id, user_id, role)
  values (v_session.id, auth.uid(), 'referee')
  on conflict do nothing;
  return v_session.id;
end; $$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles        enable row level security;
alter table public.sessions        enable row level security;
alter table public.session_members enable row level security;
alter table public.incidents       enable row level security;
alter table public.notes           enable row level security;

-- profiles
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated using (true);
drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles for insert to authenticated with check (id = auth.uid());
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- sessions
drop policy if exists sessions_select_members on public.sessions;
create policy sessions_select_members on public.sessions for select to authenticated using (public.is_session_member(id));
drop policy if exists sessions_insert_owner on public.sessions;
create policy sessions_insert_owner on public.sessions for insert to authenticated with check (owner_id = auth.uid());
drop policy if exists sessions_update_owner on public.sessions;
create policy sessions_update_owner on public.sessions for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
drop policy if exists sessions_delete_owner on public.sessions;
create policy sessions_delete_owner on public.sessions for delete to authenticated using (owner_id = auth.uid());

-- session_members
drop policy if exists members_select on public.session_members;
create policy members_select on public.session_members for select to authenticated using (public.is_session_member(session_id));
drop policy if exists members_insert_self on public.session_members;
create policy members_insert_self on public.session_members for insert to authenticated with check (user_id = auth.uid());
drop policy if exists members_delete on public.session_members;
create policy members_delete on public.session_members for delete to authenticated using (
  user_id = auth.uid()
  or exists (select 1 from public.sessions s where s.id = session_id and s.owner_id = auth.uid())
);

-- incidents
drop policy if exists incidents_select on public.incidents;
create policy incidents_select on public.incidents for select to authenticated using (public.is_session_member(session_id));
drop policy if exists incidents_insert on public.incidents;
create policy incidents_insert on public.incidents for insert to authenticated with check (public.is_session_member(session_id) and author_id = auth.uid());
drop policy if exists incidents_update on public.incidents;
create policy incidents_update on public.incidents for update to authenticated using (author_id = auth.uid()) with check (author_id = auth.uid());
drop policy if exists incidents_delete on public.incidents;
create policy incidents_delete on public.incidents for delete to authenticated using (
  author_id = auth.uid()
  or exists (select 1 from public.sessions s where s.id = session_id and s.owner_id = auth.uid())
);

-- notes
drop policy if exists notes_select on public.notes;
create policy notes_select on public.notes for select to authenticated using (public.is_session_member(session_id));
drop policy if exists notes_insert on public.notes;
create policy notes_insert on public.notes for insert to authenticated with check (public.is_session_member(session_id) and author_id = auth.uid());
drop policy if exists notes_update on public.notes;
create policy notes_update on public.notes for update to authenticated using (author_id = auth.uid()) with check (author_id = auth.uid());
drop policy if exists notes_delete on public.notes;
create policy notes_delete on public.notes for delete to authenticated using (
  author_id = auth.uid()
  or exists (select 1 from public.sessions s where s.id = session_id and s.owner_id = auth.uid())
);

grant execute on function public.create_session(text, text, integer) to authenticated;
grant execute on function public.join_session(text) to authenticated;
grant execute on function public.is_session_member(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Realtime: stream incidents, notes, and membership changes to subscribers
-- ---------------------------------------------------------------------------
do $$ begin alter publication supabase_realtime add table public.incidents; exception when others then null; end $$;
do $$ begin alter publication supabase_realtime add table public.notes; exception when others then null; end $$;
do $$ begin alter publication supabase_realtime add table public.session_members; exception when others then null; end $$;

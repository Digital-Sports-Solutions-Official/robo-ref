-- Per-match autonomous + AWP winner(s). Single source of truth: last editor wins (upsert).
create table if not exists public.match_meta (
  session_id  uuid not null references public.sessions(id) on delete cascade,
  match_name  text not null,
  match_id    integer,
  auto_winner text,
  awp_winners text[] not null default '{}',
  author_id   uuid references auth.users(id) on delete set null,
  author_name text,
  updated_at  timestamptz not null default now(),
  primary key (session_id, match_name)
);
alter table public.match_meta replica identity full;
alter table public.match_meta enable row level security;

drop policy if exists match_meta_select on public.match_meta;
create policy match_meta_select on public.match_meta for select to authenticated using (public.is_approved_member(session_id));
drop policy if exists match_meta_insert on public.match_meta;
create policy match_meta_insert on public.match_meta for insert to authenticated with check (public.is_approved_member(session_id) and author_id = auth.uid());
drop policy if exists match_meta_update on public.match_meta;
create policy match_meta_update on public.match_meta for update to authenticated using (public.is_approved_member(session_id)) with check (public.is_approved_member(session_id) and author_id = auth.uid());

do $$ begin alter publication supabase_realtime add table public.match_meta; exception when others then null; end $$;

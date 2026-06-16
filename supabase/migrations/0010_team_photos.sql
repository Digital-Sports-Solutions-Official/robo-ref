-- Up to 4 inspection photos per team per session. Image bytes live in the private
-- 'team-photos' storage bucket; this table holds metadata + attribution.
create table if not exists public.team_photos (
  id           uuid primary key default gen_random_uuid(),
  session_id   uuid not null references public.sessions(id) on delete cascade,
  team         text not null,
  storage_path text not null unique,
  author_id    uuid references auth.users(id) on delete set null,
  author_name  text not null default '',
  width        integer,
  height       integer,
  bytes        integer,
  created_at   timestamptz not null default now()
);
create index if not exists team_photos_session_team_idx on public.team_photos (session_id, team);

alter table public.team_photos replica identity full;
alter table public.team_photos enable row level security;

create or replace function public.enforce_team_photo_cap()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.team_photos where session_id = new.session_id and team = new.team) >= 4 then
    raise exception 'Photo limit (4) reached for this team';
  end if;
  return new;
end; $$;
revoke execute on function public.enforce_team_photo_cap() from public, anon, authenticated;
drop trigger if exists trg_team_photo_cap on public.team_photos;
create trigger trg_team_photo_cap before insert on public.team_photos
  for each row execute function public.enforce_team_photo_cap();

drop policy if exists team_photos_select on public.team_photos;
create policy team_photos_select on public.team_photos for select to authenticated using (public.is_approved_member(session_id));
drop policy if exists team_photos_insert on public.team_photos;
create policy team_photos_insert on public.team_photos for insert to authenticated with check (public.is_approved_member(session_id) and author_id = auth.uid());
drop policy if exists team_photos_delete on public.team_photos;
create policy team_photos_delete on public.team_photos for delete to authenticated using (author_id = auth.uid());

do $$ begin alter publication supabase_realtime add table public.team_photos; exception when others then null; end $$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('team-photos', 'team-photos', false, 5242880, array['image/jpeg','image/webp','image/png'])
on conflict (id) do update set file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists team_photos_obj_select on storage.objects;
create policy team_photos_obj_select on storage.objects for select to authenticated
  using (bucket_id = 'team-photos' and public.is_approved_member(((storage.foldername(name))[1])::uuid));
drop policy if exists team_photos_obj_insert on storage.objects;
create policy team_photos_obj_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'team-photos' and public.is_approved_member(((storage.foldername(name))[1])::uuid));
drop policy if exists team_photos_obj_delete on storage.objects;
create policy team_photos_obj_delete on storage.objects for delete to authenticated
  using (bucket_id = 'team-photos' and owner = auth.uid());

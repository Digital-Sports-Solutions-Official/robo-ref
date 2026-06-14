-- Replace incidents.outcome with a type (dq/violation/note); fold notes into incidents.
do $$ begin
  create type public.incident_type as enum ('dq','violation','note');
exception when duplicate_object then null; end $$;

alter table public.incidents add column if not exists type public.incident_type not null default 'note';
alter table public.incidents add column if not exists author_name text;
alter table public.incidents drop column if exists outcome;
drop type if exists public.incident_outcome;

-- dq/violation must cite at least one rule; notes need none.
alter table public.incidents drop constraint if exists incidents_rules_required;
alter table public.incidents add constraint incidents_rules_required
  check (type = 'note' or cardinality(rules) > 0);

-- Full old row in realtime UPDATE/DELETE payloads so session_id filters work.
alter table public.incidents replica identity full;

-- Notes are now incidents of type 'note'.
do $$ begin alter publication supabase_realtime drop table public.notes; exception when others then null; end $$;
drop table if exists public.notes cascade;

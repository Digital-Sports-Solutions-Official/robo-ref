-- Ambiguity-free alphanumeric session codes (no I/1, O/0).
create or replace function public.gen_session_code()
returns text language plpgsql set search_path = public as $$
declare
  alphabet text := '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  result text := '';
  i int;
begin
  for i in 1..6 loop
    result := result || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
  end loop;
  return result;
end; $$;
revoke execute on function public.gen_session_code() from public, anon, authenticated;

create or replace function public.create_session(
  p_event_sku text, p_event_name text default null, p_event_id integer default null
) returns public.sessions
language plpgsql security definer set search_path = public as $$
declare v_code text; v_row public.sessions; v_try int := 0;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  loop
    v_try := v_try + 1;
    v_code := public.gen_session_code();
    begin
      insert into public.sessions (code, event_sku, event_name, event_id, owner_id)
      values (v_code, p_event_sku, p_event_name, p_event_id, auth.uid())
      returning * into v_row;
      return v_row;
    exception when unique_violation then
      if v_try > 12 then raise; end if;
    end;
  end loop;
end; $$;

create or replace function public.join_session(p_code text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_session public.sessions;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  select * into v_session from public.sessions where code = upper(trim(p_code));
  if not found then raise exception 'No session found for code %', p_code; end if;
  insert into public.session_members (session_id, user_id, role)
  values (v_session.id, auth.uid(), 'referee') on conflict do nothing;
  return v_session.id;
end; $$;

grant execute on function public.create_session(text, text, integer) to authenticated;
grant execute on function public.join_session(text) to authenticated;

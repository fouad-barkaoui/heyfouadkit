-- Invites can never grant ownership (matches supabase/schema.sql). Owners are
-- made through set_member_role, which already enforces who may do it.
create or replace function public.create_invite(
  p_team_id text,
  p_role public.team_role default 'editor',
  p_expires_hours integer default 168,
  p_max_uses integer default 0
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  token text;
  caller_role public.team_role;
begin
  select m.role into caller_role
  from public.team_members m
  where m.team_id = p_team_id and m.user_id = auth.uid();

  if caller_role is null or caller_role not in ('owner', 'admin') then
    raise exception 'Only an owner or admin can invite people.';
  end if;
  if p_role = 'owner' then
    raise exception 'Invites cannot grant ownership directly.';
  end if;
  if coalesce(p_max_uses, 0) < 0 or coalesce(p_max_uses, 0) > 1000 then
    raise exception 'Invalid use limit.';
  end if;
  if coalesce(p_expires_hours, 0) < 0 or coalesce(p_expires_hours, 0) > 8760 then
    raise exception 'Invalid expiry.';
  end if;

  token := 'inv_' || replace(gen_random_uuid()::text, '-', '');
  insert into public.team_invites (id, team_id, role, created_by, expires_at, max_uses)
  values (
    token, p_team_id, p_role, auth.uid(),
    case when coalesce(p_expires_hours, 0) > 0 then now() + (p_expires_hours || ' hours')::interval else null end,
    coalesce(p_max_uses, 0)
  );
  return token;
end $$;

-- Security hardening: least-privilege table grants, tighter RPC rules,
-- stronger admin check, unguessable invite tokens.
-- Row-level security stays the primary guard; this removes everything the
-- app does not need so a policy mistake can never expose more than intended.

-- 1. Table grants ---------------------------------------------------------
-- Signed-out visitors only ever send a contact message.
revoke all on all tables in schema public from anon;
grant insert on public.contact_messages to anon;

-- Signed-in users never need TRUNCATE (not covered by RLS), TRIGGER or REFERENCES.
revoke truncate, trigger, references on all tables in schema public from authenticated;

-- Team structure changes only through the SECURITY DEFINER team functions.
revoke insert, update, delete on public.teams, public.team_members, public.team_invites from authenticated;

-- A profile mirrors the auth account; the only field a user may edit is the username.
revoke insert, update, delete on public.profiles from authenticated;
grant update (username) on public.profiles to authenticated;

-- New tables must opt in to access instead of inheriting it.
alter default privileges for role postgres in schema public revoke all on tables from anon;
alter default privileges for role postgres in schema public revoke truncate, trigger, references on tables from authenticated;

-- 2. Helper functions in the private schema ------------------------------
revoke execute on all functions in schema private from public, anon, authenticated;
grant execute on function
  private.is_team_member(text),
  private.has_team_role(text, public.team_role[]),
  private.shares_team_with(uuid),
  private.is_app_admin()
to authenticated;

-- Trigger function: nobody needs to call it directly.
revoke execute on function public.touch_updated_at() from public, anon, authenticated;

-- 3. Admin check: bind to a confirmed account, not just an email claim -----
create or replace function private.is_app_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from auth.users u
    where u.id = (select auth.uid())
      and lower(u.email) = 'lmorfouad3@gmail.com'
      and u.email_confirmed_at is not null
  );
$$;
revoke execute on function private.is_app_admin() from public, anon;
grant execute on function private.is_app_admin() to authenticated;

-- 4. Team functions ---------------------------------------------------------
create or replace function public.create_team(team_name text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare new_id text;
begin
  if auth.uid() is null then raise exception 'Sign in first.'; end if;
  if (select count(*) from public.teams where created_by = auth.uid()) >= 50 then
    raise exception 'You have reached the limit of 50 teams.';
  end if;
  new_id := 'team_' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 20);
  insert into public.teams (id, name, created_by)
    values (new_id, coalesce(nullif(left(trim(team_name), 80), ''), 'New team'), auth.uid());
  insert into public.team_members (team_id, user_id, role) values (new_id, auth.uid(), 'owner');
  return new_id;
end $$;

create or replace function public.rename_team(p_team_id text, p_name text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.team_members m
    where m.team_id = p_team_id and m.user_id = auth.uid() and m.role in ('owner', 'admin')
  ) then raise exception 'Not allowed.'; end if;
  update public.teams set name = coalesce(nullif(left(trim(p_name), 80), ''), name) where id = p_team_id;
end $$;

-- Only an owner may hand out the owner role (mirrors set_member_role), and
-- the token now comes from a cryptographically secure generator.
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
    raise exception 'Not allowed to invite to this team.';
  end if;
  if p_role = 'owner' and caller_role <> 'owner' then
    raise exception 'Only an owner can invite another owner.';
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

-- Joining twice no longer burns an invite use, and a signed-in user is required.
create or replace function public.redeem_invite(p_token text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  inv record;
  uid uuid := auth.uid();
begin
  if uid is null then raise exception 'Sign in to join a team.'; end if;

  select * into inv from public.team_invites where id = p_token for update;
  if inv is null then raise exception 'That invite link is not valid.'; end if;
  if inv.expires_at is not null and inv.expires_at < now() then raise exception 'That invite link has expired.'; end if;
  if inv.max_uses > 0 and inv.use_count >= inv.max_uses then raise exception 'That invite link has already been used.'; end if;

  if exists (select 1 from public.team_members where team_id = inv.team_id and user_id = uid) then
    return inv.team_id;
  end if;

  insert into public.team_members (team_id, user_id, role) values (inv.team_id, uid, inv.role);
  update public.team_invites set use_count = use_count + 1 where id = p_token;
  return inv.team_id;
end $$;

-- Team management RPCs the app already calls (set_member_role, remove_member)
-- plus delete_team and revoke_invite. All security definer with an empty
-- search_path; every rule is enforced here, never trusted from the client.

create or replace function public.set_member_role(p_team_id text, p_user_id uuid, p_role public.team_role)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_role public.team_role;
  target_role public.team_role;
begin
  select role into caller_role from public.team_members where team_id = p_team_id and user_id = auth.uid();
  if caller_role is null or caller_role not in ('owner', 'admin') then
    raise exception 'Only owners and admins can change roles.';
  end if;
  if p_user_id = auth.uid() then
    raise exception 'You can''t change your own role.';
  end if;
  select role into target_role from public.team_members where team_id = p_team_id and user_id = p_user_id;
  if target_role is null then
    raise exception 'That person is not in this team.';
  end if;
  if caller_role = 'admin' and (target_role = 'owner' or p_role = 'owner') then
    raise exception 'Only an owner can manage owners.';
  end if;
  if target_role = 'owner' and p_role <> 'owner'
     and (select count(*) from public.team_members where team_id = p_team_id and role = 'owner') <= 1 then
    raise exception 'A team needs at least one owner.';
  end if;
  update public.team_members set role = p_role where team_id = p_team_id and user_id = p_user_id;
end $$;

create or replace function public.remove_member(p_team_id text, p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_role public.team_role;
  target_role public.team_role;
begin
  select role into caller_role from public.team_members where team_id = p_team_id and user_id = auth.uid();
  if caller_role is null then
    raise exception 'You are not in this team.';
  end if;
  select role into target_role from public.team_members where team_id = p_team_id and user_id = p_user_id;
  if target_role is null then
    return; -- already gone
  end if;
  if p_user_id <> auth.uid() then
    if caller_role not in ('owner', 'admin') then
      raise exception 'Only owners and admins can remove members.';
    end if;
    if caller_role = 'admin' and target_role in ('owner', 'admin') then
      raise exception 'Admins can only remove editors and viewers.';
    end if;
  end if;
  if target_role = 'owner'
     and (select count(*) from public.team_members where team_id = p_team_id and role = 'owner') <= 1 then
    raise exception 'The last owner can''t leave — make someone else owner, or delete the team.';
  end if;
  delete from public.team_members where team_id = p_team_id and user_id = p_user_id;
end $$;

create or replace function public.delete_team(p_team_id text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.team_members where team_id = p_team_id and user_id = auth.uid() and role = 'owner'
  ) then
    raise exception 'Only an owner can delete this team.';
  end if;
  if (select count(*) from public.team_members where user_id = auth.uid()) <= 1 then
    raise exception 'This is your only team — create another one before deleting it.';
  end if;
  -- Every workspace table references teams(id) on delete cascade.
  delete from public.teams where id = p_team_id;
end $$;

create or replace function public.revoke_invite(p_invite_id text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  t text;
begin
  select team_id into t from public.team_invites where id = p_invite_id;
  if t is null then
    return;
  end if;
  if not exists (
    select 1 from public.team_members where team_id = t and user_id = auth.uid() and role in ('owner', 'admin')
  ) then
    raise exception 'Only owners and admins can cancel invites.';
  end if;
  delete from public.team_invites where id = p_invite_id;
end $$;

revoke all on function public.set_member_role(text, uuid, public.team_role) from public, anon;
revoke all on function public.remove_member(text, uuid) from public, anon;
revoke all on function public.delete_team(text) from public, anon;
revoke all on function public.revoke_invite(text) from public, anon;
grant execute on function public.set_member_role(text, uuid, public.team_role) to authenticated;
grant execute on function public.remove_member(text, uuid) to authenticated;
grant execute on function public.delete_team(text) to authenticated;
grant execute on function public.revoke_invite(text) to authenticated;

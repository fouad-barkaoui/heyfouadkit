-- Every account gets a private "Personal" team the moment it is created.
--
-- Until now the only thing that ever made a Personal team was the one-time
-- backfill in schema.sql (Sep 12). Accounts created after that, by email or by
-- Google, ended up in no team at all. The app only syncs to the cloud while a
-- team is active, so those people were silently working in local-only mode
-- (nothing backed up, nothing on their other devices).
--
-- The trigger is written so it can never get in the way of a sign-up: if
-- anything in it fails the account is still created, and the backfill at the
-- bottom (safe to re-run) repairs the missing team.

create or replace function public.ensure_personal_team()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  personal_id text := 'personal_' || replace(new.id::text, '-', '');
begin
  insert into public.teams (id, name, created_by)
    values (personal_id, 'Personal', new.id)
    on conflict (id) do nothing;
  insert into public.team_members (team_id, user_id, role)
    values (personal_id, new.id, 'owner')
    on conflict (team_id, user_id) do nothing;
  return new;
exception when others then
  raise warning 'ensure_personal_team failed for %: %', new.id, sqlerrm;
  return new;
end $$;

revoke all on function public.ensure_personal_team() from public, anon, authenticated;

drop trigger if exists ensure_personal_team_ins on auth.users;
create trigger ensure_personal_team_ins
  after insert on auth.users
  for each row execute function public.ensure_personal_team();

-- One-time repair: accounts that belong to no team at all.
insert into public.teams (id, name, created_by)
select 'personal_' || replace(u.id::text, '-', ''), 'Personal', u.id
from auth.users u
where not exists (select 1 from public.team_members m where m.user_id = u.id)
on conflict (id) do nothing;

insert into public.team_members (team_id, user_id, role)
select 'personal_' || replace(u.id::text, '-', ''), u.id, 'owner'
from auth.users u
where not exists (select 1 from public.team_members m where m.user_id = u.id)
on conflict (team_id, user_id) do nothing;

-- ============================================================================
-- heyfouad — Supabase schema (already applied to the live project)
--
-- Team collaboration: every content row belongs to a team, not directly to a
-- user. Row-level security is enforced by team membership + role, not by
-- `user_id = auth.uid()` — a signed-in member of a team can read/write that
-- team's rows regardless of who originally created them. Team membership,
-- roles and invites are mutated only through the security-definer RPCs below;
-- direct table access to teams/team_members/team_invites is select-only.
--
-- Re-runnable: safe to execute again on a fresh project, and safe to re-run
-- on the existing project — every existing user is (idempotently) given a
-- "Personal" team as owner, and every row they already had is backfilled
-- with that team's id, so nothing is lost by adopting this schema later.
-- ============================================================================

-- ── Enums ───────────────────────────────────────────────────────────────────
do $$ begin
  create type item_type     as enum ('note', 'article', 'todo', 'doc', 'course');
  create type task_priority as enum ('low', 'medium', 'high', 'critical');
  create type task_status   as enum ('backlog', 'in_progress', 'completed', 'archived');
  create type badge_scope   as enum ('course', 'doc', 'general');
  create type recurrence    as enum ('none', 'daily', 'weekly', 'monthly');
  create type article_kind  as enum ('written', 'pdf', 'image');
  create type team_role     as enum ('owner', 'admin', 'editor', 'viewer');
  create type news_stage        as enum ('ideas', 'research', 'outline', 'draft', 'in_review', 'published');
  create type medicine_type     as enum ('scheduled', 'as_needed');
  create type duration_unit     as enum ('Days', 'Weeks', 'Months');
  create type treatment_status  as enum ('active', 'completed');
exception when duplicate_object then null; end $$;

-- ── Teams ───────────────────────────────────────────────────────────────────
create table if not exists public.teams (
  id          text primary key,
  name        text not null default 'New team',
  created_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now()
);

create table if not exists public.team_members (
  team_id    text not null references public.teams(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  role       public.team_role not null default 'viewer',
  joined_at  timestamptz not null default now(),
  primary key (team_id, user_id)
);

create table if not exists public.team_invites (
  id           text primary key,
  team_id      text not null references public.teams(id) on delete cascade,
  role         public.team_role not null default 'editor',
  created_by   uuid references auth.users(id) on delete set null,
  created_at   timestamptz not null default now(),
  expires_at   timestamptz,
  max_uses     int not null default 0,
  use_count    int not null default 0
);

-- One row per auth user — a public-safe mirror of the bits teammates need to
-- see (username, email), kept in sync by a trigger on auth.users.
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  username    text,
  email       text,
  updated_at  timestamptz not null default now()
);

create index if not exists team_members_user_idx on public.team_members (user_id);
create index if not exists team_invites_team_idx on public.team_invites (team_id);

-- ── Content tables ──────────────────────────────────────────────────────────
create table if not exists public.badges (
  id          text primary key,
  user_id     uuid not null references auth.users(id) on delete cascade default auth.uid(),
  team_id     text references public.teams(id) on delete cascade,
  name        varchar(60)  not null default '',
  color_hex   varchar(9)   not null default '#6366f1',
  icon_name   varchar(50)  not null default 'tag',
  category    badge_scope  not null default 'general',
  created_at  timestamptz  not null default now()
);

create table if not exists public.notes (
  id              text primary key,
  user_id         uuid not null references auth.users(id) on delete cascade default auth.uid(),
  team_id         text references public.teams(id) on delete cascade,
  title           text not null default '',
  content         text not null default '',
  tags            text[] not null default '{}',
  is_interesting  boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table if not exists public.todos (
  id              text primary key,
  user_id         uuid not null references auth.users(id) on delete cascade default auth.uid(),
  team_id         text references public.teams(id) on delete cascade,
  title           text not null default '',
  description     text not null default '',
  priority        task_priority not null default 'medium',
  status          task_status   not null default 'backlog',
  -- When the task's bar should start on the Calendar view — the client falls
  -- back to `created_at` when this is unset.
  start_date      timestamptz,
  due_date        timestamptz,
  recurrence      recurrence not null default 'none',
  is_interesting  boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table if not exists public.articles (
  id              text primary key,
  user_id         uuid not null references auth.users(id) on delete cascade default auth.uid(),
  team_id         text references public.teams(id) on delete cascade,
  title           text not null default '',
  kind            article_kind not null default 'written',
  content         text not null default '',
  tags            text[] not null default '{}',
  file_url        text,
  file_name       text,
  file_type       varchar(120),
  file_size       bigint,
  is_interesting  boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table if not exists public.courses (
  id              text primary key,
  user_id         uuid not null references auth.users(id) on delete cascade default auth.uid(),
  team_id         text references public.teams(id) on delete cascade,
  title           text not null default '',
  url             text not null default '',
  description     text not null default '',
  badge_id        text references public.badges(id) on delete set null,
  progress        int not null default 0 check (progress between 0 and 100),
  is_interesting  boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table if not exists public.docs (
  id              text primary key,
  user_id         uuid not null references auth.users(id) on delete cascade default auth.uid(),
  team_id         text references public.teams(id) on delete cascade,
  title           text not null default '',
  content         text not null default '',
  folder          text not null default 'General',
  badge_id        text references public.badges(id) on delete set null,
  is_interesting  boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Files pinned to any record, previewed inline while composing.
create table if not exists public.attachments (
  id            text primary key,
  user_id       uuid not null references auth.users(id) on delete cascade default auth.uid(),
  team_id       text references public.teams(id) on delete cascade,
  owner_type    item_type not null,
  owner_id      text not null,
  name          text not null default '',
  mime_type     varchar(160) not null default '',
  size          bigint not null default 0,
  storage_path  text,
  data_url      text,
  created_at    timestamptz not null default now()
);

-- Floating sticky notes that appear above every module, positioned by percentage
-- so they hold their place regardless of screen size.
create table if not exists public.sticky_notes (
  id          text primary key,
  user_id     uuid not null references auth.users(id) on delete cascade default auth.uid(),
  team_id     text references public.teams(id) on delete cascade,
  text        text not null default '',
  color       varchar(20) not null default 'amber',
  x           double precision not null default 50,
  y           double precision not null default 50,
  rotation    double precision not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- News: editorial kanban — a story moves left to right through `stage`.
create table if not exists public.news (
  id              text primary key,
  user_id         uuid not null references auth.users(id) on delete cascade default auth.uid(),
  team_id         text references public.teams(id) on delete cascade,
  title           text not null default '',
  content         text not null default '',
  stage           news_stage not null default 'ideas',
  tags            text[] not null default '{}',
  is_interesting  boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Medications Catalog & Tracker
create table if not exists public.treatment_plans (
  id          text primary key,
  user_id     uuid not null references auth.users(id) on delete cascade default auth.uid(),
  team_id     text references public.teams(id) on delete cascade,
  condition   text not null default '',
  prescriber  text not null default 'Self-managed',
  status      treatment_status not null default 'active',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.medicines (
  id                 text primary key,
  user_id            uuid not null references auth.users(id) on delete cascade default auth.uid(),
  team_id            text references public.teams(id) on delete cascade,
  name               text not null default '',
  dosage             text not null default '',
  unit               varchar(20) not null default 'mg',
  type               medicine_type not null default 'scheduled',
  -- Weekdays as small ints, 0 = Sunday … 6 = Saturday; empty for `as_needed`.
  days               int[] not null default '{}',
  times              text[] not null default '{}',
  start_date         timestamptz not null default now(),
  end_date           timestamptz,
  duration_value     int not null default 7,
  duration_unit      duration_unit not null default 'Days',
  treatment_plan_id  text references public.treatment_plans(id) on delete set null,
  completed          boolean not null default false,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- A previous version of this schema may not have `start_date` or `team_id` yet.
alter table public.todos add column if not exists start_date timestamptz;
do $$
declare t text;
begin
  foreach t in array array['badges','notes','todos','articles','courses','docs','attachments','sticky_notes','news','medicines','treatment_plans'] loop
    execute format('alter table public.%I add column if not exists team_id text references public.teams(id) on delete cascade', t);
  end loop;
end $$;

-- Trash: soft-delete bookkeeping for the collections the Trash module reads
-- from. Only needed for live/team cloud sync — a solo, local-only workspace
-- already gets this from localStorage without any schema change.
do $$
declare t text;
begin
  foreach t in array array['notes','todos','articles','courses','docs','news','medicines','treatment_plans'] loop
    execute format('alter table public.%I add column if not exists is_deleted boolean not null default false', t);
    execute format('alter table public.%I add column if not exists deleted_at timestamptz', t);
  end loop;
end $$;

-- ── Indexes ─────────────────────────────────────────────────────────────────
create index if not exists notes_team_updated_idx    on public.notes       (team_id, updated_at desc);
create index if not exists todos_team_status_idx      on public.todos       (team_id, status, due_date);
create index if not exists articles_team_updated_idx  on public.articles    (team_id, updated_at desc);
create index if not exists courses_team_updated_idx   on public.courses     (team_id, updated_at desc);
create index if not exists docs_team_folder_idx       on public.docs        (team_id, folder);
create index if not exists badges_team_scope_idx      on public.badges      (team_id, category);
create index if not exists attachments_team_owner_idx on public.attachments (team_id, owner_type, owner_id);
create index if not exists sticky_notes_team_idx      on public.sticky_notes (team_id, updated_at desc);
create index if not exists news_team_stage_idx        on public.news       (team_id, stage);
create index if not exists medicines_team_plan_idx    on public.medicines  (team_id, treatment_plan_id);
create index if not exists treatment_plans_team_idx   on public.treatment_plans (team_id, status);

-- ── Give every existing user a "Personal" team, and backfill their rows ─────
-- No-op on a brand-new project (no existing users yet); makes adopting this
-- schema on a project that predates teams non-destructive.
do $$
declare
  u record;
  personal_id text;
begin
  for u in select id from auth.users loop
    personal_id := 'personal_' || replace(u.id::text, '-', '');
    insert into public.teams (id, name, created_by)
      values (personal_id, 'Personal', u.id)
      on conflict (id) do nothing;
    insert into public.team_members (team_id, user_id, role)
      values (personal_id, u.id, 'owner')
      on conflict (team_id, user_id) do nothing;

    update public.badges      set team_id = personal_id where user_id = u.id and team_id is null;
    update public.notes       set team_id = personal_id where user_id = u.id and team_id is null;
    update public.todos       set team_id = personal_id where user_id = u.id and team_id is null;
    update public.articles    set team_id = personal_id where user_id = u.id and team_id is null;
    update public.courses     set team_id = personal_id where user_id = u.id and team_id is null;
    update public.docs        set team_id = personal_id where user_id = u.id and team_id is null;
    update public.attachments set team_id = personal_id where user_id = u.id and team_id is null;
    update public.sticky_notes set team_id = personal_id where user_id = u.id and team_id is null;
    update public.news             set team_id = personal_id where user_id = u.id and team_id is null;
    update public.medicines        set team_id = personal_id where user_id = u.id and team_id is null;
    update public.treatment_plans  set team_id = personal_id where user_id = u.id and team_id is null;
  end loop;
end $$;

-- ── profiles: kept in sync with auth.users ──────────────────────────────────
create or replace function public.sync_profile()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, username, email, updated_at)
  values (
    new.id,
    nullif(new.raw_user_meta_data ->> 'username', ''),
    new.email,
    now()
  )
  on conflict (id) do update
    set username = coalesce(excluded.username, public.profiles.username),
        email = excluded.email,
        updated_at = now();
  return new;
end $$;

drop trigger if exists sync_profile_ins on auth.users;
drop trigger if exists sync_profile_upd on auth.users;
create trigger sync_profile_ins after insert on auth.users for each row execute function public.sync_profile();
create trigger sync_profile_upd after update on auth.users for each row execute function public.sync_profile();

insert into public.profiles (id, username, email, updated_at)
select id, nullif(raw_user_meta_data ->> 'username', ''), email, now() from auth.users
on conflict (id) do nothing;

-- ── Team RPCs ────────────────────────────────────────────────────────────────
-- Every custom enum is schema-qualified as `public.<type>` everywhere, even
-- inside DECLARE blocks: with `set search_path = ''`, an unqualified type
-- name in a DECLARE fails to resolve at CREATE FUNCTION time even though the
-- identical type as a parameter resolves fine (parameter types are checked
-- against the caller's ambient search_path; DECLARE-block types are checked
-- against the function's own — empty — configured search_path).

create or replace function public.create_team(team_name text)
returns text language plpgsql security definer set search_path = '' as $$
declare
  new_id text;
begin
  if team_name is null or length(trim(team_name)) < 2 then
    raise exception 'Give the team a name of at least 2 characters.';
  end if;
  new_id := 'team_' || replace(gen_random_uuid()::text, '-', '');
  insert into public.teams (id, name, created_by) values (new_id, trim(team_name), auth.uid());
  insert into public.team_members (team_id, user_id, role) values (new_id, auth.uid(), 'owner');
  return new_id;
end $$;

create or replace function public.rename_team(p_team_id text, p_name text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  my_role public.team_role;
begin
  select role into my_role from public.team_members where team_id = p_team_id and user_id = auth.uid();
  if my_role is null or my_role not in ('owner', 'admin') then
    raise exception 'Only an owner or admin can rename this team.';
  end if;
  if p_name is null or length(trim(p_name)) < 2 then
    raise exception 'Give the team a name of at least 2 characters.';
  end if;
  update public.teams set name = trim(p_name) where id = p_team_id;
end $$;

create or replace function public.create_invite(
  p_team_id text,
  p_role public.team_role default 'editor',
  p_expires_hours int default 168,
  p_max_uses int default 0
)
returns text language plpgsql security definer set search_path = '' as $$
declare
  my_role public.team_role;
  new_id text;
begin
  select role into my_role from public.team_members where team_id = p_team_id and user_id = auth.uid();
  if my_role is null or my_role not in ('owner', 'admin') then
    raise exception 'Only an owner or admin can invite people.';
  end if;
  if p_role = 'owner' then
    raise exception 'Invites cannot grant ownership directly.';
  end if;
  new_id := 'inv_' || replace(gen_random_uuid()::text, '-', '');
  insert into public.team_invites (id, team_id, role, created_by, expires_at, max_uses)
  values (
    new_id,
    p_team_id,
    p_role,
    auth.uid(),
    case when p_expires_hours > 0 then now() + (p_expires_hours || ' hours')::interval else null end,
    greatest(p_max_uses, 0)
  );
  return new_id;
end $$;

create or replace function public.redeem_invite(p_token text)
returns text language plpgsql security definer set search_path = '' as $$
declare
  inv record;
begin
  select * into inv from public.team_invites where id = p_token for update;
  if inv is null then
    raise exception 'That invite link is no longer valid.';
  end if;
  if inv.expires_at is not null and inv.expires_at < now() then
    raise exception 'That invite link has expired.';
  end if;
  if inv.max_uses > 0 and inv.use_count >= inv.max_uses then
    raise exception 'That invite link has already been used.';
  end if;

  insert into public.team_members (team_id, user_id, role)
  values (inv.team_id, auth.uid(), inv.role)
  on conflict (team_id, user_id) do nothing;

  update public.team_invites set use_count = use_count + 1 where id = p_token;
  return inv.team_id;
end $$;

create or replace function public.set_member_role(p_team_id text, p_user_id uuid, p_role public.team_role)
returns void language plpgsql security definer set search_path = '' as $$
declare
  my_role public.team_role;
  owners_left int;
begin
  select role into my_role from public.team_members where team_id = p_team_id and user_id = auth.uid();
  if my_role is null or my_role not in ('owner', 'admin') then
    raise exception 'Only an owner or admin can change roles.';
  end if;

  if p_role <> 'owner' then
    select count(*) into owners_left from public.team_members
      where team_id = p_team_id and role = 'owner' and user_id <> p_user_id;
    if owners_left = 0 then
      raise exception 'A team needs at least one owner.';
    end if;
  end if;

  update public.team_members set role = p_role where team_id = p_team_id and user_id = p_user_id;
end $$;

create or replace function public.remove_member(p_team_id text, p_user_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  my_role public.team_role;
  target_role public.team_role;
  owners_left int;
begin
  select role into my_role from public.team_members where team_id = p_team_id and user_id = auth.uid();
  select role into target_role from public.team_members where team_id = p_team_id and user_id = p_user_id;

  if target_role is null then
    return;
  end if;

  -- Anyone can remove themselves (leave); otherwise this needs owner/admin.
  if p_user_id <> auth.uid() and (my_role is null or my_role not in ('owner', 'admin')) then
    raise exception 'Only an owner or admin can remove a member.';
  end if;

  if target_role = 'owner' then
    select count(*) into owners_left from public.team_members
      where team_id = p_team_id and role = 'owner' and user_id <> p_user_id;
    if owners_left = 0 then
      raise exception 'A team needs at least one owner.';
    end if;
  end if;

  delete from public.team_members where team_id = p_team_id and user_id = p_user_id;
end $$;

-- Client-facing RPCs: signed-in users only, never anonymous. Each function
-- above already performs its own membership/role checks internally.
revoke execute on function public.create_team(text) from public, anon;
revoke execute on function public.rename_team(text, text) from public, anon;
revoke execute on function public.create_invite(text, public.team_role, int, int) from public, anon;
revoke execute on function public.redeem_invite(text) from public, anon;
revoke execute on function public.set_member_role(text, uuid, public.team_role) from public, anon;
revoke execute on function public.remove_member(text, uuid) from public, anon;
revoke execute on function public.sync_profile() from public, anon, authenticated;

grant execute on function public.create_team(text) to authenticated;
grant execute on function public.rename_team(text, text) to authenticated;
grant execute on function public.create_invite(text, public.team_role, int, int) to authenticated;
grant execute on function public.redeem_invite(text) to authenticated;
grant execute on function public.set_member_role(text, uuid, public.team_role) to authenticated;
grant execute on function public.remove_member(text, uuid) to authenticated;

-- ── Row level security — teams, membership, invites, profiles ──────────────
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.team_invites enable row level security;
alter table public.profiles enable row level security;

drop policy if exists "member teams select" on public.teams;
create policy "member teams select" on public.teams for select to authenticated
  using (exists (select 1 from public.team_members m where m.team_id = teams.id and m.user_id = (select auth.uid())));

drop policy if exists "members select own team" on public.team_members;
create policy "members select own team" on public.team_members for select to authenticated
  using (exists (
    select 1 from public.team_members m2 where m2.team_id = team_members.team_id and m2.user_id = (select auth.uid())
  ));

drop policy if exists "admins select own team invites" on public.team_invites;
create policy "admins select own team invites" on public.team_invites for select to authenticated
  using (exists (
    select 1 from public.team_members m where m.team_id = team_invites.team_id and m.user_id = (select auth.uid())
      and m.role in ('owner', 'admin')
  ));

drop policy if exists "teammates select profiles" on public.profiles;
create policy "teammates select profiles" on public.profiles for select to authenticated
  using (
    profiles.id = (select auth.uid())
    or exists (
      select 1 from public.team_members mine
      join public.team_members theirs on theirs.team_id = mine.team_id
      where mine.user_id = (select auth.uid()) and theirs.user_id = profiles.id
    )
  );

drop policy if exists "self update profile" on public.profiles;
create policy "self update profile" on public.profiles for update to authenticated
  using (profiles.id = (select auth.uid())) with check (profiles.id = (select auth.uid()));

-- teams / team_members / team_invites are mutated only through the RPCs
-- above (each `security definer`) — no insert/update/delete policy is
-- granted directly, by design.

-- ── Row level security — content tables, by team role ───────────────────────
do $$
declare t text;
begin
  foreach t in array array['badges','notes','todos','articles','courses','docs','attachments','sticky_notes','news','medicines','treatment_plans'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "own rows select" on public.%I', t);
    execute format('drop policy if exists "own rows insert" on public.%I', t);
    execute format('drop policy if exists "own rows update" on public.%I', t);
    execute format('drop policy if exists "own rows delete" on public.%I', t);
    execute format('drop policy if exists "team viewers select" on public.%I', t);
    execute format('drop policy if exists "team editors insert" on public.%I', t);
    execute format('drop policy if exists "team editors update" on public.%I', t);
    execute format('drop policy if exists "team editors delete" on public.%I', t);

    execute format($f$create policy "team viewers select" on public.%I for select to authenticated using (
      exists (select 1 from public.team_members m where m.team_id = %I.team_id and m.user_id = (select auth.uid()))
    )$f$, t, t);

    execute format($f$create policy "team editors insert" on public.%I for insert to authenticated with check (
      exists (select 1 from public.team_members m where m.team_id = %I.team_id and m.user_id = (select auth.uid())
        and m.role in ('owner','admin','editor'))
    )$f$, t, t);

    execute format($f$create policy "team editors update" on public.%I for update to authenticated using (
      exists (select 1 from public.team_members m where m.team_id = %I.team_id and m.user_id = (select auth.uid())
        and m.role in ('owner','admin','editor'))
    ) with check (
      exists (select 1 from public.team_members m where m.team_id = %I.team_id and m.user_id = (select auth.uid())
        and m.role in ('owner','admin','editor'))
    )$f$, t, t, t);

    execute format($f$create policy "team editors delete" on public.%I for delete to authenticated using (
      exists (select 1 from public.team_members m where m.team_id = %I.team_id and m.user_id = (select auth.uid())
        and m.role in ('owner','admin','editor'))
    )$f$, t, t);
  end loop;
end $$;

-- ── updated_at triggers ─────────────────────────────────────────────────────
create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array['notes','todos','articles','courses','docs','sticky_notes','news','medicines','treatment_plans'] loop
    execute format('drop trigger if exists touch_%I on public.%I', t, t);
    execute format('create trigger touch_%I before update on public.%I for each row execute function public.touch_updated_at()', t, t);
  end loop;
end $$;

-- ── Realtime ────────────────────────────────────────────────────────────────
-- Every member watching the same team sees each other's changes live.
do $$
declare t text;
begin
  foreach t in array array['badges','notes','todos','articles','courses','docs','attachments','sticky_notes','news','medicines','treatment_plans','teams','team_members','team_invites'] loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when others then null;
    end;
  end loop;
end $$;

-- ── Storage ─────────────────────────────────────────────────────────────────
-- Private bucket. Objects live under the owning TEAM's id prefix (not the
-- uploader's uuid) and are read through short-lived signed URLs, so nothing
-- is world-readable and every teammate can see every file.
insert into storage.buckets (id, name, public, file_size_limit)
values ('nexus-media', 'nexus-media', false, 52428800)
on conflict (id) do update set public = false, file_size_limit = 52428800;

drop policy if exists "nexus media select" on storage.objects;
drop policy if exists "nexus media insert" on storage.objects;
drop policy if exists "nexus media update" on storage.objects;
drop policy if exists "nexus media delete" on storage.objects;

create policy "nexus media select" on storage.objects for select to authenticated
  using (bucket_id = 'nexus-media' and exists (
    select 1 from public.team_members m
    where m.team_id = (storage.foldername(name))[1] and m.user_id = (select auth.uid())
  ));

create policy "nexus media insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'nexus-media' and exists (
    select 1 from public.team_members m
    where m.team_id = (storage.foldername(name))[1] and m.user_id = (select auth.uid())
      and m.role in ('owner','admin','editor')
  ));

create policy "nexus media update" on storage.objects for update to authenticated
  using (bucket_id = 'nexus-media' and exists (
    select 1 from public.team_members m
    where m.team_id = (storage.foldername(name))[1] and m.user_id = (select auth.uid())
      and m.role in ('owner','admin','editor')
  ))
  with check (bucket_id = 'nexus-media' and exists (
    select 1 from public.team_members m
    where m.team_id = (storage.foldername(name))[1] and m.user_id = (select auth.uid())
      and m.role in ('owner','admin','editor')
  ));

create policy "nexus media delete" on storage.objects for delete to authenticated
  using (bucket_id = 'nexus-media' and exists (
    select 1 from public.team_members m
    where m.team_id = (storage.foldername(name))[1] and m.user_id = (select auth.uid())
      and m.role in ('owner','admin','editor')
  ));

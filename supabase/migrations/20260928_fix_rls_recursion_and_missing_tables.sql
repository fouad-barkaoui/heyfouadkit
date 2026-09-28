-- ════════════════════════════════════════════════════════════════════════════
-- 2026-09-28 — Fix cloud sync & uploads
--
-- 1. The team_members SELECT policy queried team_members itself, so Postgres
--    raised 42P17 "infinite recursion detected in policy" on EVERY read that
--    touched team membership — i.e. every table, and the nexus-media storage
--    bucket (Storage reports 42P17 as "The database schema is invalid or
--    incompatible"). Membership checks now go through SECURITY DEFINER
--    helpers in a non-exposed `private` schema, which read team_members
--    without re-entering its RLS.
-- 2. news / treatment_plans / medicines (and their enums) were never created
--    on the live project, and the Trash columns were missing — the app loads
--    every collection together, so one missing table failed the whole sync.
-- Idempotent: safe to run more than once.
-- ════════════════════════════════════════════════════════════════════════════

-- ── 1. Membership helpers ────────────────────────────────────────────────────
create schema if not exists private;
grant usage on schema private to authenticated;

create or replace function private.is_team_member(p_team_id text)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.team_members m
    where m.team_id = p_team_id and m.user_id = (select auth.uid())
  );
$$;

create or replace function private.has_team_role(p_team_id text, p_roles public.team_role[])
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.team_members m
    where m.team_id = p_team_id and m.user_id = (select auth.uid()) and m.role = any (p_roles)
  );
$$;

create or replace function private.shares_team_with(p_user_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.team_members a
    join public.team_members b on a.team_id = b.team_id
    where a.user_id = (select auth.uid()) and b.user_id = p_user_id
  );
$$;

revoke all on function private.is_team_member(text) from public;
revoke all on function private.has_team_role(text, public.team_role[]) from public;
revoke all on function private.shares_team_with(uuid) from public;
grant execute on function private.is_team_member(text) to authenticated;
grant execute on function private.has_team_role(text, public.team_role[]) to authenticated;
grant execute on function private.shares_team_with(uuid) to authenticated;

-- ── 2. Missing enums, tables and columns ─────────────────────────────────────
do $$ begin
  create type public.news_stage as enum ('ideas', 'research', 'outline', 'draft', 'in_review', 'published');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.medicine_type as enum ('scheduled', 'as_needed');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.duration_unit as enum ('Days', 'Weeks', 'Months');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.treatment_status as enum ('active', 'completed');
exception when duplicate_object then null; end $$;

alter type public.item_type add value if not exists 'news';
alter type public.item_type add value if not exists 'medicine';

create table if not exists public.news (
  id              text primary key,
  user_id         uuid not null references auth.users(id) on delete cascade default auth.uid(),
  team_id         text references public.teams(id) on delete cascade,
  title           text not null default '',
  content         text not null default '',
  stage           public.news_stage not null default 'ideas',
  tags            text[] not null default '{}',
  is_interesting  boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table if not exists public.treatment_plans (
  id          text primary key,
  user_id     uuid not null references auth.users(id) on delete cascade default auth.uid(),
  team_id     text references public.teams(id) on delete cascade,
  condition   text not null default '',
  prescriber  text not null default 'Self-managed',
  status      public.treatment_status not null default 'active',
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
  type               public.medicine_type not null default 'scheduled',
  days               int[] not null default '{}',
  times              text[] not null default '{}',
  start_date         timestamptz not null default now(),
  end_date           timestamptz,
  duration_value     int not null default 7,
  duration_unit      public.duration_unit not null default 'Days',
  treatment_plan_id  text references public.treatment_plans(id) on delete set null,
  completed          boolean not null default false,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

do $$
declare t text;
begin
  foreach t in array array['notes','todos','articles','courses','docs','news','medicines','treatment_plans'] loop
    execute format('alter table public.%I add column if not exists is_deleted boolean not null default false', t);
    execute format('alter table public.%I add column if not exists deleted_at timestamptz', t);
  end loop;
end $$;

create index if not exists news_team_stage_idx      on public.news (team_id, stage);
create index if not exists medicines_team_plan_idx  on public.medicines (team_id, treatment_plan_id);
create index if not exists medicines_plan_fk_idx    on public.medicines (treatment_plan_id);
create index if not exists treatment_plans_team_idx on public.treatment_plans (team_id, status);
create index if not exists team_members_user_idx    on public.team_members (user_id, team_id);

do $$
declare t text;
begin
  foreach t in array array['news','medicines','treatment_plans'] loop
    execute format('drop trigger if exists touch_%1$s on public.%1$I', t);
    execute format('create trigger touch_%1$s before update on public.%1$I for each row execute function public.touch_updated_at()', t);
  end loop;
end $$;

grant select, insert, update, delete on public.news, public.treatment_plans, public.medicines to authenticated;

-- ── 3. Rewrite every team-scoped policy on the helpers ───────────────────────
do $$
declare t text;
begin
  foreach t in array array['badges','notes','todos','articles','courses','docs','attachments','sticky_notes','news','treatment_plans','medicines'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "team viewers select" on public.%I', t);
    execute format('drop policy if exists "team editors insert" on public.%I', t);
    execute format('drop policy if exists "team editors update" on public.%I', t);
    execute format('drop policy if exists "team editors delete" on public.%I', t);
    execute format($p$create policy "team viewers select" on public.%I for select to authenticated
      using (private.is_team_member(team_id))$p$, t);
    execute format($p$create policy "team editors insert" on public.%I for insert to authenticated
      with check (private.has_team_role(team_id, array['owner','admin','editor']::public.team_role[]))$p$, t);
    execute format($p$create policy "team editors update" on public.%I for update to authenticated
      using (private.has_team_role(team_id, array['owner','admin','editor']::public.team_role[]))
      with check (private.has_team_role(team_id, array['owner','admin','editor']::public.team_role[]))$p$, t);
    execute format($p$create policy "team editors delete" on public.%I for delete to authenticated
      using (private.has_team_role(team_id, array['owner','admin','editor']::public.team_role[]))$p$, t);
  end loop;
end $$;

-- team_members: see your own row, plus everyone in a team you belong to.
drop policy if exists "members select own team" on public.team_members;
create policy "members select own team" on public.team_members for select to authenticated
  using (user_id = (select auth.uid()) or private.is_team_member(team_id));

drop policy if exists "member teams select" on public.teams;
create policy "member teams select" on public.teams for select to authenticated
  using (private.is_team_member(id));

drop policy if exists "admins select own team invites" on public.team_invites;
create policy "admins select own team invites" on public.team_invites for select to authenticated
  using (private.has_team_role(team_id, array['owner','admin']::public.team_role[]));

drop policy if exists "teammates select profiles" on public.profiles;
create policy "teammates select profiles" on public.profiles for select to authenticated
  using (id = (select auth.uid()) or private.shares_team_with(id));

-- Storage: team media bucket
drop policy if exists "nexus media select" on storage.objects;
drop policy if exists "nexus media insert" on storage.objects;
drop policy if exists "nexus media update" on storage.objects;
drop policy if exists "nexus media delete" on storage.objects;
create policy "nexus media select" on storage.objects for select to authenticated
  using (bucket_id = 'nexus-media' and private.is_team_member((storage.foldername(name))[1]));
create policy "nexus media insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'nexus-media'
    and private.has_team_role((storage.foldername(name))[1], array['owner','admin','editor']::public.team_role[]));
create policy "nexus media update" on storage.objects for update to authenticated
  using (bucket_id = 'nexus-media'
    and private.has_team_role((storage.foldername(name))[1], array['owner','admin','editor']::public.team_role[]))
  with check (bucket_id = 'nexus-media'
    and private.has_team_role((storage.foldername(name))[1], array['owner','admin','editor']::public.team_role[]));
create policy "nexus media delete" on storage.objects for delete to authenticated
  using (bucket_id = 'nexus-media'
    and private.has_team_role((storage.foldername(name))[1], array['owner','admin','editor']::public.team_role[]));

-- ── 4. Realtime for the new tables ───────────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array['news','treatment_plans','medicines'] loop
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

-- ── 5. Close anonymous uploads to the unused public "nexus-build" bucket ─────
drop policy if exists "nexus build upload" on storage.objects;
drop policy if exists "nexus build replace" on storage.objects;

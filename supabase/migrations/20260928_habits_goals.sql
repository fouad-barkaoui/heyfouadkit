-- ════════════════════════════════════════════════════════════════════════════
-- 2026-09-28 — Habits & Goals. Team-scoped with the same RLS helpers.
-- ════════════════════════════════════════════════════════════════════════════
create table if not exists public.habits (
  id          text primary key,
  user_id     uuid not null references auth.users(id) on delete cascade default auth.uid(),
  team_id     text references public.teams(id) on delete cascade,
  name        text not null default '' check (length(name) <= 120),
  emoji       text not null default '✨' check (length(emoji) <= 16),
  color       text not null default '#2dd4a0' check (color ~* '^#[0-9a-f]{3,8}$'),
  days        int[] not null default '{}',
  log         text[] not null default '{}',
  archived    boolean not null default false,
  is_deleted  boolean not null default false,
  deleted_at  timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.goals (
  id          text primary key,
  user_id     uuid not null references auth.users(id) on delete cascade default auth.uid(),
  team_id     text references public.teams(id) on delete cascade,
  title       text not null default '' check (length(title) <= 200),
  why         text not null default '' check (length(why) <= 4000),
  emoji       text not null default '🎯' check (length(emoji) <= 16),
  color       text not null default '#7c83ff' check (color ~* '^#[0-9a-f]{3,8}$'),
  due_date    timestamptz,
  steps       jsonb not null default '[]'::jsonb check (jsonb_typeof(steps) = 'array'),
  status      text not null default 'active' check (status in ('active','achieved','paused')),
  is_deleted  boolean not null default false,
  deleted_at  timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists habits_team_idx on public.habits (team_id, created_at);
create index if not exists goals_team_idx  on public.goals (team_id, status);
create index if not exists habits_user_idx on public.habits (user_id);
create index if not exists goals_user_idx  on public.goals (user_id);

do $$
declare t text;
begin
  foreach t in array array['habits','goals'] loop
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
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('drop trigger if exists touch_%1$s on public.%1$I', t);
    execute format('create trigger touch_%1$s before update on public.%1$I for each row execute function public.touch_updated_at()', t);
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

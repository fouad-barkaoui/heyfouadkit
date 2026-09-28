-- ════════════════════════════════════════════════════════════════════════════
-- 2026-09-28 — SaveIt: saved links (videos, articles, repos, sites…)
-- Team-scoped like every other collection; policies go through the
-- private.is_team_member / has_team_role helpers (no RLS recursion).
-- ════════════════════════════════════════════════════════════════════════════
create table if not exists public.saved_links (
  id               text primary key,
  user_id          uuid not null references auth.users(id) on delete cascade default auth.uid(),
  team_id          text references public.teams(id) on delete cascade,
  url              text not null check (url ~* '^https?://' and length(url) <= 4096),
  title            text not null default '' check (length(title) <= 1000),
  description      text not null default '' check (length(description) <= 4000),
  kind             text not null default 'website'
                     check (kind in ('video','article','repo','social','audio','pdf','image','website')),
  site_name        text not null default '',
  domain           text not null default '',
  image            text check (image is null or length(image) <= 4096),
  favicon          text check (favicon is null or length(favicon) <= 4096),
  embed_url        text check (embed_url is null or embed_url ~* '^https://'),
  tags             text[] not null default '{}',
  collection       text not null default 'Inbox' check (length(collection) <= 80),
  note             text not null default '' check (length(note) <= 10000),
  status           text not null default 'unread' check (status in ('unread','read')),
  reading_minutes  int check (reading_minutes is null or reading_minutes between 0 and 10000),
  accent           text check (accent is null or accent ~* '^#[0-9a-f]{3,8}$'),
  is_interesting   boolean not null default false,
  opened_at        timestamptz,
  is_deleted       boolean not null default false,
  deleted_at       timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists saved_links_team_created_idx on public.saved_links (team_id, created_at desc);
create index if not exists saved_links_team_kind_idx    on public.saved_links (team_id, kind);
create index if not exists saved_links_user_idx         on public.saved_links (user_id);

alter table public.saved_links enable row level security;

drop policy if exists "team viewers select" on public.saved_links;
drop policy if exists "team editors insert" on public.saved_links;
drop policy if exists "team editors update" on public.saved_links;
drop policy if exists "team editors delete" on public.saved_links;
create policy "team viewers select" on public.saved_links for select to authenticated
  using (private.is_team_member(team_id));
create policy "team editors insert" on public.saved_links for insert to authenticated
  with check (private.has_team_role(team_id, array['owner','admin','editor']::public.team_role[]));
create policy "team editors update" on public.saved_links for update to authenticated
  using (private.has_team_role(team_id, array['owner','admin','editor']::public.team_role[]))
  with check (private.has_team_role(team_id, array['owner','admin','editor']::public.team_role[]));
create policy "team editors delete" on public.saved_links for delete to authenticated
  using (private.has_team_role(team_id, array['owner','admin','editor']::public.team_role[]));

grant select, insert, update, delete on public.saved_links to authenticated;
revoke all on public.saved_links from anon;

drop trigger if exists touch_saved_links on public.saved_links;
create trigger touch_saved_links before update on public.saved_links
  for each row execute function public.touch_updated_at();

do $$
begin
  if not exists (select 1 from pg_publication_tables
                 where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'saved_links') then
    alter publication supabase_realtime add table public.saved_links;
  end if;
end $$;

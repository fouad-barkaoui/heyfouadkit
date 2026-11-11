-- Index the foreign keys the row-level security checks and joins rely on,
-- and evaluate auth.uid() once per statement in the profile update policy.

create index if not exists articles_team_id_idx on public.articles (team_id);
create index if not exists attachments_team_id_idx on public.attachments (team_id);
create index if not exists badges_team_id_idx on public.badges (team_id);
create index if not exists courses_team_id_idx on public.courses (team_id);
create index if not exists courses_badge_id_idx on public.courses (badge_id);
create index if not exists docs_team_id_idx on public.docs (team_id);
create index if not exists docs_badge_id_idx on public.docs (badge_id);
create index if not exists notes_team_id_idx on public.notes (team_id);
create index if not exists sticky_notes_team_id_idx on public.sticky_notes (team_id);
create index if not exists todos_team_id_idx on public.todos (team_id);
create index if not exists medicines_user_id_idx on public.medicines (user_id);
create index if not exists news_user_id_idx on public.news (user_id);
create index if not exists treatment_plans_user_id_idx on public.treatment_plans (user_id);
create index if not exists contact_messages_user_id_idx on public.contact_messages (user_id);
create index if not exists team_invites_created_by_idx on public.team_invites (created_by);
create index if not exists teams_created_by_idx on public.teams (created_by);

drop policy if exists "self update profile" on public.profiles;
create policy "self update profile" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

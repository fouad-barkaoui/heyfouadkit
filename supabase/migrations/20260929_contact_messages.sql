-- Contact page inbox: anyone (signed in or not) can send a message; only the
-- admin account can read, triage or delete them. Messages are write-only for
-- everybody else — nobody can list what others sent.

create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid references auth.users (id) on delete set null default auth.uid(),
  name text not null check (char_length(btrim(name)) between 1 and 120),
  email text not null check (
    char_length(email) between 3 and 320 and email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
  ),
  topic text not null check (topic in ('feedback', 'bug', 'idea', 'collab', 'other')),
  subject text not null check (char_length(btrim(subject)) between 1 and 160),
  message text not null check (char_length(btrim(message)) between 1 and 5000),
  status text not null default 'new' check (status in ('new', 'read', 'archived')),
  page text check (char_length(page) <= 200),
  user_agent text check (char_length(user_agent) <= 400)
);

create index if not exists contact_messages_created_idx on public.contact_messages (created_at desc);
create index if not exists contact_messages_email_idx on public.contact_messages (lower(email), created_at desc);

alter table public.contact_messages enable row level security;

create schema if not exists private;

create or replace function private.is_app_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(lower(auth.jwt() ->> 'email') = 'lmorfouad3@gmail.com', false);
$$;

drop policy if exists "contact: anyone can send" on public.contact_messages;
create policy "contact: anyone can send" on public.contact_messages
  for insert to anon, authenticated
  with check (status = 'new' and (user_id is null or user_id = (select auth.uid())));

drop policy if exists "contact: admin reads" on public.contact_messages;
create policy "contact: admin reads" on public.contact_messages
  for select to authenticated
  using ((select private.is_app_admin()));

drop policy if exists "contact: admin triages" on public.contact_messages;
create policy "contact: admin triages" on public.contact_messages
  for update to authenticated
  using ((select private.is_app_admin()))
  with check ((select private.is_app_admin()));

drop policy if exists "contact: admin deletes" on public.contact_messages;
create policy "contact: admin deletes" on public.contact_messages
  for delete to authenticated
  using ((select private.is_app_admin()));

-- Flood guard: at most 3 messages per email address per 10 minutes.
create or replace function private.contact_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (
    select count(*) from public.contact_messages
    where lower(email) = lower(new.email) and created_at > now() - interval '10 minutes'
  ) >= 3 then
    raise exception 'Too many messages — please wait a few minutes and try again.'
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists contact_rate_limit on public.contact_messages;
create trigger contact_rate_limit
  before insert on public.contact_messages
  for each row execute function private.contact_rate_limit();

grant insert on public.contact_messages to anon, authenticated;
grant select, update, delete on public.contact_messages to authenticated;
grant usage on schema private to anon, authenticated;
grant execute on function private.is_app_admin() to anon, authenticated;

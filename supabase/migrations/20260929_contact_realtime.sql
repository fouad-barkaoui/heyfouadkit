-- Lets the admin's bell get a live ping when a contact message arrives.
-- Realtime still honours RLS, so only the admin account receives the rows.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'contact_messages'
  ) then
    alter publication supabase_realtime add table public.contact_messages;
  end if;
end $$;

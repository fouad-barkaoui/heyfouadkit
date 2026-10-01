-- Google sign-ins carry full_name / name instead of username; keep
-- profiles.username filled so teammates see a name, not a blank.
create or replace function public.sync_profile()
 returns trigger
 language plpgsql
 security definer
 set search_path to ''
as $function$
begin
  insert into public.profiles (id, email, username)
  values (
    new.id,
    new.email,
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'username'), ''),
      nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
      nullif(trim(new.raw_user_meta_data ->> 'name'), '')
    )
  )
  on conflict (id) do update
    set email = excluded.email, username = excluded.username, updated_at = now();
  return new;
end $function$;

-- Pictures uploaded before Google sign-in existed live only in avatar_url,
-- which Supabase overwrites with the Google photo on every Google sign-in.
-- Copy them to avatar_custom, which the app now reads first.
update auth.users
set raw_user_meta_data = raw_user_meta_data || jsonb_build_object('avatar_custom', raw_user_meta_data ->> 'avatar_url')
where not (raw_user_meta_data ? 'avatar_custom')
  and raw_user_meta_data ->> 'avatar_url' like '%/storage/v1/object/public/avatars/%';

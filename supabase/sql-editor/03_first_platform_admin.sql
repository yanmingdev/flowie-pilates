-- After installing 00 or 01, register your own user in Supabase Auth or the app first.
-- In the Dashboard Authentication > Users, copy that user's UUID.
-- Replace NULL below with 'your-user-uuid'::uuid, then run once in SQL Editor.
-- This grants cross-studio platform administrator access to that account.
do $$
declare target_user_id uuid := NULL;  -- EXAMPLE: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'::uuid
begin
 if target_user_id is null then raise exception 'REPLACE_NULL_WITH_AUTH_USER_UUID'; end if;
 if not exists(select 1 from auth.users where id=target_user_id) then raise exception 'AUTH_USER_NOT_FOUND'; end if;
 if not exists(select 1 from public.profiles where id=target_user_id) then raise exception 'PROFILE_NOT_FOUND: register user after schema installation'; end if;
 insert into public.platform_admins(user_id) values(target_user_id) on conflict(user_id) do nothing;
end $$;

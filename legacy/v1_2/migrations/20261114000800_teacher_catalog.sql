-- Public teacher presentation deliberately omits email, phone and profile ID.
create function public.public_teacher_catalog(p_studio uuid)
returns table(id uuid,name text,photo_url text,specialty text,bio text)
language sql stable security definer set search_path='' as $$
 select t.id,t.name,t.photo_url,t.specialty,t.bio
 from public.teachers t join public.studios s on s.id=t.studio_id
 where t.studio_id=p_studio and t.is_active and s.is_active order by t.name,t.id
$$;
revoke all on function public.public_teacher_catalog(uuid) from public,anon,authenticated;
grant execute on function public.public_teacher_catalog(uuid) to anon,authenticated;

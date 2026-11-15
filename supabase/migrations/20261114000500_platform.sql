create function public.set_studio_admin(p_studio uuid,p_user uuid,p_active boolean) returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.is_super_admin() then raise exception 'FORBIDDEN'; end if;
 if not exists(select 1 from public.studios where id=p_studio) or not exists(select 1 from public.profiles where id=p_user) then raise exception 'STUDIO_OR_USER_NOT_FOUND'; end if;
 insert into public.studio_memberships(studio_id,user_id,role,is_active) values(p_studio,p_user,'admin',p_active)
 on conflict(studio_id,user_id,role) do update set is_active=excluded.is_active;
end $$;
revoke all on function public.set_studio_admin(uuid,uuid,boolean) from public,anon,authenticated;
grant execute on function public.set_studio_admin(uuid,uuid,boolean) to authenticated;
do $$ declare t text; begin
 foreach t in array array['teacher_branches','teacher_courses','package_courses'] loop
 execute format('create trigger audit_change after insert or update or delete on public.%I for each row execute function public.audit_change()',t);
 end loop;
end $$;

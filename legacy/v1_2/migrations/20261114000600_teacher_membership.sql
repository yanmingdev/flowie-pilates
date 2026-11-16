-- A linked teacher account gets the teacher role for this studio; unlinking or deactivation revokes it.
create function public.sync_teacher_membership() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_op='UPDATE' and old.profile_id is not null and old.profile_id is distinct from new.profile_id then
   update public.studio_memberships set is_active=false where studio_id=old.studio_id and user_id=old.profile_id and role='teacher';
 end if;
 if new.profile_id is not null then
   insert into public.studio_memberships(studio_id,user_id,role,is_active) values(new.studio_id,new.profile_id,'teacher',new.is_active)
   on conflict(studio_id,user_id,role) do update set is_active=excluded.is_active;
 end if;
 return new;
end $$;
create trigger sync_teacher_membership after insert or update of profile_id,is_active on public.teachers for each row execute function public.sync_teacher_membership();
revoke all on function public.sync_teacher_membership() from public,anon,authenticated;

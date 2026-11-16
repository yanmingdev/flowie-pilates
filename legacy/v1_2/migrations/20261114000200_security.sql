-- Authorization helpers deliberately use a fixed, empty search path.
create function public.is_super_admin() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.platform_admins where user_id=(select auth.uid()))
$$;
create function public.is_studio_admin(p_studio uuid) returns boolean language sql stable security definer set search_path='' as $$
 select public.is_super_admin() or exists(select 1 from public.studio_memberships m where m.studio_id=p_studio and m.user_id=(select auth.uid()) and m.role='admin' and m.is_active)
$$;
create function public.is_active_student(p_studio uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.studio_memberships m where m.studio_id=p_studio and m.user_id=(select auth.uid()) and m.role='student' and m.is_active)
$$;
create function public.is_session_teacher(p_session uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.class_sessions s join public.teachers t on t.id=s.teacher_id and t.studio_id=s.studio_id join public.studio_memberships m on m.studio_id=s.studio_id and m.user_id=t.profile_id and m.role='teacher' and m.is_active where s.id=p_session and t.profile_id=(select auth.uid()) and t.is_active)
$$;
create function public.can_view_profile(p_user uuid) returns boolean language sql stable security definer set search_path='' as $$
 select p_user=(select auth.uid()) or public.is_super_admin()
 or exists(select 1 from public.studio_memberships m where m.user_id=p_user and public.is_studio_admin(m.studio_id))
$$;
revoke all on function public.is_super_admin(),public.is_studio_admin(uuid),public.is_active_student(uuid),public.is_session_teacher(uuid),public.can_view_profile(uuid) from public;
grant execute on function public.is_super_admin(),public.is_studio_admin(uuid),public.is_active_student(uuid),public.is_session_teacher(uuid),public.can_view_profile(uuid) to anon,authenticated;

-- RLS is enabled even on tables with no end-user policy (deny by default).
do $$ declare t text; begin
 foreach t in array array['profiles','platform_admins','studios','studio_memberships','branches','rooms','teachers','teacher_branches','teacher_courses','teacher_availability','teacher_time_off','course_categories','courses','schedule_rules','class_sessions','bookings','attendance','course_packages','package_courses','student_packages','credit_ledger','site_settings','homepage_sections','banners','booking_settings','announcements','audit_logs'] loop
 execute format('alter table public.%I enable row level security',t);
 end loop;
end $$;
create policy profile_read on public.profiles for select to authenticated using (public.can_view_profile(id));
create policy profile_update on public.profiles for update to authenticated using (id=(select auth.uid())) with check(id=(select auth.uid()));
create policy platform_admin_self on public.platform_admins for select to authenticated using(user_id=(select auth.uid()));
create policy studio_public_read on public.studios for select to anon,authenticated using(is_active or public.is_studio_admin(id));
create policy studio_super_write on public.studios for all to authenticated using(public.is_super_admin()) with check(public.is_super_admin());
create policy membership_read on public.studio_memberships for select to authenticated using(user_id=(select auth.uid()) or public.is_studio_admin(studio_id));
-- Public content is limited to active rows. Administrative writes are still RLS-protected.
do $$ declare t text; begin
 foreach t in array array['branches','rooms','course_categories','courses','homepage_sections','banners','announcements','course_packages'] loop
 execute format('create policy public_read on public.%I for select to anon,authenticated using ((is_active and exists(select 1 from public.studios st where st.id=studio_id and st.is_active)) or public.is_studio_admin(studio_id))',t);
 execute format('create policy admin_write on public.%I for all to authenticated using (public.is_studio_admin(studio_id)) with check (public.is_studio_admin(studio_id))',t);
 end loop;
 foreach t in array array['teacher_branches','teacher_courses','teacher_availability','teacher_time_off','package_courses'] loop
 execute format('create policy admin_access on public.%I for all to authenticated using (public.is_studio_admin(studio_id)) with check (public.is_studio_admin(studio_id))',t);
 end loop;
 foreach t in array array['site_settings','booking_settings'] loop
 execute format('create policy public_read on public.%I for select to anon,authenticated using (exists(select 1 from public.studios st where st.id=studio_id and st.is_active) or public.is_studio_admin(studio_id))',t);
 execute format('create policy admin_write on public.%I for all to authenticated using (public.is_studio_admin(studio_id)) with check (public.is_studio_admin(studio_id))',t);
 end loop;
end $$;
create policy teachers_read on public.teachers for select to authenticated using(public.is_studio_admin(studio_id) or profile_id=(select auth.uid()));
create policy teachers_admin_write on public.teachers for all to authenticated using(public.is_studio_admin(studio_id)) with check(public.is_studio_admin(studio_id));
create policy schedule_admin_read on public.schedule_rules for select to authenticated using(public.is_studio_admin(studio_id));
create policy session_read on public.class_sessions for select to authenticated using(public.is_studio_admin(studio_id) or public.is_session_teacher(id) or exists(select 1 from public.bookings b where b.session_id=id and b.student_id=(select auth.uid())));
create policy bookings_read on public.bookings for select to authenticated using(student_id=(select auth.uid()) or public.is_studio_admin(studio_id) or public.is_session_teacher(session_id));
create policy attendance_read on public.attendance for select to authenticated using(public.is_studio_admin(studio_id) or exists(select 1 from public.bookings b where b.id=booking_id and (b.student_id=(select auth.uid()) or public.is_session_teacher(b.session_id))));
create policy student_packages_read on public.student_packages for select to authenticated using(student_id=(select auth.uid()) or public.is_studio_admin(studio_id));
create policy ledger_read on public.credit_ledger for select to authenticated using(student_id=(select auth.uid()) or public.is_studio_admin(studio_id));
create policy audit_read on public.audit_logs for select to authenticated using(public.is_studio_admin(studio_id));
-- Revoke direct writes to transactional tables; only narrowly scoped RPCs change them.
revoke insert,update,delete on public.platform_admins,public.studio_memberships,public.schedule_rules,public.class_sessions,public.student_packages,public.bookings,public.credit_ledger,public.attendance,public.audit_logs from anon,authenticated;

grant select on public.studios,public.branches,public.rooms,public.course_categories,public.courses,public.course_packages,public.site_settings,public.homepage_sections,public.banners,public.booking_settings,public.announcements to anon,authenticated;
grant select,insert,update,delete on public.studios,public.branches,public.rooms,public.teachers,public.teacher_branches,public.teacher_courses,public.teacher_availability,public.teacher_time_off,public.course_categories,public.courses,public.course_packages,public.package_courses,public.site_settings,public.homepage_sections,public.banners,public.booking_settings,public.announcements to authenticated;
grant select on public.platform_admins,public.studio_memberships,public.schedule_rules,public.class_sessions,public.student_packages,public.bookings,public.credit_ledger,public.attendance,public.audit_logs to authenticated;
grant select on public.profiles to authenticated;
revoke update on public.profiles from authenticated;
grant update (full_name,phone,birthday) on public.profiles to authenticated;

create function public.audit_change() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.audit_logs(studio_id,actor_id,table_name,record_id,action,before_data,after_data)
 values(coalesce(new.studio_id,old.studio_id),auth.uid(),tg_table_name,coalesce(new.id,old.id),tg_op,
   case when tg_op <> 'INSERT' then to_jsonb(old) end, case when tg_op <> 'DELETE' then to_jsonb(new) end);
 return coalesce(new,old);
end $$;
do $$ declare t text; begin
 foreach t in array array['class_sessions','bookings','student_packages','credit_ledger','attendance'] loop
 execute format('create trigger audit_change after insert or update or delete on public.%I for each row execute function public.audit_change()',t);
 end loop;
end $$;
revoke all on function public.audit_change(),public.handle_new_user(),public.touch_updated_at() from public,anon,authenticated;

-- Only non-sensitive public imagery belongs in this bucket. Path: studio UUID / file.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('studio-public','studio-public',true,5242880,array['image/png','image/jpeg','image/webp']) on conflict(id) do nothing;
create policy flowie_public_images_read on storage.objects for select to anon,authenticated using(bucket_id='studio-public');
create policy flowie_public_images_insert on storage.objects for insert to authenticated with check(bucket_id='studio-public' and public.is_studio_admin((storage.foldername(name))[1]::uuid));
create policy flowie_public_images_update on storage.objects for update to authenticated using(bucket_id='studio-public' and public.is_studio_admin((storage.foldername(name))[1]::uuid)) with check(bucket_id='studio-public' and public.is_studio_admin((storage.foldername(name))[1]::uuid));
create policy flowie_public_images_delete on storage.objects for delete to authenticated using(bucket_id='studio-public' and public.is_studio_admin((storage.foldername(name))[1]::uuid));

-- Additional narrowly-scoped management operations.
create function public.list_bookings(p_studio uuid,p_student uuid default null) returns table(id uuid,studio_id uuid,student_id uuid,status text,credits_charged int,created_at timestamptz,cancelled_at timestamptz,class_sessions jsonb,attendance jsonb)
language sql stable security definer set search_path='' as $$
 select b.id,b.studio_id,b.student_id,b.status,b.credits_charged,b.created_at,b.cancelled_at,
 jsonb_build_object('id',s.id,'starts_at',s.starts_at,'ends_at',s.ends_at,'status',s.status,'courses',jsonb_build_object('name',c.name),'branches',jsonb_build_object('name',br.name),'rooms',jsonb_build_object('name',r.name),'teachers',jsonb_build_object('name',t.name)),
 case when a.id is null or b.status='cancelled' then null else jsonb_build_object('status',a.status) end
 from public.bookings b join public.class_sessions s on s.id=b.session_id join public.courses c on c.id=s.course_id join public.branches br on br.id=s.branch_id join public.rooms r on r.id=s.room_id join public.teachers t on t.id=s.teacher_id left join public.attendance a on a.booking_id=b.id
 where b.studio_id=p_studio and (p_student is null or b.student_id=p_student) and auth.uid() is not null and (b.student_id=auth.uid() or public.is_studio_admin(b.studio_id) or public.is_session_teacher(b.session_id)) order by b.created_at desc limit 200
$$;
create function public.set_student_active(p_studio uuid,p_user uuid,p_active boolean) returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.is_studio_admin(p_studio) then raise exception 'FORBIDDEN'; end if;
 update public.studio_memberships set is_active=p_active where studio_id=p_studio and user_id=p_user and role='student';
 if not found then raise exception 'STUDENT_NOT_FOUND'; end if;
end $$;
create function public.update_student_profile(p_studio uuid,p_user uuid,p_name text,p_phone text,p_birthday date) returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.is_studio_admin(p_studio) then raise exception 'FORBIDDEN'; end if;
 if length(trim(coalesce(p_name,'')))=0 or length(p_name)>200 or length(coalesce(p_phone,''))>40 then raise exception 'INVALID_PROFILE'; end if;
 if not exists(select 1 from public.studio_memberships where studio_id=p_studio and user_id=p_user and role='student') then raise exception 'STUDENT_NOT_FOUND'; end if;
 update public.profiles set full_name=p_name,phone=p_phone,birthday=p_birthday where id=p_user;
end $$;
create function public.update_future_sessions(p_session uuid,p_branch uuid,p_room uuid,p_course uuid,p_teacher uuid,p_starts timestamptz,p_ends timestamptz,p_capacity int,p_opens timestamptz,p_cancel_deadline timestamptz) returns setof public.class_sessions language plpgsql security definer set search_path='' as $$
declare base public.class_sessions; item public.class_sessions; changed public.class_sessions; delta interval;
begin
 select * into base from public.class_sessions where id=p_session for update;
 if not found or not public.is_studio_admin(base.studio_id) then raise exception 'FORBIDDEN_OR_NOT_FOUND'; end if;
 if base.schedule_rule_id is null or base.status<>'scheduled' or base.starts_at<=now() or p_starts<=now() or p_ends<=p_starts then raise exception 'INVALID_INTERVAL_OR_STATUS'; end if;
 delta=p_starts-base.starts_at;
 for item in select * from public.class_sessions where studio_id=base.studio_id and schedule_rule_id=base.schedule_rule_id and status='scheduled' and starts_at>=base.starts_at order by starts_at,id for update loop
   update public.class_sessions set branch_id=p_branch,room_id=p_room,course_id=p_course,teacher_id=p_teacher,starts_at=item.starts_at+delta,ends_at=item.starts_at+delta+(p_ends-p_starts),capacity=p_capacity,
   booking_opens_at=case when p_opens is null then item.booking_opens_at else p_opens+(item.starts_at-base.starts_at) end,
   cancellation_deadline=case when p_cancel_deadline is null then null else p_cancel_deadline+(item.starts_at-base.starts_at) end where id=item.id returning * into changed;
   return next changed;
 end loop;
end $$;
create function public.cancel_future_sessions(p_session uuid) returns integer language plpgsql security definer set search_path='' as $$
declare base public.class_sessions; item public.class_sessions; n integer=0;
begin
 select * into base from public.class_sessions where id=p_session for update;
 if not found or not public.is_studio_admin(base.studio_id) then raise exception 'FORBIDDEN_OR_NOT_FOUND'; end if;
 if base.schedule_rule_id is null or base.status<>'scheduled' or base.starts_at<=now() then raise exception 'SESSION_NOT_CANCELLABLE'; end if;
 for item in select * from public.class_sessions where studio_id=base.studio_id and schedule_rule_id=base.schedule_rule_id and status='scheduled' and starts_at>=base.starts_at order by starts_at,id for update loop
   perform public.cancel_class_session(item.id); n=n+1;
 end loop;
 return n;
end $$;
create function public.sync_profile_email() returns trigger language plpgsql security definer set search_path='' as $$
begin update public.profiles set email=new.email where id=new.id;return new;end $$;
create trigger on_auth_user_email_changed after update of email on auth.users for each row when (old.email is distinct from new.email) execute function public.sync_profile_email();
revoke all on function public.sync_profile_email(),public.list_bookings(uuid,uuid),public.set_student_active(uuid,uuid,boolean),public.update_student_profile(uuid,uuid,text,text,date),public.update_future_sessions(uuid,uuid,uuid,uuid,uuid,timestamptz,timestamptz,int,timestamptz,timestamptz),public.cancel_future_sessions(uuid) from public,anon,authenticated;
grant execute on function public.list_bookings(uuid,uuid),public.set_student_active(uuid,uuid,boolean),public.update_student_profile(uuid,uuid,text,text,date),public.update_future_sessions(uuid,uuid,uuid,uuid,uuid,timestamptz,timestamptz,int,timestamptz,timestamptz),public.cancel_future_sessions(uuid) to authenticated;
do $$ declare t text; begin
 foreach t in array array['studio_memberships','branches','rooms','teachers','teacher_availability','teacher_time_off','course_categories','courses','schedule_rules','course_packages','site_settings','homepage_sections','banners','booking_settings','announcements'] loop
 execute format('create trigger audit_change after insert or update or delete on public.%I for each row execute function public.audit_change()',t);
 end loop;
end $$;

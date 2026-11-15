-- Locks the teacher while checking unavailability; exclusion constraints protect concurrent bookings of a room/teacher.
create function public.validate_session() returns trigger language plpgsql security definer set search_path='' as $$
declare r public.rooms%rowtype; local_start timestamp; local_end timestamp; tz text; occupied integer;
begin
 if new.status='cancelled' then return new; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(new.teacher_id::text,0));
 select * into r from public.rooms where id=new.room_id and studio_id=new.studio_id for share;
 if not found or not r.is_active or r.branch_id<>new.branch_id or new.capacity>r.capacity then raise exception 'INVALID_ROOM_OR_CAPACITY'; end if;
 if not exists(select 1 from public.branches b where b.id=new.branch_id and b.studio_id=new.studio_id and b.is_active) or
    not exists(select 1 from public.courses c where c.id=new.course_id and c.studio_id=new.studio_id and c.is_active) or
    not exists(select 1 from public.teachers t where t.id=new.teacher_id and t.studio_id=new.studio_id and t.is_active) then raise exception 'INACTIVE_RESOURCE'; end if;
 if not exists(select 1 from public.teacher_branches where studio_id=new.studio_id and teacher_id=new.teacher_id and branch_id=new.branch_id) or
    not exists(select 1 from public.teacher_courses where studio_id=new.studio_id and teacher_id=new.teacher_id and course_id=new.course_id) then raise exception 'TEACHER_NOT_QUALIFIED'; end if;
 select timezone into tz from public.branches where id=new.branch_id and studio_id=new.studio_id;
 local_start=pg_catalog.timezone(tz,new.starts_at); local_end=pg_catalog.timezone(tz,new.ends_at);
 if local_start::date<>local_end::date or not exists(select 1 from public.teacher_availability a where a.studio_id=new.studio_id and a.teacher_id=new.teacher_id and a.is_active and a.weekday=extract(dow from local_start)::int and a.start_time<=local_start::time and a.end_time>=local_end::time) then raise exception 'OUTSIDE_TEACHER_AVAILABILITY'; end if;
 if exists(select 1 from public.teacher_time_off o where o.studio_id=new.studio_id and o.teacher_id=new.teacher_id and o.is_active and tstzrange(o.starts_at,o.ends_at,'[)') && tstzrange(new.starts_at,new.ends_at,'[)')) then raise exception 'TEACHER_TIME_OFF'; end if;
 if tg_op='UPDATE' then
   select count(*) into occupied from public.bookings where session_id=new.id and status in ('confirmed','completed','no_show');
   if new.capacity<occupied then raise exception 'CAPACITY_BELOW_BOOKINGS'; end if;
   if occupied>0 and (new.course_id<>old.course_id or new.starts_at<>old.starts_at or new.ends_at<>old.ends_at) then raise exception 'BOOKED_SESSION_CHANGE_REQUIRES_CANCELLATION'; end if;
   if new.teacher_id<>old.teacher_id and new.original_teacher_id is null then new.original_teacher_id=old.teacher_id; end if;
 end if;
 return new;
end $$;
create trigger validate_session before insert or update on public.class_sessions for each row execute function public.validate_session();
create function public.validate_time_off() returns trigger language plpgsql security definer set search_path='' as $$
begin
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(new.teacher_id::text,0));
 if new.is_active and exists(select 1 from public.class_sessions s where s.studio_id=new.studio_id and s.teacher_id=new.teacher_id and s.status<>'cancelled' and tstzrange(s.starts_at,s.ends_at,'[)') && tstzrange(new.starts_at,new.ends_at,'[)')) then raise exception 'TIME_OFF_CONFLICTS_WITH_SESSION'; end if;
 return new;
end $$;
create trigger validate_time_off before insert or update on public.teacher_time_off for each row execute function public.validate_time_off();
revoke all on function public.validate_session(),public.validate_time_off() from public,anon,authenticated;

create function public.join_studio(p_studio uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'UNAUTHENTICATED'; end if;
 if not exists(select 1 from public.studios where id=p_studio and is_active) then raise exception 'STUDIO_NOT_FOUND'; end if;
 insert into public.studio_memberships(studio_id,user_id,role) values(p_studio,auth.uid(),'student') on conflict(studio_id,user_id,role) do nothing;
end $$;

create function public.schedule_class_sessions(p_studio uuid,p_branch uuid,p_room uuid,p_course uuid,p_teacher uuid,p_starts timestamptz,p_ends timestamptz,p_capacity int,p_opens timestamptz,p_cancel_deadline timestamptz,p_repeat_until date default null) returns setof public.class_sessions language plpgsql security definer set search_path='' as $$
declare n int; max_n int; rule_id uuid; row public.class_sessions; tz text; local_start timestamp; local_end timestamp; occurrence_start timestamptz; occurrence_end timestamptz;
begin
 if not public.is_studio_admin(p_studio) then raise exception 'FORBIDDEN'; end if;
 if p_starts is null or p_ends<=p_starts or p_starts<=now() then raise exception 'INVALID_INTERVAL'; end if;
 select timezone into tz from public.branches where id=p_branch and studio_id=p_studio;
 if tz is null then raise exception 'INVALID_BRANCH'; end if;
 local_start=pg_catalog.timezone(tz,p_starts); local_end=pg_catalog.timezone(tz,p_ends);
 if p_repeat_until is not null and (p_repeat_until < local_start::date or p_repeat_until > local_start::date+90) then raise exception 'INVALID_REPEAT_RANGE'; end if;
 max_n=case when p_repeat_until is null then 0 else floor((p_repeat_until-local_start::date)/7)::int end;
 insert into public.schedule_rules(studio_id,frequency,until_date) values(p_studio,case when p_repeat_until is null then 'once' else 'weekly' end,p_repeat_until) returning id into rule_id;
 for n in 0..max_n loop
   occurrence_start=pg_catalog.timezone(tz,local_start+n*interval '7 days'); occurrence_end=pg_catalog.timezone(tz,local_end+n*interval '7 days');
   insert into public.class_sessions(studio_id,branch_id,room_id,course_id,teacher_id,starts_at,ends_at,capacity,booking_opens_at,cancellation_deadline,schedule_rule_id)
   values(p_studio,p_branch,p_room,p_course,p_teacher,occurrence_start,occurrence_end,p_capacity,coalesce(p_opens+(occurrence_start-p_starts),now()),case when p_cancel_deadline is null then null else p_cancel_deadline+(occurrence_start-p_starts) end,rule_id)
   returning * into row;
   return next row;
 end loop;
end $$;

create function public.update_class_session(p_session uuid,p_branch uuid,p_room uuid,p_course uuid,p_teacher uuid,p_starts timestamptz,p_ends timestamptz,p_capacity int,p_opens timestamptz,p_cancel_deadline timestamptz) returns public.class_sessions language plpgsql security definer set search_path='' as $$
declare s public.class_sessions;
begin
 select * into s from public.class_sessions where id=p_session for update;
 if not found or not public.is_studio_admin(s.studio_id) then raise exception 'FORBIDDEN_OR_NOT_FOUND'; end if;
 if s.status<>'scheduled' or s.starts_at<=now() or p_starts<=now() or p_ends<=p_starts then raise exception 'INVALID_INTERVAL_OR_STATUS'; end if;
 update public.class_sessions set branch_id=p_branch,room_id=p_room,course_id=p_course,teacher_id=p_teacher,starts_at=p_starts,ends_at=p_ends,capacity=p_capacity,booking_opens_at=coalesce(p_opens,s.booking_opens_at),cancellation_deadline=p_cancel_deadline where id=p_session returning * into s;
 return s;
end $$;

create function public.issue_student_package(p_studio uuid,p_student uuid,p_package uuid,p_key text,p_starts timestamptz default now()) returns public.student_packages language plpgsql security definer set search_path='' as $$
declare p public.course_packages; result public.student_packages;
begin
 if not public.is_studio_admin(p_studio) then raise exception 'FORBIDDEN'; end if;
 if p_key is null or length(p_key)<8 or length(p_key)>120 then raise exception 'INVALID_REQUEST_KEY'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('grant:'||p_studio::text||':'||p_key,0));
 select sp.* into result from public.credit_ledger l join public.student_packages sp on sp.id=l.student_package_id where l.studio_id=p_studio and l.idempotency_key='grant:'||p_key and l.entry_type='GRANT' and sp.student_id=p_student and sp.package_id=p_package;
 if found then return result; end if;
 if exists(select 1 from public.credit_ledger where studio_id=p_studio and idempotency_key='grant:'||p_key) then raise exception 'DUPLICATE_REQUEST'; end if;
 if not exists(select 1 from public.studio_memberships where studio_id=p_studio and user_id=p_student and role='student' and is_active) then raise exception 'STUDENT_NOT_FOUND'; end if;
 select * into p from public.course_packages where id=p_package and studio_id=p_studio and is_active;
 if not found then raise exception 'PACKAGE_NOT_FOUND'; end if;
 insert into public.student_packages(studio_id,student_id,package_id,starts_at,expires_at,granted_credits,balance) values(p_studio,p_student,p.id,p_starts,p_starts+make_interval(days=>p.validity_days),p.total_credits,p.total_credits) returning * into result;
 insert into public.credit_ledger(studio_id,student_id,student_package_id,entry_type,delta,operator_id,idempotency_key) values(p_studio,p_student,result.id,'GRANT',p.total_credits,auth.uid(),'grant:'||p_key);
 return result;
end $$;
create function public.adjust_student_credits(p_student_package uuid,p_delta int,p_note text,p_key text) returns public.student_packages language plpgsql security definer set search_path='' as $$
declare sp public.student_packages;
begin
 select * into sp from public.student_packages where id=p_student_package for update;
 if not found or not public.is_studio_admin(sp.studio_id) then raise exception 'FORBIDDEN_OR_NOT_FOUND'; end if;
 if p_delta=0 or p_key is null or length(p_key)<8 or p_note is null or length(trim(p_note))=0 then raise exception 'INVALID_ADJUSTMENT'; end if;
 if exists(select 1 from public.credit_ledger where studio_id=sp.studio_id and idempotency_key=p_key) then raise exception 'DUPLICATE_REQUEST'; end if;
 if sp.balance+p_delta<0 then raise exception 'INSUFFICIENT_CREDITS'; end if;
 update public.student_packages set balance=balance+p_delta where id=sp.id returning * into sp;
 insert into public.credit_ledger(studio_id,student_id,student_package_id,entry_type,delta,operator_id,idempotency_key,note) values(sp.studio_id,sp.student_id,sp.id,'MANUAL_ADJUSTMENT',p_delta,auth.uid(),p_key,p_note);
 return sp;
end $$;

create function public.book_class_session(p_session uuid,p_key text) returns public.bookings language plpgsql security definer set search_path='' as $$
declare s public.class_sessions; sp public.student_packages; b public.bookings; cost int; cnt int; effective_capacity int;
begin
 if auth.uid() is null then raise exception 'UNAUTHENTICATED'; end if;
 if p_key is null or length(p_key)<8 or length(p_key)>120 then raise exception 'INVALID_REQUEST_KEY'; end if;
 select * into s from public.class_sessions where id=p_session for update;
 if not found then raise exception 'SESSION_NOT_FOUND'; end if;
 if not public.is_active_student(s.studio_id) or not exists(select 1 from public.studios where id=s.studio_id and is_active) then raise exception 'FORBIDDEN'; end if;
 select b2.* into b from public.credit_ledger l join public.bookings b2 on b2.id=l.booking_id where l.studio_id=s.studio_id and l.idempotency_key=p_key and l.student_id=auth.uid() and b2.session_id=s.id and l.entry_type='BOOKING_DEBIT';
 if found then return b; end if;
 if exists(select 1 from public.credit_ledger where studio_id=s.studio_id and idempotency_key=p_key) then raise exception 'DUPLICATE_REQUEST'; end if;
 if s.status<>'scheduled' or s.starts_at<=now() then raise exception 'SESSION_UNAVAILABLE'; end if;
 if s.booking_opens_at>now() then raise exception 'BOOKING_NOT_OPEN'; end if;
 select least(s.capacity,r.capacity) into effective_capacity from public.rooms r join public.branches br on br.id=s.branch_id and br.studio_id=s.studio_id join public.teachers t on t.id=s.teacher_id and t.studio_id=s.studio_id join public.courses c on c.id=s.course_id and c.studio_id=s.studio_id where r.id=s.room_id and r.studio_id=s.studio_id and r.is_active and br.is_active and t.is_active and c.is_active for share of r,br,t,c;
 if not found then raise exception 'SESSION_UNAVAILABLE'; end if;
 if exists(select 1 from public.bookings where session_id=s.id and student_id=auth.uid() and status in ('confirmed','completed','no_show')) then raise exception 'ALREADY_BOOKED'; end if;
 select count(*) into cnt from public.bookings where session_id=s.id and status in ('confirmed','completed','no_show');
 if cnt>=effective_capacity then raise exception 'SESSION_FULL'; end if;
 select credit_cost into cost from public.courses where id=s.course_id and studio_id=s.studio_id and is_active;
 if cost is null then raise exception 'COURSE_UNAVAILABLE'; end if;
 select sp1.* into sp from public.student_packages sp1 join public.course_packages cp on cp.id=sp1.package_id and cp.studio_id=sp1.studio_id
 where sp1.student_id=auth.uid() and sp1.studio_id=s.studio_id and sp1.status='active' and sp1.starts_at<=now() and sp1.expires_at>s.starts_at and sp1.balance>=cost
 and (cp.applies_to_all or exists(select 1 from public.package_courses pc where pc.studio_id=s.studio_id and pc.package_id=cp.id and pc.course_id=s.course_id))
 order by sp1.expires_at,sp1.id limit 1 for update of sp1;
 if not found then raise exception 'NO_VALID_PACKAGE_OR_CREDITS'; end if;
 insert into public.bookings(studio_id,session_id,student_id,student_package_id,credits_charged) values(s.studio_id,s.id,auth.uid(),sp.id,cost) returning * into b;
 update public.student_packages set balance=balance-cost where id=sp.id;
 insert into public.credit_ledger(studio_id,student_id,student_package_id,booking_id,entry_type,delta,operator_id,idempotency_key) values(s.studio_id,auth.uid(),sp.id,b.id,'BOOKING_DEBIT',-cost,auth.uid(),p_key);
 return b;
end $$;

create function public.cancel_class_booking(p_booking uuid) returns public.bookings language plpgsql security definer set search_path='' as $$
declare b public.bookings; s public.class_sessions; hours int; deadline timestamptz;
begin
 select * into b from public.bookings where id=p_booking;
 if not found then raise exception 'BOOKING_NOT_FOUND'; end if;
 select * into s from public.class_sessions where id=b.session_id for update;
 select * into b from public.bookings where id=p_booking for update;
 if auth.uid() is null or (b.student_id is distinct from auth.uid() and not public.is_studio_admin(b.studio_id)) then raise exception 'FORBIDDEN'; end if;
 if b.status<>'confirmed' then raise exception 'BOOKING_NOT_ACTIVE'; end if;
 select cancellation_hours into hours from public.booking_settings where studio_id=b.studio_id;
 deadline=coalesce(s.cancellation_deadline,s.starts_at-make_interval(hours=>coalesce(hours,12)));
 if b.student_id=auth.uid() and now()>deadline then raise exception 'CANCELLATION_DEADLINE_PASSED'; end if;
 if s.starts_at<=now() then raise exception 'SESSION_STARTED'; end if;
 perform 1 from public.student_packages where id=b.student_package_id for update;
 update public.bookings set status='cancelled',cancelled_at=now() where id=b.id returning * into b;
 update public.attendance set status='unconfirmed',marked_by=auth.uid() where booking_id=b.id;
 update public.student_packages set balance=balance+b.credits_charged where id=b.student_package_id;
 insert into public.credit_ledger(studio_id,student_id,student_package_id,booking_id,entry_type,delta,operator_id,idempotency_key) values(b.studio_id,b.student_id,b.student_package_id,b.id,'CANCELLATION_REFUND',b.credits_charged,auth.uid(),'refund:'||b.id::text);
 return b;
end $$;

create function public.cancel_class_session(p_session uuid) returns public.class_sessions language plpgsql security definer set search_path='' as $$
declare s public.class_sessions; b public.bookings;
begin
 select * into s from public.class_sessions where id=p_session for update;
 if not found or not public.is_studio_admin(s.studio_id) then raise exception 'FORBIDDEN_OR_NOT_FOUND'; end if;
 if s.status<>'scheduled' or s.starts_at<=now() then raise exception 'SESSION_NOT_CANCELLABLE'; end if;
 update public.class_sessions set status='cancelled' where id=s.id returning * into s;
 for b in select * from public.bookings where session_id=s.id and status='confirmed' order by student_package_id,id for update loop
   perform 1 from public.student_packages where id=b.student_package_id for update;
   update public.bookings set status='cancelled',cancelled_at=now() where id=b.id;
   update public.attendance set status='unconfirmed',marked_by=auth.uid() where booking_id=b.id;
   update public.student_packages set balance=balance+b.credits_charged where id=b.student_package_id;
   insert into public.credit_ledger(studio_id,student_id,student_package_id,booking_id,entry_type,delta,operator_id,idempotency_key,note) values(b.studio_id,b.student_id,b.student_package_id,b.id,'CANCELLATION_REFUND',b.credits_charged,auth.uid(),'refund:'||b.id::text,'場次取消');
 end loop;
 return s;
end $$;
create function public.mark_attendance(p_booking uuid,p_status text) returns public.attendance language plpgsql security definer set search_path='' as $$
declare b public.bookings; a public.attendance;
begin
 select * into b from public.bookings where id=p_booking for update;
 if not found or (not public.is_studio_admin(b.studio_id) and not public.is_session_teacher(b.session_id)) then raise exception 'FORBIDDEN_OR_NOT_FOUND'; end if;
 if b.status<>'confirmed' or p_status not in ('present','absent','unconfirmed') then raise exception 'INVALID_ATTENDANCE'; end if;
 insert into public.attendance(studio_id,booking_id,status,marked_by) values(b.studio_id,b.id,p_status,auth.uid())
 on conflict(booking_id) do update set status=excluded.status,marked_by=excluded.marked_by returning * into a;
 return a;
end $$;
create function public.session_students(p_session uuid) returns table(booking_id uuid,student_id uuid,student_name text,booking_status text,attendance_status text) language plpgsql stable security definer set search_path='' as $$
declare s public.class_sessions;
begin
 select * into s from public.class_sessions where id=p_session;
 if not found or (not public.is_studio_admin(s.studio_id) and not public.is_session_teacher(s.id)) then raise exception 'FORBIDDEN_OR_NOT_FOUND'; end if;
 return query select b.id,b.student_id,p.full_name,b.status,coalesce(a.status,'unconfirmed') from public.bookings b join public.profiles p on p.id=b.student_id left join public.attendance a on a.booking_id=b.id where b.session_id=p_session and b.status<>'cancelled' order by p.full_name,b.id;
end $$;

-- Only public presentation fields and an aggregated count are exposed.
create function public.session_catalog(p_studio uuid,p_from timestamptz,p_to timestamptz)
returns table(id uuid,studio_id uuid,branch_id uuid,branch_name text,room_id uuid,room_name text,course_id uuid,course_name text,course_image text,category_id uuid,teacher_id uuid,teacher_name text,teacher_photo text,starts_at timestamptz,ends_at timestamptz,capacity int,booked_count bigint,credit_cost int,booking_opens_at timestamptz,cancellation_deadline timestamptz,status text)
language plpgsql stable security definer set search_path='' as $$
begin
 if p_from is null or p_to is null or p_to<=p_from or p_to>p_from+interval '180 days' then raise exception 'INVALID_DATE_RANGE'; end if;
 return query select s.id,s.studio_id,br.id,br.name,r.id,r.name,c.id,c.name,c.image_url,c.category_id,t.id,t.name,t.photo_url,s.starts_at,s.ends_at,least(s.capacity,r.capacity),
 (select count(*) from public.bookings b where b.session_id=s.id and b.status in ('confirmed','completed','no_show')),c.credit_cost,s.booking_opens_at,s.cancellation_deadline,s.status
 from public.class_sessions s join public.studios st on st.id=s.studio_id join public.branches br on br.id=s.branch_id join public.rooms r on r.id=s.room_id join public.courses c on c.id=s.course_id join public.teachers t on t.id=s.teacher_id
 where s.studio_id=p_studio and st.is_active and br.is_active and r.is_active and c.is_active and t.is_active and s.status='scheduled' and s.starts_at>=p_from and s.starts_at<p_to order by s.starts_at;
end $$;
create function public.admin_report(p_studio uuid,p_from timestamptz,p_to timestamptz,p_branch uuid default null,p_status text default null)
returns table(session_count bigint,booking_count bigint,attendance_count bigint,cancellation_count bigint,unconfirmed_attendance_count bigint) language plpgsql stable security definer set search_path='' as $$
begin
 if not public.is_studio_admin(p_studio) then raise exception 'FORBIDDEN'; end if;
 if p_from is null or p_to is null or p_to<=p_from or p_to>p_from+interval '366 days' then raise exception 'INVALID_DATE_RANGE'; end if;
 if p_status is not null and p_status not in ('scheduled','cancelled','completed') then raise exception 'INVALID_STATUS'; end if;
 return query select
 (select count(*) from public.class_sessions s where s.studio_id=p_studio and s.starts_at>=p_from and s.starts_at<p_to and (p_branch is null or s.branch_id=p_branch) and (p_status is null or s.status=p_status)),
 (select count(*) from public.bookings b join public.class_sessions s on s.id=b.session_id where s.studio_id=p_studio and s.starts_at>=p_from and s.starts_at<p_to and (p_branch is null or s.branch_id=p_branch) and (p_status is null or s.status=p_status) and b.status<>'cancelled'),
 (select count(*) from public.attendance a join public.bookings b on b.id=a.booking_id join public.class_sessions s on s.id=b.session_id where s.studio_id=p_studio and s.starts_at>=p_from and s.starts_at<p_to and (p_branch is null or s.branch_id=p_branch) and (p_status is null or s.status=p_status) and a.status='present' and b.status<>'cancelled'),
 (select count(*) from public.bookings b join public.class_sessions s on s.id=b.session_id where s.studio_id=p_studio and b.cancelled_at>=p_from and b.cancelled_at<p_to and (p_branch is null or s.branch_id=p_branch) and (p_status is null or s.status=p_status) and b.status='cancelled'),
 (select count(*) from public.bookings b join public.class_sessions s on s.id=b.session_id left join public.attendance a on a.booking_id=b.id where s.studio_id=p_studio and s.starts_at>=p_from and s.starts_at<p_to and s.ends_at<now() and (p_branch is null or s.branch_id=p_branch) and (p_status is null or s.status=p_status) and b.status='confirmed' and (a.id is null or a.status='unconfirmed'));
end $$;
revoke all on function public.join_studio(uuid),public.schedule_class_sessions(uuid,uuid,uuid,uuid,uuid,timestamptz,timestamptz,int,timestamptz,timestamptz,date),public.update_class_session(uuid,uuid,uuid,uuid,uuid,timestamptz,timestamptz,int,timestamptz,timestamptz),public.issue_student_package(uuid,uuid,uuid,text,timestamptz),public.adjust_student_credits(uuid,int,text,text),public.book_class_session(uuid,text),public.cancel_class_booking(uuid),public.cancel_class_session(uuid),public.mark_attendance(uuid,text),public.session_students(uuid),public.session_catalog(uuid,timestamptz,timestamptz),public.admin_report(uuid,timestamptz,timestamptz,uuid,text) from public,anon,authenticated;
grant execute on function public.session_catalog(uuid,timestamptz,timestamptz) to anon,authenticated;
grant execute on function public.join_studio(uuid),public.schedule_class_sessions(uuid,uuid,uuid,uuid,uuid,timestamptz,timestamptz,int,timestamptz,timestamptz,date),public.update_class_session(uuid,uuid,uuid,uuid,uuid,timestamptz,timestamptz,int,timestamptz,timestamptz),public.issue_student_package(uuid,uuid,uuid,text,timestamptz),public.adjust_student_credits(uuid,int,text,text),public.book_class_session(uuid,text),public.cancel_class_booking(uuid),public.cancel_class_session(uuid),public.mark_attendance(uuid,text),public.session_students(uuid),public.admin_report(uuid,timestamptz,timestamptz,uuid,text) to authenticated;

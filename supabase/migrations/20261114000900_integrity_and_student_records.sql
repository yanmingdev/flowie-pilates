-- V1.1: stronger tenant relations and tenant-scoped student details.
-- Existing databases must be backed up and preflighted before applying this migration.
alter table public.rooms add constraint rooms_studio_branch_id_key unique(studio_id,branch_id,id);
alter table public.class_sessions drop constraint class_sessions_studio_id_room_id_fkey;
alter table public.class_sessions add constraint class_sessions_room_branch_fkey foreign key(studio_id,branch_id,room_id) references public.rooms(studio_id,branch_id,id);

alter table public.student_packages add constraint student_packages_studio_id_student_key unique(studio_id,id,student_id);
alter table public.bookings drop constraint bookings_studio_id_student_package_id_fkey;
alter table public.bookings add constraint bookings_student_package_owner_fkey foreign key(studio_id,student_package_id,student_id) references public.student_packages(studio_id,id,student_id);
alter table public.bookings add constraint bookings_studio_id_owner_package_key unique(studio_id,id,student_id,student_package_id);
alter table public.credit_ledger drop constraint credit_ledger_studio_id_student_package_id_fkey;
alter table public.credit_ledger drop constraint credit_ledger_studio_id_booking_id_fkey;
alter table public.credit_ledger add constraint ledger_student_package_owner_fkey foreign key(studio_id,student_package_id,student_id) references public.student_packages(studio_id,id,student_id);
alter table public.credit_ledger add constraint ledger_booking_owner_package_fkey foreign key(studio_id,booking_id,student_id,student_package_id) references public.bookings(studio_id,id,student_id,student_package_id);
alter table public.credit_ledger add constraint ledger_delta_type_check check (
 (entry_type='GRANT' and delta>0 and booking_id is null) or
 (entry_type='BOOKING_DEBIT' and delta<0 and booking_id is not null) or
 (entry_type='CANCELLATION_REFUND' and delta>0 and booking_id is not null) or
 (entry_type='MANUAL_ADJUSTMENT' and delta<>0 and booking_id is null) or
 (entry_type='EXPIRATION' and delta<0 and booking_id is null)
);
create unique index ledger_one_grant_per_package on public.credit_ledger(student_package_id) where entry_type='GRANT';
create index ledger_studio_student_package_idx on public.credit_ledger(studio_id,student_package_id);

-- Preserve the cancellation deadline that was in force at the time of booking.
alter table public.bookings add column cancellation_deadline_at timestamptz;
update public.bookings b set cancellation_deadline_at=coalesce(s.cancellation_deadline,s.starts_at-make_interval(hours=>coalesce((select bs.cancellation_hours from public.booking_settings bs where bs.studio_id=s.studio_id),12))) from public.class_sessions s where s.id=b.session_id;
alter table public.bookings alter column cancellation_deadline_at set not null;

-- NULL branch_id means every branch assigned to the teacher.
alter table public.teacher_availability add column branch_id uuid;
alter table public.teacher_availability add constraint teacher_availability_branch_assignment_fkey foreign key(studio_id,teacher_id,branch_id) references public.teacher_branches(studio_id,teacher_id,branch_id);

-- Keep student contact edits inside the studio rather than altering a shared global profile.
alter table public.studio_memberships add constraint membership_studio_id_user_key unique(studio_id,id,user_id);
create table public.student_details (
 id uuid primary key default gen_random_uuid(),
 studio_id uuid not null references public.studios(id), membership_id uuid not null unique,
 student_id uuid not null references public.profiles(id), full_name text not null default '',
 phone text, birthday date,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(studio_id,student_id),
 foreign key(studio_id,membership_id,student_id) references public.studio_memberships(studio_id,id,user_id)
);
create trigger set_updated_at before update on public.student_details for each row execute function public.touch_updated_at();
create trigger audit_change after insert or update or delete on public.student_details for each row execute function public.audit_change();
alter table public.student_details enable row level security;
revoke all on public.student_details from public,anon,authenticated;
grant select on public.student_details to authenticated;
create policy student_details_read on public.student_details for select to authenticated using(student_id=(select auth.uid()) or public.is_studio_admin(studio_id));
create function public.create_student_details() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.role='student' then
  insert into public.student_details(studio_id,membership_id,student_id,full_name,phone,birthday)
  select new.studio_id,new.id,new.user_id,p.full_name,p.phone,p.birthday from public.profiles p where p.id=new.user_id
  on conflict(studio_id,student_id) do nothing;
 end if;
 return new;
end $$;
create trigger create_student_details after insert on public.studio_memberships for each row execute function public.create_student_details();
revoke all on function public.create_student_details() from public,anon,authenticated;
insert into public.student_details(studio_id,membership_id,student_id,full_name,phone,birthday)
select m.studio_id,m.id,m.user_id,p.full_name,p.phone,p.birthday from public.studio_memberships m join public.profiles p on p.id=m.user_id where m.role='student'
on conflict(studio_id,student_id) do nothing;

create or replace function public.can_view_profile(p_user uuid) returns boolean language sql stable security definer set search_path='' as $$
 select p_user=(select auth.uid()) or public.is_super_admin()
$$;
drop policy session_read on public.class_sessions;
create policy session_read on public.class_sessions for select to authenticated using(public.is_studio_admin(studio_id) or public.is_session_teacher(id) or exists(select 1 from public.bookings b where b.session_id=class_sessions.id and b.student_id=(select auth.uid())));
-- Existing resources are deactivated instead of physically removed.
revoke delete on public.studios,public.branches,public.rooms,public.teachers,public.course_categories,public.courses,public.course_packages,public.site_settings,public.homepage_sections,public.banners,public.booking_settings,public.announcements from authenticated;

-- Deferred checks see the final ledger state after the RPC finishes its transaction.
create function public.verify_package_ledger_balance() returns trigger language plpgsql security definer set search_path='' as $$
declare target uuid; expected bigint; current_balance integer;
begin
 if tg_table_name='student_packages' then target=coalesce(new.id,old.id); else target=coalesce(new.student_package_id,old.student_package_id); end if;
 select sp.balance into current_balance from public.student_packages sp where sp.id=target;
 if not found then return null; end if;
 select coalesce(sum(l.delta),0) into expected from public.credit_ledger l where l.student_package_id=target;
 if expected<>current_balance then raise exception 'LEDGER_BALANCE_MISMATCH'; end if;
 return null;
end $$;
create constraint trigger check_package_balance after insert or update on public.student_packages deferrable initially deferred for each row execute function public.verify_package_ledger_balance();
create constraint trigger check_ledger_balance after insert or update or delete on public.credit_ledger deferrable initially deferred for each row execute function public.verify_package_ledger_balance();
revoke all on function public.verify_package_ledger_balance() from public,anon,authenticated;

-- Qualified, minimal student listing. total_count is for UI pagination.
create function public.list_students(p_studio uuid,p_limit integer default 20,p_offset integer default 0,p_search text default null)
returns table(id uuid,student_id uuid,full_name text,email text,phone text,birthday date,notes text,is_active boolean,created_at timestamptz,total_count bigint)
language plpgsql stable security definer set search_path='' as $$
begin
 if not public.is_studio_admin(p_studio) then raise exception 'FORBIDDEN'; end if;
 if p_limit<1 or p_limit>100 or p_offset<0 or length(coalesce(p_search,''))>100 then raise exception 'INVALID_PAGINATION'; end if;
 return query select m.id,m.user_id,sd.full_name,p.email,sd.phone,sd.birthday,m.notes,m.is_active,m.created_at,count(*) over()
 from public.studio_memberships m join public.student_details sd on sd.membership_id=m.id and sd.studio_id=m.studio_id join public.profiles p on p.id=m.user_id
 where m.studio_id=p_studio and m.role='student' and (coalesce(p_search,'')='' or sd.full_name ilike '%'||p_search||'%' or p.email ilike '%'||p_search||'%')
 order by m.created_at desc,m.id limit p_limit offset p_offset;
end $$;
drop function public.update_student_profile(uuid,uuid,text,text,date);
create function public.update_student_profile(p_studio uuid,p_user uuid,p_name text,p_phone text,p_birthday date,p_notes text default null) returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.is_studio_admin(p_studio) then raise exception 'FORBIDDEN'; end if;
 if length(trim(coalesce(p_name,'')))=0 or length(p_name)>200 or length(coalesce(p_phone,''))>40 or length(coalesce(p_notes,''))>2000 then raise exception 'INVALID_PROFILE'; end if;
 update public.student_details set full_name=p_name,phone=p_phone,birthday=p_birthday where studio_id=p_studio and student_id=p_user;
 if not found then raise exception 'STUDENT_NOT_FOUND'; end if;
 update public.studio_memberships set notes=p_notes where studio_id=p_studio and user_id=p_user and role='student';
end $$;
create or replace function public.session_students(p_session uuid) returns table(booking_id uuid,student_id uuid,student_name text,booking_status text,attendance_status text) language plpgsql stable security definer set search_path='' as $$
declare s public.class_sessions;
begin
 select * into s from public.class_sessions where id=p_session;
 if not found or (not public.is_studio_admin(s.studio_id) and not public.is_session_teacher(s.id)) then raise exception 'FORBIDDEN_OR_NOT_FOUND'; end if;
 return query select b.id,b.student_id,coalesce(sd.full_name,p.full_name),b.status,coalesce(a.status,'unconfirmed') from public.bookings b join public.profiles p on p.id=b.student_id left join public.student_details sd on sd.studio_id=b.studio_id and sd.student_id=b.student_id left join public.attendance a on a.booking_id=b.id where b.session_id=p_session and b.status<>'cancelled' order by coalesce(sd.full_name,p.full_name),b.id;
end $$;
revoke all on function public.list_students(uuid,integer,integer,text),public.update_student_profile(uuid,uuid,text,text,date,text) from public,anon,authenticated;
grant execute on function public.list_students(uuid,integer,integer,text),public.update_student_profile(uuid,uuid,text,text,date,text) to authenticated;

-- Replacement functions keep V1 migration history and take effect on V1.1.
create or replace function public.validate_session() returns trigger language plpgsql security definer set search_path='' as $$
declare r public.rooms%rowtype; local_start timestamp; local_end timestamp; tz text; occupied integer;
begin
 if new.status='cancelled' then return new; end if;
 if new.booking_opens_at>new.starts_at or (new.cancellation_deadline is not null and new.cancellation_deadline>new.starts_at) then raise exception 'INVALID_BOOKING_WINDOW'; end if;
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
 if local_start::date<>local_end::date or not exists(select 1 from public.teacher_availability a where a.studio_id=new.studio_id and a.teacher_id=new.teacher_id and a.is_active and (a.branch_id is null or a.branch_id=new.branch_id) and a.weekday=extract(dow from local_start)::int and a.start_time<=local_start::time and a.end_time>=local_end::time) then raise exception 'OUTSIDE_TEACHER_AVAILABILITY'; end if;
 if exists(select 1 from public.teacher_time_off o where o.studio_id=new.studio_id and o.teacher_id=new.teacher_id and o.is_active and tstzrange(o.starts_at,o.ends_at,'[)') && tstzrange(new.starts_at,new.ends_at,'[)')) then raise exception 'TEACHER_TIME_OFF'; end if;
 if tg_op='UPDATE' then
   select count(*) into occupied from public.bookings where session_id=new.id and status in ('confirmed','completed','no_show');
   if new.capacity<occupied then raise exception 'CAPACITY_BELOW_BOOKINGS'; end if;
   if occupied>0 and (new.course_id<>old.course_id or new.starts_at<>old.starts_at or new.ends_at<>old.ends_at) then raise exception 'BOOKED_SESSION_CHANGE_REQUIRES_CANCELLATION'; end if;
   if new.teacher_id<>old.teacher_id and new.original_teacher_id is null then new.original_teacher_id=old.teacher_id; end if;
 end if;
 return new;
end $$;

create or replace function public.book_class_session(p_session uuid,p_key text) returns public.bookings language plpgsql security definer set search_path='' as $$
declare s public.class_sessions; sp public.student_packages; b public.bookings; cost int; cnt int; effective_capacity int; deadline timestamptz; request_key text;
begin
 if auth.uid() is null then raise exception 'UNAUTHENTICATED'; end if;
 if p_key is null or length(p_key)<8 or length(p_key)>120 then raise exception 'INVALID_REQUEST_KEY'; end if;
 request_key='book:'||auth.uid()::text||':'||p_key;
 select * into s from public.class_sessions where id=p_session for update;
 if not found then raise exception 'SESSION_NOT_FOUND'; end if;
 if not public.is_active_student(s.studio_id) or not exists(select 1 from public.studios where id=s.studio_id and is_active) then raise exception 'FORBIDDEN'; end if;
 select b2.* into b from public.credit_ledger l join public.bookings b2 on b2.id=l.booking_id where l.studio_id=s.studio_id and l.idempotency_key=request_key and l.student_id=auth.uid() and b2.session_id=s.id and l.entry_type='BOOKING_DEBIT';
 if found then return b; end if;
 if exists(select 1 from public.credit_ledger where studio_id=s.studio_id and idempotency_key=request_key) then raise exception 'DUPLICATE_REQUEST'; end if;
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
 select coalesce(s.cancellation_deadline,s.starts_at-make_interval(hours=>coalesce((select bs.cancellation_hours from public.booking_settings bs where bs.studio_id=s.studio_id),12))) into deadline;
 insert into public.bookings(studio_id,session_id,student_id,student_package_id,credits_charged,cancellation_deadline_at) values(s.studio_id,s.id,auth.uid(),sp.id,cost,deadline) returning * into b;
 update public.student_packages set balance=balance-cost where id=sp.id;
 insert into public.credit_ledger(studio_id,student_id,student_package_id,booking_id,entry_type,delta,operator_id,idempotency_key) values(s.studio_id,auth.uid(),sp.id,b.id,'BOOKING_DEBIT',-cost,auth.uid(),request_key);
 return b;
end $$;

create or replace function public.cancel_class_booking(p_booking uuid) returns public.bookings language plpgsql security definer set search_path='' as $$
declare b public.bookings; s public.class_sessions;
begin
 select * into b from public.bookings where id=p_booking;
 if not found then raise exception 'BOOKING_NOT_FOUND'; end if;
 select * into s from public.class_sessions where id=b.session_id for update;
 select * into b from public.bookings where id=p_booking for update;
 if auth.uid() is null or (b.student_id is distinct from auth.uid() and not public.is_studio_admin(b.studio_id)) then raise exception 'FORBIDDEN'; end if;
 if b.status<>'confirmed' then raise exception 'BOOKING_NOT_ACTIVE'; end if;
 if b.student_id=auth.uid() and now()>b.cancellation_deadline_at then raise exception 'CANCELLATION_DEADLINE_PASSED'; end if;
 if s.starts_at<=now() then raise exception 'SESSION_STARTED'; end if;
 perform 1 from public.student_packages where id=b.student_package_id for update;
 update public.bookings set status='cancelled',cancelled_at=now() where id=b.id returning * into b;
 update public.attendance set status='unconfirmed',marked_by=auth.uid() where booking_id=b.id;
 update public.student_packages set balance=balance+b.credits_charged where id=b.student_package_id;
 insert into public.credit_ledger(studio_id,student_id,student_package_id,booking_id,entry_type,delta,operator_id,idempotency_key) values(b.studio_id,b.student_id,b.student_package_id,b.id,'CANCELLATION_REFUND',b.credits_charged,auth.uid(),'refund:'||b.id::text);
 return b;
end $$;

create or replace function public.adjust_student_credits(p_student_package uuid,p_delta int,p_note text,p_key text) returns public.student_packages language plpgsql security definer set search_path='' as $$
declare sp public.student_packages; prior public.credit_ledger; request_key text;
begin
 select * into sp from public.student_packages where id=p_student_package for update;
 if not found or not public.is_studio_admin(sp.studio_id) then raise exception 'FORBIDDEN_OR_NOT_FOUND'; end if;
 if p_delta=0 or p_key is null or length(p_key)<8 or length(p_key)>120 or p_note is null or length(trim(p_note))=0 or length(p_note)>500 then raise exception 'INVALID_ADJUSTMENT'; end if;
 request_key='adjust:'||sp.id::text||':'||p_key;
 select * into prior from public.credit_ledger where studio_id=sp.studio_id and idempotency_key=request_key;
 if found then
  if prior.entry_type='MANUAL_ADJUSTMENT' and prior.student_package_id=sp.id and prior.delta=p_delta and prior.note=p_note and prior.operator_id=auth.uid() then return sp; end if;
  raise exception 'DUPLICATE_REQUEST';
 end if;
 if sp.balance+p_delta<0 then raise exception 'INSUFFICIENT_CREDITS'; end if;
 update public.student_packages set balance=balance+p_delta where id=sp.id returning * into sp;
 insert into public.credit_ledger(studio_id,student_id,student_package_id,entry_type,delta,operator_id,idempotency_key,note) values(sp.studio_id,sp.student_id,sp.id,'MANUAL_ADJUSTMENT',p_delta,auth.uid(),request_key,p_note);
 return sp;
end $$;

-- Ledger is append-only; errors are corrected with a compensating adjustment.
create function public.reject_ledger_mutation() returns trigger language plpgsql security definer set search_path='' as $$
begin raise exception 'LEDGER_IMMUTABLE'; end $$;
create trigger ledger_append_only before update or delete on public.credit_ledger for each row execute function public.reject_ledger_mutation();
revoke all on function public.reject_ledger_mutation() from public,anon,authenticated;

-- Administrators can enrol an existing Auth user in their own studio; no password is handled here.
create function public.enroll_student(p_studio uuid,p_student uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.is_studio_admin(p_studio) then raise exception 'FORBIDDEN'; end if;
 if not exists(select 1 from public.profiles where id=p_student) then raise exception 'STUDENT_NOT_FOUND'; end if;
 insert into public.studio_memberships(studio_id,user_id,role,is_active) values(p_studio,p_student,'student',true)
 on conflict(studio_id,user_id,role) do update set is_active=true;
end $$;
revoke all on function public.enroll_student(uuid,uuid) from public,anon,authenticated;
grant execute on function public.enroll_student(uuid,uuid) to authenticated;

-- Return the saved cancellation deadline in the student booking history.
drop function public.list_bookings(uuid,uuid);
create function public.list_bookings(p_studio uuid,p_student uuid default null) returns table(id uuid,studio_id uuid,student_id uuid,status text,credits_charged int,created_at timestamptz,cancelled_at timestamptz,cancellation_deadline_at timestamptz,class_sessions jsonb,attendance jsonb)
language sql stable security definer set search_path='' as $$
 select b.id,b.studio_id,b.student_id,b.status,b.credits_charged,b.created_at,b.cancelled_at,b.cancellation_deadline_at,
 jsonb_build_object('id',s.id,'starts_at',s.starts_at,'ends_at',s.ends_at,'status',s.status,'courses',jsonb_build_object('name',c.name),'branches',jsonb_build_object('name',br.name),'rooms',jsonb_build_object('name',r.name),'teachers',jsonb_build_object('name',t.name)),
 case when a.id is null or b.status='cancelled' then null else jsonb_build_object('status',a.status) end
 from public.bookings b join public.class_sessions s on s.id=b.session_id join public.courses c on c.id=s.course_id join public.branches br on br.id=s.branch_id join public.rooms r on r.id=s.room_id join public.teachers t on t.id=s.teacher_id left join public.attendance a on a.booking_id=b.id
 where b.studio_id=p_studio and (p_student is null or b.student_id=p_student) and auth.uid() is not null and (b.student_id=auth.uid() or public.is_studio_admin(b.studio_id) or public.is_session_teacher(b.session_id)) order by b.created_at desc limit 200
$$;
revoke all on function public.list_bookings(uuid,uuid) from public,anon,authenticated;
grant execute on function public.list_bookings(uuid,uuid) to authenticated;

-- Staff can inspect teaching records; teachers see only their own sessions.
create function public.teaching_records(p_studio uuid,p_from timestamptz,p_to timestamptz)
returns table(session_id uuid,branch_name text,room_name text,course_name text,teacher_name text,starts_at timestamptz,ends_at timestamptz,status text,duration_minutes numeric,booking_count bigint,attendance_count bigint)
language plpgsql stable security definer set search_path='' as $$
begin
 if not public.is_studio_admin(p_studio) and not exists(select 1 from public.studio_memberships m where m.studio_id=p_studio and m.user_id=auth.uid() and m.role='teacher' and m.is_active) then raise exception 'FORBIDDEN'; end if;
 if p_from is null or p_to is null or p_to<=p_from or p_to>p_from+interval '366 days' then raise exception 'INVALID_DATE_RANGE'; end if;
 return query select s.id,br.name,r.name,c.name,t.name,s.starts_at,s.ends_at,s.status,extract(epoch from (s.ends_at-s.starts_at))/60,
 (select count(*) from public.bookings b where b.session_id=s.id and b.status<>'cancelled'),
 (select count(*) from public.bookings b join public.attendance a on a.booking_id=b.id where b.session_id=s.id and b.status<>'cancelled' and a.status='present')
 from public.class_sessions s join public.branches br on br.id=s.branch_id join public.rooms r on r.id=s.room_id join public.courses c on c.id=s.course_id join public.teachers t on t.id=s.teacher_id
 where s.studio_id=p_studio and s.starts_at>=p_from and s.starts_at<p_to and (public.is_studio_admin(p_studio) or public.is_session_teacher(s.id))
 order by s.starts_at,s.id limit 1000;
end $$;
revoke all on function public.teaching_records(uuid,timestamptz,timestamptz) from public,anon,authenticated;
grant execute on function public.teaching_records(uuid,timestamptz,timestamptz) to authenticated;

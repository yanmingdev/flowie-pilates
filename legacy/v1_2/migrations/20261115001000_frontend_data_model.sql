-- V1.2: data needed by the reference UI, scoped to each studio and user.
alter table public.site_settings add column brand_tagline text not null default 'Find Your Flow.';

create table public.room_availability (
 id uuid primary key default gen_random_uuid(),
 studio_id uuid not null references public.studios(id),
 room_id uuid not null,
 weekday integer not null check(weekday between 0 and 6),
 start_time time not null,
 end_time time not null,
 is_active boolean not null default true,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 check(start_time < end_time),
 unique(studio_id,room_id,weekday,start_time,end_time),
 foreign key(studio_id,room_id) references public.rooms(studio_id,id)
);
create index room_availability_lookup_idx on public.room_availability(studio_id,room_id,weekday) where is_active;
create trigger set_updated_at before update on public.room_availability for each row execute function public.touch_updated_at();
create trigger audit_change after insert or update or delete on public.room_availability for each row execute function public.audit_change();
alter table public.room_availability enable row level security;
revoke all on public.room_availability from public,anon,authenticated;
grant select,insert,update on public.room_availability to authenticated;
create policy room_availability_admin on public.room_availability for all to authenticated using(public.is_studio_admin(studio_id)) with check(public.is_studio_admin(studio_id));

-- No active windows means no configured restriction. Existing sessions are not rewritten.
create function public.validate_room_window() returns trigger language plpgsql security definer set search_path='' as $$
declare tz text; local_start timestamp; local_end timestamp;
begin
 if new.status='cancelled' then return new; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('room-window:'||new.room_id::text,0));
 select b.timezone into tz from public.branches b where b.id=new.branch_id and b.studio_id=new.studio_id;
 local_start=pg_catalog.timezone(tz,new.starts_at); local_end=pg_catalog.timezone(tz,new.ends_at);
 if exists(select 1 from public.room_availability a where a.studio_id=new.studio_id and a.room_id=new.room_id and a.is_active)
    and not exists(select 1 from public.room_availability a where a.studio_id=new.studio_id and a.room_id=new.room_id and a.is_active and a.weekday=extract(dow from local_start)::int and local_start::date=local_end::date and a.start_time<=local_start::time and a.end_time>=local_end::time)
 then raise exception 'OUTSIDE_ROOM_AVAILABILITY'; end if;
 return new;
end $$;
create trigger validate_room_window before insert or update on public.class_sessions for each row execute function public.validate_room_window();
revoke all on function public.validate_room_window() from public,anon,authenticated;

create function public.lock_room_window() returns trigger language plpgsql security definer set search_path='' as $$
begin
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('room-window:'||new.room_id::text,0));
 return new;
end $$;
create trigger lock_room_window before insert or update on public.room_availability for each row execute function public.lock_room_window();
revoke all on function public.lock_room_window() from public,anon,authenticated;

-- One favorite is a relationship between a student, studio, and course; no duplicated course fields.
create table public.course_favorites (
 id uuid primary key default gen_random_uuid(),
 studio_id uuid not null references public.studios(id),
 student_id uuid not null references public.profiles(id),
 course_id uuid not null,
 created_at timestamptz not null default now(),
 unique(studio_id,student_id,course_id),
 foreign key(studio_id,student_id) references public.student_details(studio_id,student_id),
 foreign key(studio_id,course_id) references public.courses(studio_id,id)
);
create index course_favorites_student_idx on public.course_favorites(studio_id,student_id,created_at desc);
alter table public.course_favorites enable row level security;
revoke all on public.course_favorites from public,anon,authenticated;
grant select on public.course_favorites to authenticated;
create policy favorite_read_own on public.course_favorites for select to authenticated using(student_id=(select auth.uid()));
create function public.set_course_favorite(p_studio uuid,p_course uuid,p_favorite boolean) returns boolean language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'UNAUTHENTICATED'; end if;
 if p_favorite is null then raise exception 'INVALID_FAVORITE'; end if;
 if p_favorite then
  if not public.is_active_student(p_studio) or not exists(select 1 from public.studios st join public.courses c on c.studio_id=st.id where st.id=p_studio and st.is_active and c.id=p_course and c.is_active) then raise exception 'FORBIDDEN_OR_NOT_FOUND'; end if;
  insert into public.course_favorites(studio_id,student_id,course_id) values(p_studio,auth.uid(),p_course) on conflict(studio_id,student_id,course_id) do nothing;
 else
  delete from public.course_favorites where studio_id=p_studio and student_id=auth.uid() and course_id=p_course;
 end if;
 return p_favorite;
end $$;
create function public.favorite_courses(p_studio uuid) returns table(id uuid,course_id uuid,course_name text,image_url text,description text,difficulty text,duration_minutes int,credit_cost int,is_active boolean,created_at timestamptz)
language sql stable security definer set search_path='' as $$
 select f.id,c.id,c.name,c.image_url,c.description,c.difficulty,c.duration_minutes,c.credit_cost,c.is_active,f.created_at
 from public.course_favorites f join public.courses c on c.studio_id=f.studio_id and c.id=f.course_id
 where f.studio_id=p_studio and f.student_id=(select auth.uid()) order by f.created_at desc,f.id
$$;
revoke all on function public.set_course_favorite(uuid,uuid,boolean),public.favorite_courses(uuid) from public,anon,authenticated;
grant execute on function public.set_course_favorite(uuid,uuid,boolean),public.favorite_courses(uuid) to authenticated;

-- Course description and duration are supplied from the database to the detail dialog.
drop function public.session_catalog(uuid,timestamptz,timestamptz);
create function public.session_catalog(p_studio uuid,p_from timestamptz,p_to timestamptz)
returns table(id uuid,studio_id uuid,branch_id uuid,branch_name text,room_id uuid,room_name text,course_id uuid,course_name text,course_image text,course_description text,duration_minutes int,difficulty text,category_id uuid,teacher_id uuid,teacher_name text,teacher_photo text,starts_at timestamptz,ends_at timestamptz,capacity int,booked_count bigint,credit_cost int,booking_opens_at timestamptz,cancellation_deadline timestamptz,status text)
language plpgsql stable security definer set search_path='' as $$
begin
 if p_from is null or p_to is null or p_to<=p_from or p_to>p_from+interval '180 days' then raise exception 'INVALID_DATE_RANGE'; end if;
 return query select s.id,s.studio_id,br.id,br.name,r.id,r.name,c.id,c.name,c.image_url,c.description,c.duration_minutes,c.difficulty,c.category_id,t.id,t.name,t.photo_url,s.starts_at,s.ends_at,least(s.capacity,r.capacity),
 (select count(*) from public.bookings b where b.session_id=s.id and b.status in ('confirmed','completed','no_show')),c.credit_cost,s.booking_opens_at,s.cancellation_deadline,s.status
 from public.class_sessions s join public.studios st on st.id=s.studio_id join public.branches br on br.id=s.branch_id join public.rooms r on r.id=s.room_id join public.courses c on c.id=s.course_id join public.teachers t on t.id=s.teacher_id
 where s.studio_id=p_studio and st.is_active and br.is_active and r.is_active and c.is_active and t.is_active and s.status='scheduled' and s.starts_at>=p_from and s.starts_at<p_to order by s.starts_at,s.id;
end $$;
revoke all on function public.session_catalog(uuid,timestamptz,timestamptz) from public,anon,authenticated;
grant execute on function public.session_catalog(uuid,timestamptz,timestamptz) to anon,authenticated;

-- Counts and rates have explicit denominators; an undefined denominator returns NULL.
create function public.business_metrics(p_studio uuid,p_from timestamptz,p_to timestamptz,p_branch uuid default null,p_status text default null)
returns table(teacher_session_count bigint,booking_rate numeric,attendance_rate numeric,cancellation_rate numeric,room_utilization_rate numeric,available_minutes numeric,used_minutes numeric)
language plpgsql stable security definer set search_path='' as $$
begin
 if not public.is_studio_admin(p_studio) then raise exception 'FORBIDDEN'; end if;
 if p_from is null or p_to is null or p_to<=p_from or p_to>p_from+interval '366 days' then raise exception 'INVALID_DATE_RANGE'; end if;
 if p_status is not null and p_status not in ('scheduled','cancelled','completed') then raise exception 'INVALID_STATUS'; end if;
 return query
 with selected_rooms as (
  select r.id,br.timezone from public.rooms r join public.branches br on br.id=r.branch_id and br.studio_id=r.studio_id
  where r.studio_id=p_studio and r.is_active and br.is_active and (p_branch is null or r.branch_id=p_branch)
 ),
 room_configuration as (
  select count(*)::bigint room_count,count(*) filter(where not exists(select 1 from public.room_availability a where a.studio_id=p_studio and a.room_id=r.id and a.is_active))::bigint missing_count from selected_rooms r
 ),
 window_bounds as (
  select r.id room_id,greatest(p_from,pg_catalog.timezone(r.timezone,d.day::date+a.start_time)) lo,
         least(p_to,pg_catalog.timezone(r.timezone,d.day::date+a.end_time)) hi
  from selected_rooms r join public.room_availability a on a.room_id=r.id and a.studio_id=p_studio and a.is_active
  cross join lateral generate_series((p_from at time zone r.timezone)::date::timestamp,(p_to at time zone r.timezone)::date::timestamp,interval '1 day') d(day)
  where a.weekday=extract(dow from d.day)::int
 ),
 merged_windows as (
  select w.room_id,range_agg(tstzrange(w.lo,w.hi,'[)')) windows from window_bounds w where w.lo<w.hi group by w.room_id
 ),
 windows as (
  select m.room_id,x.window_range from merged_windows m cross join lateral unnest(m.windows) x(window_range)
 ),
 availability as (
  select coalesce(sum(extract(epoch from upper(w.window_range)-lower(w.window_range))/60),0) minutes from windows w
 ),
 usage_time as (
  select coalesce(sum(extract(epoch from upper(w.window_range*tstzrange(s.starts_at,s.ends_at,'[)'))-lower(w.window_range*tstzrange(s.starts_at,s.ends_at,'[)')))/60),0) minutes
  from windows w join public.class_sessions s on s.room_id=w.room_id and s.studio_id=p_studio and s.status<>'cancelled' and (p_status is null or s.status=p_status)
  where w.window_range && tstzrange(s.starts_at,s.ends_at,'[)')
 ),
 sessions as (
  select s.id,s.status,least(s.capacity,r.capacity) capacity from public.class_sessions s join public.rooms r on r.id=s.room_id and r.studio_id=s.studio_id
  where s.studio_id=p_studio and s.starts_at>=p_from and s.starts_at<p_to and (p_branch is null or s.branch_id=p_branch) and (p_status is null or s.status=p_status)
 ),
 session_totals as (
  select count(*) filter(where s.status<>'cancelled')::bigint session_count,coalesce(sum(s.capacity) filter(where s.status<>'cancelled'),0)::bigint total_seats from sessions s
 ),
 booking_totals as (
  select count(*) filter(where b.status<>'cancelled' and s.status<>'cancelled')::bigint active_bookings,
         count(*)::bigint all_bookings,count(*) filter(where b.status='cancelled')::bigint cancelled_bookings,
         count(*) filter(where b.status<>'cancelled' and a.status='present')::bigint present_count,
         count(*) filter(where b.status<>'cancelled' and a.status in ('present','absent'))::bigint marked_count
  from sessions s join public.bookings b on b.session_id=s.id left join public.attendance a on a.booking_id=b.id
 )
 select st.session_count,
   round(bt.active_bookings*100.0/nullif(st.total_seats,0),2),
   round(bt.present_count*100.0/nullif(bt.marked_count,0),2),
   round(bt.cancelled_bookings*100.0/nullif(bt.all_bookings,0),2),
   case when rc.room_count=0 or rc.missing_count>0 then null else round(ut.minutes*100.0/nullif(av.minutes,0),2) end,
   case when rc.room_count=0 or rc.missing_count>0 then null else av.minutes end,
   case when rc.room_count=0 or rc.missing_count>0 then null else ut.minutes end
 from session_totals st cross join booking_totals bt cross join room_configuration rc cross join availability av cross join usage_time ut;
end $$;
revoke all on function public.business_metrics(uuid,timestamptz,timestamptz,uuid,text) from public,anon,authenticated;
grant execute on function public.business_metrics(uuid,timestamptz,timestamptz,uuid,text) to authenticated;

-- V1.2: a configurable per-session booking deadline, enforced atomically by PostgreSQL.
alter table public.class_sessions add column booking_closes_at timestamptz;
alter table public.class_sessions add constraint session_booking_window_check
 check (booking_closes_at is null or (booking_closes_at <= starts_at and booking_closes_at >= booking_opens_at));

-- Existing idempotent requests return before insert. A new confirmed booking must not be late.
create function public.enforce_booking_deadline() returns trigger language plpgsql security definer set search_path='' as $$
declare closes_at timestamptz;
begin
 if new.status='confirmed' then
  select s.booking_closes_at into closes_at from public.class_sessions s where s.id=new.session_id and s.studio_id=new.studio_id;
  if closes_at is not null and pg_catalog.clock_timestamp() >= closes_at then raise exception 'BOOKING_CLOSED'; end if;
 end if;
 return new;
end $$;
create trigger enforce_booking_deadline before insert on public.bookings for each row execute function public.enforce_booking_deadline();
revoke all on function public.enforce_booking_deadline() from public,anon,authenticated;

-- These extended management RPCs preserve the original RPCs for migration compatibility.
create function public.schedule_class_sessions_with_deadline(p_studio uuid,p_branch uuid,p_room uuid,p_course uuid,p_teacher uuid,p_starts timestamptz,p_ends timestamptz,p_capacity int,p_opens timestamptz,p_cancel_deadline timestamptz,p_repeat_until date default null,p_closes timestamptz default null) returns setof public.class_sessions language plpgsql security definer set search_path='' as $$
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
   insert into public.class_sessions(studio_id,branch_id,room_id,course_id,teacher_id,starts_at,ends_at,capacity,booking_opens_at,booking_closes_at,cancellation_deadline,schedule_rule_id)
   values(p_studio,p_branch,p_room,p_course,p_teacher,occurrence_start,occurrence_end,p_capacity,coalesce(p_opens+(occurrence_start-p_starts),now()),case when p_closes is null then null else p_closes+(occurrence_start-p_starts) end,case when p_cancel_deadline is null then null else p_cancel_deadline+(occurrence_start-p_starts) end,rule_id)
   returning * into row;
   return next row;
 end loop;
end $$;

create function public.update_class_session_with_deadline(p_session uuid,p_branch uuid,p_room uuid,p_course uuid,p_teacher uuid,p_starts timestamptz,p_ends timestamptz,p_capacity int,p_opens timestamptz,p_cancel_deadline timestamptz,p_closes timestamptz default null) returns public.class_sessions language plpgsql security definer set search_path='' as $$
declare s public.class_sessions;
begin
 select * into s from public.class_sessions where id=p_session for update;
 if not found or not public.is_studio_admin(s.studio_id) then raise exception 'FORBIDDEN_OR_NOT_FOUND'; end if;
 if s.status<>'scheduled' or s.starts_at<=now() or p_starts<=now() or p_ends<=p_starts then raise exception 'INVALID_INTERVAL_OR_STATUS'; end if;
 update public.class_sessions set branch_id=p_branch,room_id=p_room,course_id=p_course,teacher_id=p_teacher,starts_at=p_starts,ends_at=p_ends,capacity=p_capacity,booking_opens_at=coalesce(p_opens,s.booking_opens_at),booking_closes_at=p_closes,cancellation_deadline=p_cancel_deadline where id=p_session returning * into s;
 return s;
end $$;

create function public.update_future_sessions_with_deadline(p_session uuid,p_branch uuid,p_room uuid,p_course uuid,p_teacher uuid,p_starts timestamptz,p_ends timestamptz,p_capacity int,p_opens timestamptz,p_cancel_deadline timestamptz,p_closes timestamptz default null) returns setof public.class_sessions language plpgsql security definer set search_path='' as $$
declare base public.class_sessions; item public.class_sessions; changed public.class_sessions; delta interval;
begin
 select * into base from public.class_sessions where id=p_session for update;
 if not found or not public.is_studio_admin(base.studio_id) then raise exception 'FORBIDDEN_OR_NOT_FOUND'; end if;
 if base.schedule_rule_id is null or base.status<>'scheduled' or base.starts_at<=now() or p_starts<=now() or p_ends<=p_starts then raise exception 'INVALID_INTERVAL_OR_STATUS'; end if;
 delta=p_starts-base.starts_at;
 for item in select * from public.class_sessions where studio_id=base.studio_id and schedule_rule_id=base.schedule_rule_id and status='scheduled' and starts_at>=base.starts_at order by starts_at,id for update loop
   update public.class_sessions set branch_id=p_branch,room_id=p_room,course_id=p_course,teacher_id=p_teacher,starts_at=item.starts_at+delta,ends_at=item.starts_at+delta+(p_ends-p_starts),capacity=p_capacity,
   booking_opens_at=case when p_opens is null then item.booking_opens_at else p_opens+(item.starts_at-base.starts_at) end,
   booking_closes_at=case when p_closes is null then null else p_closes+(item.starts_at-base.starts_at) end,
   cancellation_deadline=case when p_cancel_deadline is null then null else p_cancel_deadline+(item.starts_at-base.starts_at) end where id=item.id returning * into changed;
   return next changed;
 end loop;
end $$;
revoke all on function public.schedule_class_sessions_with_deadline(uuid,uuid,uuid,uuid,uuid,timestamptz,timestamptz,int,timestamptz,timestamptz,date,timestamptz),public.update_class_session_with_deadline(uuid,uuid,uuid,uuid,uuid,timestamptz,timestamptz,int,timestamptz,timestamptz,timestamptz),public.update_future_sessions_with_deadline(uuid,uuid,uuid,uuid,uuid,timestamptz,timestamptz,int,timestamptz,timestamptz,timestamptz) from public,anon,authenticated;
grant execute on function public.schedule_class_sessions_with_deadline(uuid,uuid,uuid,uuid,uuid,timestamptz,timestamptz,int,timestamptz,timestamptz,date,timestamptz),public.update_class_session_with_deadline(uuid,uuid,uuid,uuid,uuid,timestamptz,timestamptz,int,timestamptz,timestamptz,timestamptz),public.update_future_sessions_with_deadline(uuid,uuid,uuid,uuid,uuid,timestamptz,timestamptz,int,timestamptz,timestamptz,timestamptz) to authenticated;

drop function public.session_catalog(uuid,timestamptz,timestamptz);
create function public.session_catalog(p_studio uuid,p_from timestamptz,p_to timestamptz)
returns table(id uuid,studio_id uuid,branch_id uuid,branch_name text,room_id uuid,room_name text,course_id uuid,course_name text,course_image text,course_description text,duration_minutes int,difficulty text,category_id uuid,teacher_id uuid,teacher_name text,teacher_photo text,starts_at timestamptz,ends_at timestamptz,capacity int,booked_count bigint,credit_cost int,booking_opens_at timestamptz,booking_closes_at timestamptz,cancellation_deadline timestamptz,status text)
language plpgsql stable security definer set search_path='' as $$
begin
 if p_from is null or p_to is null or p_to<=p_from or p_to>p_from+interval '180 days' then raise exception 'INVALID_DATE_RANGE'; end if;
 return query select s.id,s.studio_id,br.id,br.name,r.id,r.name,c.id,c.name,c.image_url,c.description,c.duration_minutes,c.difficulty,c.category_id,t.id,t.name,t.photo_url,s.starts_at,s.ends_at,least(s.capacity,r.capacity),
 (select count(*) from public.bookings b where b.session_id=s.id and b.status in ('confirmed','completed','no_show')),c.credit_cost,s.booking_opens_at,s.booking_closes_at,s.cancellation_deadline,s.status
 from public.class_sessions s join public.studios st on st.id=s.studio_id join public.branches br on br.id=s.branch_id join public.rooms r on r.id=s.room_id join public.courses c on c.id=s.course_id join public.teachers t on t.id=s.teacher_id
 where s.studio_id=p_studio and st.is_active and br.is_active and r.is_active and c.is_active and t.is_active and s.status='scheduled' and s.starts_at>=p_from and s.starts_at<p_to order by s.starts_at,s.id;
end $$;
revoke all on function public.session_catalog(uuid,timestamptz,timestamptz) from public,anon,authenticated;
grant execute on function public.session_catalog(uuid,timestamptz,timestamptz) to anon,authenticated;

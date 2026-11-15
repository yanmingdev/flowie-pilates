-- Flowie V1.2 fresh-install bundle: schema followed by demo INSERTs.
-- Run this OR 01 + 02, never both. Two transactions: if seed fails, schema remains installed.

-- Flowie V1.2 installation for a NEW, EMPTY Supabase test project only.
-- Generated from supabase/migrations by npm run db:sql. Do not combine this
-- with a CLI migration install or run it against an existing application database.
-- This transaction fails before writing if a Flowie table or bucket already exists.
begin;
do $$
declare found_tables text;
begin
 select string_agg(c.relname, ', ' order by c.relname) into found_tables
 from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace
 where n.nspname='public' and c.relkind in ('r','p','v','m','f') and c.relname=any(array['profiles','platform_admins','studios','studio_memberships','branches','rooms','teachers','course_categories','courses','teacher_branches','teacher_courses','teacher_availability','teacher_time_off','schedule_rules','class_sessions','course_packages','package_courses','student_packages','bookings','credit_ledger','attendance','site_settings','homepage_sections','banners','booking_settings','announcements','audit_logs','student_details','room_availability','course_favorites']);
 if found_tables is not null then raise exception 'FLOWIE_EXISTING_TABLES: %',found_tables; end if;
 if exists(select 1 from storage.buckets where id='studio-public') then raise exception 'FLOWIE_EXISTING_BUCKET: studio-public'; end if;
end $$;

-- ===== 20261114000100_core.sql =====
-- Flowie V1. Schema changes belong in migrations, not the dashboard.
create extension if not exists pgcrypto with schema extensions;
create extension if not exists btree_gist with schema extensions;
set search_path = public, extensions;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '', email text, phone text, birthday date,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.platform_admins (
  user_id uuid primary key references public.profiles(id), created_at timestamptz not null default now()
);
create table public.studios (
  id uuid primary key default gen_random_uuid(), name text not null, slug text not null unique,
  description text, logo_url text, is_active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.studio_memberships (
  id uuid primary key default gen_random_uuid(), studio_id uuid not null references public.studios(id),
  user_id uuid not null references public.profiles(id), role text not null check(role in ('admin','teacher','student')),
  is_active boolean not null default true, notes text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(studio_id,user_id,role), unique(studio_id,id)
);
create table public.branches (
 id uuid primary key default gen_random_uuid(), studio_id uuid not null references public.studios(id),
 name text not null, address text, phone text, email text, opening_hours text, description text,
 timezone text not null default 'Asia/Taipei', is_active boolean not null default true,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(studio_id,id), unique(studio_id,name)
);
create table public.rooms (
 id uuid primary key default gen_random_uuid(), studio_id uuid not null references public.studios(id),
 branch_id uuid not null, name text not null, capacity integer not null check(capacity > 0),
 description text, facilities text, is_active boolean not null default true,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(studio_id,id), unique(studio_id,branch_id,name),
 foreign key(studio_id,branch_id) references public.branches(studio_id,id)
);
create table public.teachers (
 id uuid primary key default gen_random_uuid(), studio_id uuid not null references public.studios(id),
 profile_id uuid references public.profiles(id), name text not null, email text, phone text,
 photo_url text, specialty text, bio text, is_active boolean not null default true,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(studio_id,id), unique(studio_id,profile_id)
);
create table public.course_categories (
 id uuid primary key default gen_random_uuid(), studio_id uuid not null references public.studios(id),
 name text not null, sort_order integer not null default 0, is_active boolean not null default true,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(studio_id,id), unique(studio_id,name)
);
create table public.courses (
 id uuid primary key default gen_random_uuid(), studio_id uuid not null references public.studios(id), category_id uuid,
 name text not null, description text, image_url text, duration_minutes integer not null check(duration_minutes > 0),
 difficulty text not null default '入門', default_capacity integer not null check(default_capacity > 0),
 credit_cost integer not null default 1 check(credit_cost > 0), is_active boolean not null default true,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(studio_id,id), foreign key(studio_id,category_id) references public.course_categories(studio_id,id)
);
create table public.teacher_branches (
 id uuid primary key default gen_random_uuid(), studio_id uuid not null references public.studios(id), teacher_id uuid not null, branch_id uuid not null,
 created_at timestamptz not null default now(), unique(studio_id,teacher_id,branch_id),
 foreign key(studio_id,teacher_id) references public.teachers(studio_id,id), foreign key(studio_id,branch_id) references public.branches(studio_id,id)
);
create table public.teacher_courses (
 id uuid primary key default gen_random_uuid(), studio_id uuid not null references public.studios(id), teacher_id uuid not null, course_id uuid not null,
 created_at timestamptz not null default now(), unique(studio_id,teacher_id,course_id),
 foreign key(studio_id,teacher_id) references public.teachers(studio_id,id), foreign key(studio_id,course_id) references public.courses(studio_id,id)
);
create table public.teacher_availability (
 id uuid primary key default gen_random_uuid(), studio_id uuid not null references public.studios(id), teacher_id uuid not null,
 weekday integer not null check(weekday between 0 and 6), start_time time not null, end_time time not null,
 is_active boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check(start_time < end_time), foreign key(studio_id,teacher_id) references public.teachers(studio_id,id)
);
create table public.teacher_time_off (
 id uuid primary key default gen_random_uuid(), studio_id uuid not null references public.studios(id), teacher_id uuid not null,
 starts_at timestamptz not null, ends_at timestamptz not null, reason text, is_active boolean not null default true,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check(starts_at < ends_at), foreign key(studio_id,teacher_id) references public.teachers(studio_id,id)
);
create table public.schedule_rules (
 id uuid primary key default gen_random_uuid(), studio_id uuid not null references public.studios(id),
 frequency text not null check(frequency in ('once','weekly')), until_date date, is_active boolean not null default true,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(studio_id,id)
);
create table public.class_sessions (
 id uuid primary key default gen_random_uuid(), studio_id uuid not null references public.studios(id),
 branch_id uuid not null, room_id uuid not null, course_id uuid not null, teacher_id uuid not null,
 original_teacher_id uuid, schedule_rule_id uuid, starts_at timestamptz not null, ends_at timestamptz not null,
 capacity integer not null check(capacity > 0), booking_opens_at timestamptz not null default now(), cancellation_deadline timestamptz,
 status text not null default 'scheduled' check(status in ('scheduled','cancelled','completed')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(studio_id,id), check(starts_at < ends_at),
 foreign key(studio_id,branch_id) references public.branches(studio_id,id),
 foreign key(studio_id,room_id) references public.rooms(studio_id,id),
 foreign key(studio_id,course_id) references public.courses(studio_id,id),
 foreign key(studio_id,teacher_id) references public.teachers(studio_id,id),
 foreign key(studio_id,original_teacher_id) references public.teachers(studio_id,id),
 foreign key(studio_id,schedule_rule_id) references public.schedule_rules(studio_id,id),
 exclude using gist (room_id with =, tstzrange(starts_at,ends_at,'[)') with &&) where (status <> 'cancelled'),
 exclude using gist (teacher_id with =, tstzrange(starts_at,ends_at,'[)') with &&) where (status <> 'cancelled')
);
create table public.course_packages (
 id uuid primary key default gen_random_uuid(), studio_id uuid not null references public.studios(id), name text not null,
 total_credits integer not null check(total_credits > 0), validity_days integer not null check(validity_days > 0),
 price numeric(10,2) check(price >= 0), notes text, applies_to_all boolean not null default true, is_active boolean not null default true,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(studio_id,id)
);
create table public.package_courses (
 id uuid primary key default gen_random_uuid(), studio_id uuid not null references public.studios(id), package_id uuid not null, course_id uuid not null,
 created_at timestamptz not null default now(), unique(studio_id,package_id,course_id),
 foreign key(studio_id,package_id) references public.course_packages(studio_id,id), foreign key(studio_id,course_id) references public.courses(studio_id,id)
);
create table public.student_packages (
 id uuid primary key default gen_random_uuid(), studio_id uuid not null references public.studios(id), student_id uuid not null references public.profiles(id),
 package_id uuid not null, starts_at timestamptz not null default now(), expires_at timestamptz not null,
 granted_credits integer not null check(granted_credits > 0), balance integer not null check(balance >= 0),
 status text not null default 'active' check(status in ('active','inactive','expired')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(studio_id,id), check(starts_at < expires_at), foreign key(studio_id,package_id) references public.course_packages(studio_id,id)
);
create table public.bookings (
 id uuid primary key default gen_random_uuid(), studio_id uuid not null references public.studios(id),
 session_id uuid not null, student_id uuid not null references public.profiles(id), student_package_id uuid not null,
 credits_charged integer not null check(credits_charged > 0), status text not null default 'confirmed' check(status in ('confirmed','cancelled','completed','no_show')),
 cancelled_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(studio_id,id), foreign key(studio_id,session_id) references public.class_sessions(studio_id,id),
 foreign key(studio_id,student_package_id) references public.student_packages(studio_id,id)
);
create unique index bookings_active_unique on public.bookings(session_id,student_id) where status in ('confirmed','completed','no_show');
create table public.credit_ledger (
 id uuid primary key default gen_random_uuid(), studio_id uuid not null references public.studios(id), student_id uuid not null references public.profiles(id),
 student_package_id uuid not null, booking_id uuid, entry_type text not null check(entry_type in ('GRANT','BOOKING_DEBIT','CANCELLATION_REFUND','MANUAL_ADJUSTMENT','EXPIRATION')),
 delta integer not null check(delta <> 0), operator_id uuid references public.profiles(id), idempotency_key text not null,
 note text, created_at timestamptz not null default now(), unique(studio_id,idempotency_key),
 foreign key(studio_id,student_package_id) references public.student_packages(studio_id,id), foreign key(studio_id,booking_id) references public.bookings(studio_id,id)
);
create unique index one_booking_debit on public.credit_ledger(booking_id) where entry_type='BOOKING_DEBIT';
create unique index one_booking_refund on public.credit_ledger(booking_id) where entry_type='CANCELLATION_REFUND';
create table public.attendance (
 id uuid primary key default gen_random_uuid(), studio_id uuid not null references public.studios(id), booking_id uuid not null unique,
 status text not null check(status in ('present','absent','unconfirmed')), marked_by uuid references public.profiles(id),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 foreign key(studio_id,booking_id) references public.bookings(studio_id,id)
);
create table public.site_settings (
 id uuid primary key default gen_random_uuid(), studio_id uuid not null unique references public.studios(id),
 headline text not null default '找到屬於自己的節奏。', subheadline text not null default '從呼吸開始，與更好的自己相遇。',
 contact_email text, contact_phone text, address text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.homepage_sections (
 id uuid primary key default gen_random_uuid(), studio_id uuid not null references public.studios(id),
 section_type text not null check(section_type in ('hero','courses','teachers','announcements','quick_booking')),
 title text, subtitle text, image_url text, link_url text, sort_order integer not null default 0, is_active boolean not null default true,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(studio_id,section_type)
);
create table public.banners (
 id uuid primary key default gen_random_uuid(), studio_id uuid not null references public.studios(id), title text not null,
 subtitle text, image_url text, link_url text, sort_order integer not null default 0, is_active boolean not null default true,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.booking_settings (
 id uuid primary key default gen_random_uuid(), studio_id uuid not null unique references public.studios(id),
 cancellation_hours integer not null default 12 check(cancellation_hours >= 0),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.announcements (
 id uuid primary key default gen_random_uuid(), studio_id uuid not null references public.studios(id), title text not null, content text not null,
 starts_at timestamptz, ends_at timestamptz, is_active boolean not null default true,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), check(ends_at is null or starts_at is null or starts_at < ends_at)
);
create table public.audit_logs (
 id uuid primary key default gen_random_uuid(), studio_id uuid not null references public.studios(id),
 actor_id uuid references public.profiles(id), table_name text not null, record_id uuid not null, action text not null,
 before_data jsonb, after_data jsonb, created_at timestamptz not null default now()
);
create index memberships_user_idx on public.studio_memberships(user_id,studio_id) where is_active;
create index sessions_studio_start_idx on public.class_sessions(studio_id,starts_at);
create index bookings_student_idx on public.bookings(studio_id,student_id,created_at desc);
create index ledger_student_idx on public.credit_ledger(studio_id,student_id,created_at desc);
create index packages_student_idx on public.student_packages(studio_id,student_id,expires_at);
create index audit_studio_idx on public.audit_logs(studio_id,created_at desc);

create function public.touch_updated_at() returns trigger language plpgsql set search_path='' as $$
begin new.updated_at=now(); return new; end $$;
do $$ declare t text; begin
 foreach t in array array['profiles','studios','studio_memberships','branches','rooms','teachers','course_categories','courses','teacher_availability','teacher_time_off','schedule_rules','class_sessions','course_packages','student_packages','bookings','attendance','site_settings','homepage_sections','banners','booking_settings','announcements'] loop
 execute format('create trigger set_updated_at before update on public.%I for each row execute function public.touch_updated_at()',t);
 end loop;
end $$;
create function public.handle_new_user() returns trigger language plpgsql security definer set search_path='' as $$
begin insert into public.profiles(id,full_name,email) values(new.id,coalesce(new.raw_user_meta_data->>'full_name',''),new.email); return new; end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();


-- ===== 20261114000200_security.sql =====
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


-- ===== 20261114000300_transactions.sql =====
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


-- ===== 20261114000400_management.sql =====
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


-- ===== 20261114000500_platform.sql =====
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


-- ===== 20261114000600_teacher_membership.sql =====
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


-- ===== 20261114000700_room_capacity.sql =====
-- A room can be resized without rewriting historical sessions. The catalog and
-- booking transaction use the smaller of room capacity and session capacity.
create function public.validate_room_capacity() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.capacity<old.capacity and exists(
   select s.id from public.class_sessions s join public.bookings b on b.session_id=s.id and b.status in ('confirmed','completed','no_show')
   where s.room_id=new.id and s.studio_id=new.studio_id and s.status='scheduled' and s.starts_at>now()
   group by s.id having count(*)>new.capacity
 ) then raise exception 'ROOM_CAPACITY_BELOW_BOOKINGS'; end if;
 return new;
end $$;
create trigger validate_room_capacity before update of capacity on public.rooms for each row execute function public.validate_room_capacity();
revoke all on function public.validate_room_capacity() from public,anon,authenticated;


-- ===== 20261114000800_teacher_catalog.sql =====
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


-- ===== 20261114000900_integrity_and_student_records.sql =====
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


-- ===== 20261115001000_frontend_data_model.sql =====
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


-- ===== 20261115001100_booking_deadline.sql =====
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


commit;

-- Optional demonstration data. For the same new test project after 01.
-- Does not create users, passwords, bookings or student balances. Do not use for production.
begin;
do $$ begin
 if exists(select 1 from public.studios where id='10000000-0000-4000-8000-000000000001'::uuid or slug='flowie') then raise exception 'FLOWIE_DEMO_ALREADY_EXISTS'; end if;
end $$;
-- Sample data only. No production credentials are stored here.
insert into public.studios(id,name,slug,description,logo_url) values('10000000-0000-4000-8000-000000000001','Flowie 芙洛','flowie','在呼吸與流動之間，找到自己的節奏。','/logo.svg');
insert into public.branches(id,studio_id,name,address,phone,opening_hours) values
('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','南港館','台北市南港區（示範地址）','02-0000-0001','09:00–21:00'),
('20000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','信義館','台北市信義區（示範地址）','02-0000-0002','09:00–21:00');
insert into public.rooms(id,studio_id,branch_id,name,capacity,description) values
('30000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','晨光教室',10,'舒適明亮的墊上教室'),
('30000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','流動教室',8,'器械與核心訓練空間'),
('30000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000002','日和教室',10,'伸展與舒緩空間'),
('30000000-0000-4000-8000-000000000004','10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000002','木沐教室',8,'器械與核心訓練空間');
-- All sample rooms are available daily 07:00–22:00 local time.
insert into public.room_availability(studio_id,room_id,weekday,start_time,end_time)
select r.studio_id,r.id,d,'07:00','22:00' from public.rooms r cross join generate_series(0,6) d;
insert into public.teachers(id,studio_id,name,specialty,bio) values
('40000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','安安','墊上皮拉提斯','陪你從呼吸開始，溫柔感受身體。'),
('40000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','Kelly','器械皮拉提斯','循序建立穩定的核心力量。'),
('40000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000001','心瑜','瑜珈與伸展','在每個呼吸裡找回輕盈。'),
('40000000-0000-4000-8000-000000000004','10000000-0000-4000-8000-000000000001','Mia','核心訓練','和身體一起練習平衡。');
insert into public.course_categories(id,studio_id,name,sort_order) values
('50000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','皮拉提斯',1),
('50000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','瑜珈',2),
('50000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000001','舒緩伸展',3);
insert into public.courses(id,studio_id,category_id,name,description,duration_minutes,difficulty,default_capacity,credit_cost) values
('60000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-000000000001','初晨墊上皮拉提斯','從核心與呼吸開始，喚醒全身。',60,'入門',8,1),
('60000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-000000000001','器械基礎','透過器械輔助，練習穩定控制。',60,'入門',8,1),
('60000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-000000000002','柔和流動瑜珈','在流動中找到呼吸節奏。',60,'入門',8,1),
('60000000-0000-4000-8000-000000000004','10000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-000000000003','晚安舒緩伸展','釋放久坐後的緊繃。',60,'所有程度',8,1),
('60000000-0000-4000-8000-000000000005','10000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-000000000001','核心平衡練習','以穩定的節奏培養核心力量。',60,'初中階',8,1),
('60000000-0000-4000-8000-000000000006','10000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-000000000002','週末呼吸瑜珈','為週末留一點空白。',60,'所有程度',8,1);
update public.courses set image_url='/images/flowie-course.png' where studio_id='10000000-0000-4000-8000-000000000001';
insert into public.teacher_branches(studio_id,teacher_id,branch_id)
select t.studio_id,t.id,b.id from public.teachers t join public.branches b on b.studio_id=t.studio_id;
insert into public.teacher_courses(studio_id,teacher_id,course_id)
select t.studio_id,t.id,c.id from public.teachers t join public.courses c on c.studio_id=t.studio_id;
insert into public.teacher_availability(studio_id,teacher_id,weekday,start_time,end_time)
select t.studio_id,t.id,d,'00:00','23:59' from public.teachers t cross join generate_series(0,6) d;
insert into public.course_packages(id,studio_id,name,total_credits,validity_days,price,applies_to_all) values
('70000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','自在流動 10 堂',10,180,9000,true),
('70000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','輕盈體驗 5 堂',5,90,4800,true);
insert into public.site_settings(studio_id,headline,subheadline,contact_email) values('10000000-0000-4000-8000-000000000001','找到屬於自己的節奏。','從呼吸開始，與更好的自己相遇。','hello@example.com');
insert into public.booking_settings(studio_id,cancellation_hours) values('10000000-0000-4000-8000-000000000001',12);
insert into public.banners(studio_id,title,subtitle,image_url,link_url,sort_order) values('10000000-0000-4000-8000-000000000001','找到自己的節奏','從呼吸開始，與更好的自己相遇。','/images/flowie-hero.png','/classes',1);
insert into public.homepage_sections(studio_id,section_type,title,subtitle,sort_order) values
('10000000-0000-4000-8000-000000000001','hero','找到自己的節奏','從呼吸開始，與更好的自己相遇。',1),
('10000000-0000-4000-8000-000000000001','quick_booking','為自己留一段時間','選擇適合你的課程',3),
('10000000-0000-4000-8000-000000000001','courses','近期課程','一起在每一天，找到你的 flow。',2),
('10000000-0000-4000-8000-000000000001','teachers','認識我們的老師','用專業與溫柔，陪你練習。',4),
('10000000-0000-4000-8000-000000000001','announcements','最新消息','Flowie 的日常與提醒',5);
insert into public.announcements(studio_id,title,content) values('10000000-0000-4000-8000-000000000001','歡迎來到 Flowie','請在上課前提早 10 分鐘抵達，讓自己慢慢準備。');
insert into public.class_sessions(studio_id,branch_id,room_id,course_id,teacher_id,starts_at,ends_at,capacity,booking_opens_at,status)
select '10000000-0000-4000-8000-000000000001'::uuid,
 (array['20000000-0000-4000-8000-000000000001'::uuid,'20000000-0000-4000-8000-000000000001'::uuid,'20000000-0000-4000-8000-000000000002'::uuid,'20000000-0000-4000-8000-000000000002'::uuid])[1+((d+400)%4)],
 (array['30000000-0000-4000-8000-000000000001'::uuid,'30000000-0000-4000-8000-000000000002'::uuid,'30000000-0000-4000-8000-000000000003'::uuid,'30000000-0000-4000-8000-000000000004'::uuid])[1+((d+400)%4)],
 (array['60000000-0000-4000-8000-000000000001'::uuid,'60000000-0000-4000-8000-000000000002'::uuid,'60000000-0000-4000-8000-000000000003'::uuid,'60000000-0000-4000-8000-000000000004'::uuid,'60000000-0000-4000-8000-000000000005'::uuid,'60000000-0000-4000-8000-000000000006'::uuid])[1+((d+600)%6)],
 (array['40000000-0000-4000-8000-000000000001'::uuid,'40000000-0000-4000-8000-000000000002'::uuid,'40000000-0000-4000-8000-000000000003'::uuid,'40000000-0000-4000-8000-000000000004'::uuid])[1+((d+400)%4)],
 ((current_date+d)+time '10:00') at time zone 'Asia/Taipei',((current_date+d)+time '11:00') at time zone 'Asia/Taipei',8,least(now()-interval '1 day',((current_date+d)+time '10:00') at time zone 'Asia/Taipei' - interval '7 days'),case when d=-2 then 'cancelled' when d<0 then 'completed' else 'scheduled' end
from generate_series(-3,30) d where d<>0;

commit;

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

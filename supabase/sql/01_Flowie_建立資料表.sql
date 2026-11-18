-- Flowie V1：15 張業務表。請在全新的 Supabase 專案執行一次。
-- 此檔包含表、必要的完整性限制、RLS 與帳號初始化觸發器；不建立任何測試帳號。
-- 交易型功能（預約、扣堂、退堂、方案指派、排課）尚需受控的後端交易或 RPC。
BEGIN;
SET LOCAL search_path = public, extensions, pg_catalog;

DO $$
DECLARE n text;
BEGIN
  FOREACH n IN ARRAY ARRAY['profiles','site_settings','homepage_sections','branches','rooms','teachers','course_categories','courses','class_sessions','course_favorites','course_packages','student_packages','bookings','credit_ledger','announcements'] LOOP
    IF to_regclass(format('public.%I', n)) IS NOT NULL THEN
      RAISE EXCEPTION 'public.% 已存在；請使用空白專案或先評估資料遷移。', n;
    END IF;
  END LOOP;
END $$;
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA extensions;
CREATE SCHEMA IF NOT EXISTS flowie_private;
REVOKE ALL ON SCHEMA flowie_private FROM PUBLIC;
GRANT USAGE ON SCHEMA flowie_private TO anon, authenticated;

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE RESTRICT,
  display_name text CHECK (display_name IS NULL OR btrim(display_name) <> ''),
  is_admin boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.site_settings (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  brand_name text NOT NULL CHECK (btrim(brand_name) <> ''),
  logo_url text,
  brand_tagline text,
  contact_email text,
  contact_phone text,
  cancellation_hours integer NOT NULL DEFAULT 12 CHECK (cancellation_hours >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.homepage_sections (
  section_type text PRIMARY KEY CHECK (section_type IN ('hero','courses','quick_booking','teachers','announcements')),
  title text,
  subtitle text,
  image_url text,
  link_url text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE CHECK (btrim(name) <> ''),
  address text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES public.branches(id),
  name text NOT NULL CHECK (btrim(name) <> ''),
  capacity integer NOT NULL CHECK (capacity > 0),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (branch_id, name)
);
CREATE TABLE public.teachers (
  id uuid PRIMARY KEY REFERENCES public.profiles(id),
  photo_url text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.course_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE CHECK (btrim(name) <> ''),
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES public.course_categories(id),
  name text NOT NULL CHECK (btrim(name) <> ''),
  description text,
  image_url text,
  default_duration_minutes integer NOT NULL CHECK (default_duration_minutes > 0),
  difficulty text NOT NULL CHECK (btrim(difficulty) <> ''),
  credit_cost integer NOT NULL CHECK (credit_cost > 0),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.class_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.rooms(id),
  course_id uuid NOT NULL REFERENCES public.courses(id),
  teacher_id uuid NOT NULL REFERENCES public.teachers(id),
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  capacity integer NOT NULL CHECK (capacity > 0),
  booking_opens_at timestamptz NOT NULL DEFAULT now(),
  booking_closes_at timestamptz,
  cancellation_deadline_override_at timestamptz,
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','cancelled','completed')),
  series_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_at > starts_at),
  CHECK (booking_opens_at <= COALESCE(booking_closes_at, starts_at)),
  CHECK (booking_closes_at IS NULL OR booking_closes_at <= starts_at),
  CHECK (cancellation_deadline_override_at IS NULL OR cancellation_deadline_override_at <= starts_at),
  EXCLUDE USING gist (room_id WITH =, tstzrange(starts_at, ends_at, '[)') WITH &&) WHERE (status <> 'cancelled'),
  EXCLUDE USING gist (teacher_id WITH =, tstzrange(starts_at, ends_at, '[)') WITH &&) WHERE (status <> 'cancelled')
);
CREATE TABLE public.course_favorites (
  student_id uuid NOT NULL REFERENCES public.profiles(id),
  course_id uuid NOT NULL REFERENCES public.courses(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (student_id, course_id)
);
CREATE TABLE public.course_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (btrim(name) <> ''),
  total_credits integer NOT NULL CHECK (total_credits > 0),
  validity_days integer NOT NULL CHECK (validity_days > 0),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.student_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.profiles(id),
  package_id uuid NOT NULL REFERENCES public.course_packages(id),
  starts_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (expires_at > starts_at)
);
CREATE TABLE public.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.class_sessions(id),
  student_id uuid NOT NULL REFERENCES public.profiles(id),
  status text NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed','cancelled')),
  attendance_status text NOT NULL DEFAULT 'unconfirmed' CHECK (attendance_status IN ('unconfirmed','present','absent')),
  attendance_marked_by uuid REFERENCES public.profiles(id),
  attendance_marked_at timestamptz,
  cancellation_deadline_at timestamptz NOT NULL,
  cancelled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((attendance_marked_by IS NULL) = (attendance_marked_at IS NULL)),
  CHECK ((status = 'cancelled') = (cancelled_at IS NOT NULL))
);
CREATE UNIQUE INDEX bookings_one_confirmed_per_student ON public.bookings(session_id, student_id) WHERE status = 'confirmed';
CREATE TABLE public.credit_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_package_id uuid NOT NULL REFERENCES public.student_packages(id),
  booking_id uuid REFERENCES public.bookings(id),
  entry_type text NOT NULL CHECK (entry_type IN ('GRANT','BOOKING_DEBIT','CANCELLATION_REFUND','MANUAL_ADJUSTMENT')),
  delta integer NOT NULL CHECK (delta <> 0),
  operator_id uuid REFERENCES public.profiles(id),
  idempotency_key text NOT NULL UNIQUE CHECK (btrim(idempotency_key) <> ''),
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((entry_type = 'GRANT' AND delta > 0 AND booking_id IS NULL)
      OR (entry_type = 'BOOKING_DEBIT' AND delta < 0 AND booking_id IS NOT NULL)
      OR (entry_type = 'CANCELLATION_REFUND' AND delta > 0 AND booking_id IS NOT NULL)
      OR (entry_type = 'MANUAL_ADJUSTMENT' AND booking_id IS NULL AND note IS NOT NULL AND btrim(note) <> ''))
);
CREATE UNIQUE INDEX credit_one_grant_per_package ON public.credit_ledger(student_package_id) WHERE entry_type = 'GRANT';
CREATE UNIQUE INDEX credit_one_debit_per_booking ON public.credit_ledger(booking_id) WHERE entry_type = 'BOOKING_DEBIT';
CREATE UNIQUE INDEX credit_one_refund_per_booking ON public.credit_ledger(booking_id) WHERE entry_type = 'CANCELLATION_REFUND';
CREATE TABLE public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL CHECK (btrim(title) <> ''),
  content text NOT NULL CHECK (btrim(content) <> ''),
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (starts_at IS NULL OR ends_at IS NULL OR ends_at > starts_at)
);

-- 常用關聯欄位索引；不增加任何業務資料表。
CREATE INDEX rooms_branch_id_idx ON public.rooms(branch_id);
CREATE INDEX courses_category_id_idx ON public.courses(category_id);
CREATE INDEX class_sessions_course_id_idx ON public.class_sessions(course_id);
CREATE INDEX class_sessions_starts_at_idx ON public.class_sessions(starts_at);
CREATE INDEX course_favorites_course_id_idx ON public.course_favorites(course_id);
CREATE INDEX student_packages_student_id_idx ON public.student_packages(student_id);
CREATE INDEX student_packages_package_id_idx ON public.student_packages(package_id);
CREATE INDEX bookings_student_id_idx ON public.bookings(student_id);
CREATE INDEX bookings_attendance_marked_by_idx ON public.bookings(attendance_marked_by);
CREATE INDEX credit_ledger_student_package_id_idx ON public.credit_ledger(student_package_id);
CREATE INDEX credit_ledger_booking_id_idx ON public.credit_ledger(booking_id);
CREATE INDEX credit_ledger_operator_id_idx ON public.credit_ledger(operator_id);

-- 函式 set_updated_at：沿用既有 V1 的資料讀取、完整性或權限檢查；本次僅補註解，不改變函式定義。
CREATE FUNCTION flowie_private.set_updated_at() RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END $$;
DO $$
DECLARE n text;
BEGIN
  FOREACH n IN ARRAY ARRAY['profiles','site_settings','homepage_sections','branches','rooms','teachers','course_categories','courses','class_sessions','course_packages','bookings','announcements'] LOOP
    EXECUTE format('CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION flowie_private.set_updated_at()', n);
  END LOOP;
END $$;

-- 防止場次超過教室容量，以及教室縮減後低於現有場次容量。用行鎖避免並發時競爭。
-- 函式 check_session_capacity：沿用既有 V1 的資料讀取、完整性或權限檢查；本次僅補註解，不改變函式定義。
CREATE FUNCTION flowie_private.check_session_capacity() RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE room_capacity integer;
BEGIN
  SELECT capacity INTO room_capacity FROM public.rooms WHERE id = NEW.room_id FOR UPDATE;
  IF room_capacity IS NULL OR NEW.capacity > room_capacity THEN
    RAISE EXCEPTION '場次容量不可高於教室容量';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER check_session_capacity BEFORE INSERT OR UPDATE OF room_id, capacity ON public.class_sessions FOR EACH ROW EXECUTE FUNCTION flowie_private.check_session_capacity();
-- 函式 check_room_capacity：沿用既有 V1 的資料讀取、完整性或權限檢查；本次僅補註解，不改變函式定義。
CREATE FUNCTION flowie_private.check_room_capacity() RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.class_sessions WHERE room_id = NEW.id AND capacity > NEW.capacity) THEN
    RAISE EXCEPTION '教室容量不可低於既有場次容量';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER check_room_capacity BEFORE UPDATE OF capacity ON public.rooms FOR EACH ROW EXECUTE FUNCTION flowie_private.check_room_capacity();

-- 函式 check_teacher_name：沿用既有 V1 的資料讀取、完整性或權限檢查；本次僅補註解，不改變函式定義。
CREATE FUNCTION flowie_private.check_teacher_name() RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.id AND display_name IS NOT NULL AND is_active) THEN
    RAISE EXCEPTION '建立老師前須有啟用且已填寫姓名的帳號';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER check_teacher_name BEFORE INSERT OR UPDATE OF id ON public.teachers FOR EACH ROW EXECUTE FUNCTION flowie_private.check_teacher_name();
-- 函式 check_teacher_profile_name：沿用既有 V1 的資料讀取、完整性或權限檢查；本次僅補註解，不改變函式定義。
CREATE FUNCTION flowie_private.check_teacher_profile_name() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NEW.display_name IS NULL AND EXISTS (SELECT 1 FROM public.teachers WHERE id = NEW.id) THEN
    RAISE EXCEPTION '具有老師身分的帳號須保留顯示名稱';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER check_teacher_profile_name BEFORE UPDATE OF display_name ON public.profiles FOR EACH ROW EXECUTE FUNCTION flowie_private.check_teacher_profile_name();

-- 函式 check_booking_student_name：沿用既有 V1 的資料讀取、完整性或權限檢查；本次僅補註解，不改變函式定義。
CREATE FUNCTION flowie_private.check_booking_student_name() RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.student_id AND display_name IS NOT NULL AND is_active) THEN
    RAISE EXCEPTION '預約前須有啟用且已填寫姓名的帳號';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER check_booking_student_name BEFORE INSERT OR UPDATE OF student_id ON public.bookings FOR EACH ROW EXECUTE FUNCTION flowie_private.check_booking_student_name();
-- 函式 check_ledger_booking_owner：沿用既有 V1 的資料讀取、完整性或權限檢查；本次僅補註解，不改變函式定義。
CREATE FUNCTION flowie_private.check_ledger_booking_owner() RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF NEW.booking_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.bookings b JOIN public.student_packages sp ON sp.student_id = b.student_id
    WHERE b.id = NEW.booking_id AND sp.id = NEW.student_package_id
  ) THEN RAISE EXCEPTION '堂數帳本和預約必須屬於同一位學生'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER check_ledger_booking_owner BEFORE INSERT OR UPDATE OF booking_id, student_package_id ON public.credit_ledger FOR EACH ROW EXECUTE FUNCTION flowie_private.check_ledger_booking_owner();

-- 帳號由 Supabase Auth 建立；新增帳號時只同步 ID，姓名由使用者填寫。
-- 函式 handle_new_auth_user：沿用既有 V1 的資料讀取、完整性或權限檢查；本次僅補註解，不改變函式定義。
CREATE FUNCTION flowie_private.handle_new_auth_user() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN INSERT INTO public.profiles(id) VALUES (NEW.id) ON CONFLICT (id) DO NOTHING; RETURN NEW; END $$;
CREATE TRIGGER on_flowie_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION flowie_private.handle_new_auth_user();
INSERT INTO public.profiles(id) SELECT id FROM auth.users ON CONFLICT (id) DO NOTHING;

-- 函式 is_admin：沿用既有 V1 的資料讀取、完整性或權限檢查；本次僅補註解，不改變函式定義。
CREATE FUNCTION flowie_private.is_admin() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND is_active AND is_admin)
$$;
REVOKE ALL ON FUNCTION flowie_private.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION flowie_private.is_admin() TO anon, authenticated;
-- 僅公開啟用老師的顯示名稱與照片，不開放其他人的 profiles。
-- 函式 flowie_public_teachers：提供可公開的老師姓名與照片；姓名來自 profiles。
CREATE FUNCTION public.flowie_public_teachers() RETURNS TABLE(teacher_id uuid, display_name text, photo_url text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT t.id, p.display_name, t.photo_url FROM public.teachers t
  JOIN public.profiles p ON p.id = t.id
  WHERE t.is_active AND p.is_active AND p.display_name IS NOT NULL
$$;
REVOKE ALL ON FUNCTION public.flowie_public_teachers() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.flowie_public_teachers() TO anon, authenticated;

-- API 層權限：先全部收回，再只開放必要操作。交易表目前只有讀取權。
REVOKE ALL ON public.profiles, public.site_settings, public.homepage_sections, public.branches, public.rooms, public.teachers, public.course_categories, public.courses, public.class_sessions, public.course_favorites, public.course_packages, public.student_packages, public.bookings, public.credit_ledger, public.announcements FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.site_settings, public.homepage_sections, public.branches, public.rooms, public.teachers, public.course_categories, public.courses, public.class_sessions, public.course_packages, public.announcements TO anon, authenticated;
GRANT SELECT ON public.profiles, public.course_favorites, public.student_packages, public.bookings, public.credit_ledger TO authenticated;
GRANT UPDATE (display_name) ON public.profiles TO authenticated;
GRANT INSERT, DELETE ON public.course_favorites TO authenticated;

DO $$
DECLARE n text;
BEGIN
  FOREACH n IN ARRAY ARRAY['profiles','site_settings','homepage_sections','branches','rooms','teachers','course_categories','courses','class_sessions','course_favorites','course_packages','student_packages','bookings','credit_ledger','announcements'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', n);
  END LOOP;
END $$;
CREATE POLICY profiles_read ON public.profiles FOR SELECT TO authenticated USING (id = (SELECT auth.uid()) OR (SELECT flowie_private.is_admin()));
CREATE POLICY profiles_update_own ON public.profiles FOR UPDATE TO authenticated USING (id = (SELECT auth.uid()) AND is_active) WITH CHECK (id = (SELECT auth.uid()));
CREATE POLICY settings_read ON public.site_settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY homepage_read ON public.homepage_sections FOR SELECT TO anon, authenticated USING (is_active OR (SELECT flowie_private.is_admin()));
CREATE POLICY branches_read ON public.branches FOR SELECT TO anon, authenticated USING (is_active OR (SELECT flowie_private.is_admin()));
CREATE POLICY rooms_read ON public.rooms FOR SELECT TO anon, authenticated USING ((is_active AND EXISTS (SELECT 1 FROM public.branches b WHERE b.id = branch_id AND b.is_active)) OR (SELECT flowie_private.is_admin()));
CREATE POLICY teachers_read ON public.teachers FOR SELECT TO anon, authenticated USING (is_active OR (SELECT flowie_private.is_admin()));
CREATE POLICY categories_read ON public.course_categories FOR SELECT TO anon, authenticated USING (is_active OR (SELECT flowie_private.is_admin()));
CREATE POLICY courses_read ON public.courses FOR SELECT TO anon, authenticated USING ((is_active AND EXISTS (SELECT 1 FROM public.course_categories c WHERE c.id = category_id AND c.is_active)) OR (SELECT flowie_private.is_admin()));
CREATE POLICY sessions_read ON public.class_sessions FOR SELECT TO anon, authenticated USING (status = 'scheduled' OR (SELECT flowie_private.is_admin()));
CREATE POLICY favorites_read ON public.course_favorites FOR SELECT TO authenticated USING (student_id = (SELECT auth.uid()));
CREATE POLICY favorites_insert ON public.course_favorites FOR INSERT TO authenticated WITH CHECK (student_id = (SELECT auth.uid()) AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = student_id AND p.is_active) AND EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND c.is_active));
CREATE POLICY favorites_delete ON public.course_favorites FOR DELETE TO authenticated USING (student_id = (SELECT auth.uid()));
CREATE POLICY packages_read_public ON public.course_packages FOR SELECT TO anon USING (is_active);
CREATE POLICY packages_read_member ON public.course_packages FOR SELECT TO authenticated USING (is_active OR (SELECT flowie_private.is_admin()) OR EXISTS (SELECT 1 FROM public.student_packages sp WHERE sp.package_id = course_packages.id AND sp.student_id = (SELECT auth.uid())));
CREATE POLICY student_packages_read ON public.student_packages FOR SELECT TO authenticated USING (student_id = (SELECT auth.uid()) OR (SELECT flowie_private.is_admin()));
CREATE POLICY bookings_read ON public.bookings FOR SELECT TO authenticated USING (student_id = (SELECT auth.uid()) OR (SELECT flowie_private.is_admin()));
CREATE POLICY ledger_read ON public.credit_ledger FOR SELECT TO authenticated USING ((SELECT flowie_private.is_admin()) OR EXISTS (SELECT 1 FROM public.student_packages sp WHERE sp.id = student_package_id AND sp.student_id = (SELECT auth.uid())));
CREATE POLICY announcements_read ON public.announcements FOR SELECT TO anon, authenticated USING ((is_active AND (starts_at IS NULL OR starts_at <= now()) AND (ends_at IS NULL OR ends_at > now())) OR (SELECT flowie_private.is_admin()));
COMMIT;

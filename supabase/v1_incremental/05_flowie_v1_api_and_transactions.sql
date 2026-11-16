-- Flowie V1 增量：只適用已執行 01～04 的 15 表結構。
-- 請先在隔離環境測試、審查後手動執行；不刪除或重建任何表及資料。
BEGIN;
DO $$
DECLARE n text;
BEGIN
 FOREACH n IN ARRAY ARRAY['profiles','site_settings','homepage_sections','branches','rooms','teachers','course_categories','courses','class_sessions','course_favorites','course_packages','student_packages','bookings','credit_ledger','announcements'] LOOP
   IF to_regclass(format('public.%I',n)) IS NULL THEN RAISE EXCEPTION '缺少 V1 資料表 public.%',n; END IF;
 END LOOP;
 IF to_regprocedure('flowie_private.is_admin()') IS NULL OR to_regprocedure('public.flowie_public_teachers()') IS NULL THEN
   RAISE EXCEPTION '缺少 V1 權限或老師函式，請確認 01 SQL 已完成';
 END IF;
 IF EXISTS (SELECT 1 FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace ns ON ns.oid=c.relnamespace
   WHERE ns.nspname='public' AND c.relname=ANY(ARRAY['profiles','site_settings','homepage_sections','branches','rooms','teachers','course_categories','courses','class_sessions','course_favorites','course_packages','student_packages','bookings','credit_ledger','announcements']) AND NOT c.relrowsecurity) THEN
   RAISE EXCEPTION 'V1 資料表 RLS 未全部啟用，請先檢查既有資料庫';
 END IF;
 IF EXISTS (SELECT 1 FROM (VALUES ('profiles','display_name'),('profiles','is_admin'),('profiles','is_active'),('site_settings','cancellation_hours'),('homepage_sections','section_type'),('rooms','branch_id'),('courses','default_duration_minutes'),('class_sessions','cancellation_deadline_override_at'),('class_sessions','series_id'),('student_packages','expires_at'),('bookings','cancellation_deadline_at'),('bookings','attendance_status'),('credit_ledger','idempotency_key'),('credit_ledger','student_package_id')) AS v(tab,col)
   WHERE NOT EXISTS (SELECT 1 FROM information_schema.columns c WHERE c.table_schema='public' AND c.table_name=v.tab AND c.column_name=v.col)) THEN
   RAISE EXCEPTION '現有資料庫缺少 V1 必要欄位，請先核對 01 SQL';
 END IF;
 IF to_regclass('public.bookings_one_confirmed_per_student') IS NULL OR to_regclass('public.credit_one_grant_per_package') IS NULL OR to_regclass('public.credit_one_debit_per_booking') IS NULL OR to_regclass('public.credit_one_refund_per_booking') IS NULL THEN
   RAISE EXCEPTION '現有資料庫缺少 V1 預約或帳本唯一索引';
 END IF;
END $$;

-- 管理員可維護非交易型內容；保留歷史資料，API 不開放 DELETE。
DO $$
DECLARE n text;
BEGIN
 FOREACH n IN ARRAY ARRAY['site_settings','homepage_sections','branches','rooms','teachers','course_categories','courses','course_packages','announcements'] LOOP
   EXECUTE format('GRANT INSERT, UPDATE ON public.%I TO authenticated',n);
   IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename=n AND policyname='flowie_v1_admin_insert') THEN
     EXECUTE format('CREATE POLICY flowie_v1_admin_insert ON public.%I FOR INSERT TO authenticated WITH CHECK ((SELECT flowie_private.is_admin()))',n);
   END IF;
   IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename=n AND policyname='flowie_v1_admin_update') THEN
     EXECUTE format('CREATE POLICY flowie_v1_admin_update ON public.%I FOR UPDATE TO authenticated USING ((SELECT flowie_private.is_admin())) WITH CHECK ((SELECT flowie_private.is_admin()))',n);
   END IF;
 END LOOP;
END $$;

-- 只公開場次和 confirmed 預約總數，不公開學生資料。
CREATE OR REPLACE FUNCTION public.flowie_v1_session_catalog(p_from timestamptz,p_to timestamptz)
RETURNS TABLE(id uuid,room_id uuid,room_name text,branch_id uuid,branch_name text,course_id uuid,course_name text,course_image text,course_description text,duration_minutes integer,difficulty text,category_id uuid,teacher_id uuid,teacher_name text,teacher_photo text,starts_at timestamptz,ends_at timestamptz,capacity integer,booked_count bigint,credit_cost integer,booking_opens_at timestamptz,booking_closes_at timestamptz,cancellation_deadline timestamptz,status text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF p_from IS NULL OR p_to IS NULL OR p_to<=p_from OR p_to-p_from>interval '370 days' THEN RAISE EXCEPTION 'INVALID_INTERVAL'; END IF;
 RETURN QUERY SELECT s.id,r.id,r.name,b.id,b.name,c.id,c.name,c.image_url,c.description,
   (extract(epoch from(s.ends_at-s.starts_at))/60)::integer,c.difficulty,c.category_id,t.id,p.display_name,t.photo_url,
   s.starts_at,s.ends_at,s.capacity,(SELECT count(*) FROM public.bookings bk WHERE bk.session_id=s.id AND bk.status='confirmed'),
   c.credit_cost,s.booking_opens_at,s.booking_closes_at,s.cancellation_deadline_override_at,s.status
 FROM public.class_sessions s JOIN public.rooms r ON r.id=s.room_id JOIN public.branches b ON b.id=r.branch_id
 JOIN public.courses c ON c.id=s.course_id JOIN public.course_categories cc ON cc.id=c.category_id
 JOIN public.teachers t ON t.id=s.teacher_id JOIN public.profiles p ON p.id=t.id
 WHERE s.status='scheduled' AND s.starts_at>=p_from AND s.starts_at<p_to AND r.is_active AND b.is_active
   AND c.is_active AND cc.is_active AND t.is_active AND p.is_active AND p.display_name IS NOT NULL
 ORDER BY s.starts_at,s.id;
END $$;
REVOKE ALL ON FUNCTION public.flowie_v1_session_catalog(timestamptz,timestamptz) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.flowie_v1_session_catalog(timestamptz,timestamptz) TO anon,authenticated;

-- 可重試請求的 key 在同一個交易持有鎖，避免重複扣堂；不要在客戶端直接寫入帳本。
CREATE OR REPLACE FUNCTION public.flowie_v1_book(p_session uuid,p_key text)
RETURNS public.bookings LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE uid uuid := auth.uid(); s public.class_sessions%ROWTYPE; sp public.student_packages%ROWTYPE;
        b public.bookings%ROWTYPE; prior public.credit_ledger%ROWTYPE; cost integer; bal bigint; deadline timestamptz;
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'UNAUTHENTICATED'; END IF;
 IF p_key IS NULL OR length(btrim(p_key))<8 OR length(p_key)>120 OR p_key LIKE 'flowie:%' THEN RAISE EXCEPTION 'INVALID_IDEMPOTENCY_KEY'; END IF;
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_key,0));
 SELECT * INTO prior FROM public.credit_ledger WHERE idempotency_key=p_key;
 IF FOUND THEN
   SELECT * INTO b FROM public.bookings WHERE id=prior.booking_id;
   IF prior.entry_type<>'BOOKING_DEBIT' OR b.student_id IS DISTINCT FROM uid OR b.session_id IS DISTINCT FROM p_session THEN RAISE EXCEPTION 'DUPLICATE_REQUEST'; END IF;
   IF b.status<>'confirmed' THEN RAISE EXCEPTION 'BOOKING_NOT_ACTIVE'; END IF;
   RETURN b;
 END IF;
 PERFORM 1 FROM public.profiles WHERE id=uid AND is_active AND display_name IS NOT NULL FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'PROFILE_INCOMPLETE'; END IF;
 SELECT * INTO s FROM public.class_sessions WHERE id=p_session FOR UPDATE;
 IF NOT FOUND OR s.status<>'scheduled' OR s.starts_at<=now() THEN RAISE EXCEPTION 'SESSION_UNAVAILABLE'; END IF;
 IF now()<s.booking_opens_at THEN RAISE EXCEPTION 'BOOKING_NOT_OPEN'; END IF;
 IF now()>=coalesce(s.booking_closes_at,s.starts_at) THEN RAISE EXCEPTION 'BOOKING_CLOSED'; END IF;
 IF EXISTS (SELECT 1 FROM public.bookings WHERE session_id=s.id AND student_id=uid AND status='confirmed') THEN RAISE EXCEPTION 'ALREADY_BOOKED'; END IF;
 IF (SELECT count(*) FROM public.bookings WHERE session_id=s.id AND status='confirmed')>=s.capacity THEN RAISE EXCEPTION 'SESSION_FULL'; END IF;
 SELECT c.credit_cost INTO cost FROM public.courses c JOIN public.course_categories cc ON cc.id=c.category_id
 JOIN public.rooms r ON r.id=s.room_id JOIN public.branches br ON br.id=r.branch_id
 JOIN public.teachers t ON t.id=s.teacher_id JOIN public.profiles tp ON tp.id=t.id
 WHERE c.id=s.course_id AND c.is_active AND cc.is_active AND r.is_active AND br.is_active AND t.is_active AND tp.is_active;
 IF cost IS NULL THEN RAISE EXCEPTION 'SESSION_UNAVAILABLE'; END IF;
 FOR sp IN SELECT * FROM public.student_packages WHERE student_id=uid AND is_active AND starts_at<=now() AND expires_at>now() AND starts_at<=s.starts_at AND expires_at>s.starts_at ORDER BY expires_at,id FOR UPDATE LOOP
   SELECT coalesce(sum(delta),0) INTO bal FROM public.credit_ledger WHERE student_package_id=sp.id;
   IF bal>=cost THEN EXIT; END IF;
 END LOOP;
 IF sp.id IS NULL OR bal IS NULL OR bal<cost THEN RAISE EXCEPTION 'NO_VALID_PACKAGE_OR_CREDITS'; END IF;
 SELECT coalesce(s.cancellation_deadline_override_at,s.starts_at-make_interval(hours=>cancellation_hours)) INTO deadline FROM public.site_settings WHERE id=1;
 IF deadline IS NULL THEN RAISE EXCEPTION 'SETTINGS_NOT_FOUND'; END IF;
 INSERT INTO public.bookings(session_id,student_id,cancellation_deadline_at) VALUES(s.id,uid,deadline) RETURNING * INTO b;
 INSERT INTO public.credit_ledger(student_package_id,booking_id,entry_type,delta,operator_id,idempotency_key) VALUES(sp.id,b.id,'BOOKING_DEBIT',-cost,uid,p_key);
 RETURN b;
END $$;

CREATE OR REPLACE FUNCTION public.flowie_v1_cancel_booking(p_booking uuid)
RETURNS public.bookings LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE uid uuid:=auth.uid(); bid public.bookings%ROWTYPE; sess public.class_sessions%ROWTYPE; debit public.credit_ledger%ROWTYPE;
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'UNAUTHENTICATED'; END IF;
 PERFORM 1 FROM public.profiles WHERE id=uid AND is_active FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
 -- 不持有預約列鎖時先取得 session ID，再按場次→方案順序鎖定。
 SELECT * INTO bid FROM public.bookings WHERE id=p_booking AND student_id=uid;
 IF NOT FOUND THEN RAISE EXCEPTION 'FORBIDDEN_OR_NOT_FOUND'; END IF;
 SELECT * INTO sess FROM public.class_sessions WHERE id=bid.session_id FOR UPDATE;
 SELECT * INTO bid FROM public.bookings WHERE id=p_booking AND student_id=uid FOR UPDATE;
 IF bid.status='cancelled' THEN RETURN bid; END IF;
 IF sess.status<>'scheduled' OR now()>bid.cancellation_deadline_at OR now()>=sess.starts_at THEN RAISE EXCEPTION 'CANCELLATION_DEADLINE_PASSED'; END IF;
 SELECT * INTO debit FROM public.credit_ledger WHERE booking_id=bid.id AND entry_type='BOOKING_DEBIT';
 IF NOT FOUND THEN RAISE EXCEPTION 'MISSING_BOOKING_DEBIT'; END IF;
 PERFORM 1 FROM public.student_packages WHERE id=debit.student_package_id FOR UPDATE;
 UPDATE public.bookings SET status='cancelled',cancelled_at=now() WHERE id=bid.id RETURNING * INTO bid;
 INSERT INTO public.credit_ledger(student_package_id,booking_id,entry_type,delta,operator_id,idempotency_key)
 VALUES(debit.student_package_id,bid.id,'CANCELLATION_REFUND',-debit.delta,uid,'flowie:refund:'||bid.id::text);
 RETURN bid;
END $$;

CREATE OR REPLACE FUNCTION public.flowie_v1_issue_package(p_student uuid,p_package uuid,p_key text,p_starts timestamptz DEFAULT NULL)
RETURNS public.student_packages LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE uid uuid:=auth.uid(); tmpl public.course_packages%ROWTYPE; sp public.student_packages%ROWTYPE; prior public.credit_ledger%ROWTYPE;
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'UNAUTHENTICATED'; END IF;
 IF NOT flowie_private.is_admin() THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
 IF p_key IS NULL OR length(btrim(p_key))<8 OR length(p_key)>120 OR p_key LIKE 'flowie:%' THEN RAISE EXCEPTION 'INVALID_IDEMPOTENCY_KEY'; END IF;
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_key,0));
 SELECT * INTO prior FROM public.credit_ledger WHERE idempotency_key=p_key;
 IF FOUND THEN
   SELECT * INTO sp FROM public.student_packages WHERE id=prior.student_package_id;
   IF prior.entry_type<>'GRANT' OR sp.student_id IS DISTINCT FROM p_student OR sp.package_id IS DISTINCT FROM p_package OR (p_starts IS NOT NULL AND sp.starts_at IS DISTINCT FROM p_starts) THEN RAISE EXCEPTION 'DUPLICATE_REQUEST'; END IF;
   RETURN sp;
 END IF;
 IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id=p_student AND is_active AND display_name IS NOT NULL) THEN RAISE EXCEPTION 'PROFILE_INCOMPLETE'; END IF;
 SELECT * INTO tmpl FROM public.course_packages WHERE id=p_package AND is_active;
 IF NOT FOUND THEN RAISE EXCEPTION 'PACKAGE_UNAVAILABLE'; END IF;
 p_starts:=coalesce(p_starts,now());
 INSERT INTO public.student_packages(student_id,package_id,starts_at,expires_at) VALUES(p_student,p_package,p_starts,p_starts+make_interval(days=>tmpl.validity_days)) RETURNING * INTO sp;
 INSERT INTO public.credit_ledger(student_package_id,entry_type,delta,operator_id,idempotency_key) VALUES(sp.id,'GRANT',tmpl.total_credits,uid,p_key);
 RETURN sp;
END $$;

CREATE OR REPLACE FUNCTION public.flowie_v1_adjust_credits(p_package uuid,p_delta integer,p_note text,p_key text)
RETURNS public.credit_ledger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE uid uuid:=auth.uid(); prior public.credit_ledger%ROWTYPE; bal bigint;
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'UNAUTHENTICATED'; END IF;
 IF NOT flowie_private.is_admin() THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
 IF p_key IS NULL OR length(btrim(p_key))<8 OR length(p_key)>120 OR p_key LIKE 'flowie:%' THEN RAISE EXCEPTION 'INVALID_IDEMPOTENCY_KEY'; END IF;
 IF p_delta IS NULL OR p_delta=0 OR p_note IS NULL OR btrim(p_note)='' OR length(p_note)>500 THEN RAISE EXCEPTION 'INVALID_ADJUSTMENT'; END IF;
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_key,0));
 SELECT * INTO prior FROM public.credit_ledger WHERE idempotency_key=p_key;
 IF FOUND THEN
   IF prior.entry_type<>'MANUAL_ADJUSTMENT' OR prior.student_package_id IS DISTINCT FROM p_package OR prior.delta IS DISTINCT FROM p_delta OR prior.note IS DISTINCT FROM p_note THEN RAISE EXCEPTION 'DUPLICATE_REQUEST'; END IF;
   RETURN prior;
 END IF;
 PERFORM 1 FROM public.student_packages WHERE id=p_package FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'FORBIDDEN_OR_NOT_FOUND'; END IF;
 SELECT coalesce(sum(delta),0) INTO bal FROM public.credit_ledger WHERE student_package_id=p_package;
 IF bal+p_delta<0 THEN RAISE EXCEPTION 'INSUFFICIENT_CREDITS'; END IF;
 INSERT INTO public.credit_ledger(student_package_id,entry_type,delta,operator_id,idempotency_key,note) VALUES(p_package,'MANUAL_ADJUSTMENT',p_delta,uid,p_key,p_note) RETURNING * INTO prior;
 RETURN prior;
END $$;

-- 個人預約可讀取已完成或取消的場次名稱；不直接開放 profiles 或其他學生預約。
CREATE OR REPLACE FUNCTION public.flowie_v1_bookings(p_student uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE uid uuid:=auth.uid(); target uuid; result jsonb;
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'UNAUTHENTICATED'; END IF;
 IF p_student IS NULL AND flowie_private.is_admin() THEN target:=NULL;
 ELSE target:=coalesce(p_student,uid); IF target<>uid AND NOT flowie_private.is_admin() THEN RAISE EXCEPTION 'FORBIDDEN'; END IF; END IF;
 SELECT coalesce(jsonb_agg(to_jsonb(b) || jsonb_build_object('credits_charged',(SELECT -l.delta FROM public.credit_ledger l WHERE l.booking_id=b.id AND l.entry_type='BOOKING_DEBIT'),'class_sessions',jsonb_build_object(
   'id',s.id,'starts_at',s.starts_at,'ends_at',s.ends_at,'status',s.status,
   'courses',jsonb_build_object('name',c.name),'rooms',jsonb_build_object('name',r.name),
   'branches',jsonb_build_object('name',br.name),'teachers',jsonb_build_object('name',p.display_name))) ORDER BY s.starts_at DESC),'[]'::jsonb)
 INTO result FROM public.bookings b JOIN public.class_sessions s ON s.id=b.session_id
 JOIN public.courses c ON c.id=s.course_id JOIN public.rooms r ON r.id=s.room_id JOIN public.branches br ON br.id=r.branch_id
 JOIN public.profiles p ON p.id=s.teacher_id WHERE target IS NULL OR b.student_id=target;
 RETURN result;
END $$;

CREATE OR REPLACE FUNCTION public.flowie_v1_mark_attendance(p_booking uuid,p_status text)
RETURNS public.bookings LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE uid uuid:=auth.uid(); b public.bookings%ROWTYPE; teacher uuid;
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'UNAUTHENTICATED'; END IF;
 IF p_status NOT IN ('present','absent','unconfirmed') THEN RAISE EXCEPTION 'INVALID_ATTENDANCE'; END IF;
 SELECT * INTO b FROM public.bookings WHERE id=p_booking;
 IF b.id IS NULL THEN RAISE EXCEPTION 'FORBIDDEN_OR_NOT_FOUND'; END IF;
 SELECT teacher_id INTO teacher FROM public.class_sessions WHERE id=b.session_id;
 IF NOT flowie_private.is_admin() AND NOT (teacher=uid AND EXISTS(SELECT 1 FROM public.teachers t JOIN public.profiles p ON p.id=t.id WHERE t.id=uid AND t.is_active AND p.is_active)) THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
 IF b.status<>'confirmed' THEN RAISE EXCEPTION 'BOOKING_NOT_ACTIVE'; END IF;
 UPDATE public.bookings SET attendance_status=p_status,attendance_marked_by=uid,attendance_marked_at=now() WHERE id=p_booking AND status='confirmed' RETURNING * INTO b;
 IF NOT FOUND THEN RAISE EXCEPTION 'BOOKING_NOT_ACTIVE'; END IF;
 RETURN b;
END $$;

CREATE OR REPLACE FUNCTION public.flowie_v1_session_students(p_session uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE uid uuid:=auth.uid(); result jsonb;
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'UNAUTHENTICATED'; END IF;
 IF NOT flowie_private.is_admin() AND NOT EXISTS (SELECT 1 FROM public.class_sessions s JOIN public.teachers t ON t.id=s.teacher_id JOIN public.profiles p ON p.id=t.id WHERE s.id=p_session AND t.id=uid AND t.is_active AND p.is_active) THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
 SELECT coalesce(jsonb_agg(jsonb_build_object('booking_id',b.id,'student_id',b.student_id,'student_name',p.display_name,'status',b.status,'attendance_status',b.attendance_status) ORDER BY p.display_name),'[]'::jsonb)
 INTO result FROM public.bookings b JOIN public.profiles p ON p.id=b.student_id WHERE b.session_id=p_session AND b.status='confirmed';
 RETURN result;
END $$;

CREATE OR REPLACE FUNCTION public.flowie_v1_packages(p_student uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE uid uuid:=auth.uid(); target uuid; result jsonb;
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'UNAUTHENTICATED'; END IF;
 IF p_student IS NULL AND flowie_private.is_admin() THEN target:=NULL;
 ELSE target:=coalesce(p_student,uid); IF target<>uid AND NOT flowie_private.is_admin() THEN RAISE EXCEPTION 'FORBIDDEN'; END IF; END IF;
 SELECT coalesce(jsonb_agg(to_jsonb(sp) || jsonb_build_object('course_packages',jsonb_build_object('name',cp.name),
  'balance',(SELECT coalesce(sum(l.delta),0) FROM public.credit_ledger l WHERE l.student_package_id=sp.id),
  'status',CASE WHEN sp.is_active THEN 'active' ELSE 'inactive' END) ORDER BY sp.expires_at),'[]'::jsonb)
 INTO result FROM public.student_packages sp JOIN public.course_packages cp ON cp.id=sp.package_id WHERE target IS NULL OR sp.student_id=target;
 RETURN result;
END $$;

CREATE OR REPLACE FUNCTION public.flowie_v1_report(p_from timestamptz,p_to timestamptz,p_branch uuid DEFAULT NULL,p_status text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE sc bigint; cap bigint; bc bigint; ac bigint; uc bigint; ca bigint; result jsonb;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'UNAUTHENTICATED'; END IF;
 IF NOT flowie_private.is_admin() THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
 IF p_from IS NULL OR p_to IS NULL OR p_to<=p_from OR p_to-p_from>interval '370 days' THEN RAISE EXCEPTION 'INVALID_INTERVAL'; END IF;
 IF p_status IS NOT NULL AND p_status NOT IN ('scheduled','completed','cancelled') THEN RAISE EXCEPTION 'INVALID_STATUS'; END IF;
 SELECT count(*),coalesce(sum(s.capacity) FILTER(WHERE s.status<>'cancelled'),0) INTO sc,cap
 FROM public.class_sessions s JOIN public.rooms r ON r.id=s.room_id WHERE s.starts_at>=p_from AND s.starts_at<p_to AND (p_branch IS NULL OR r.branch_id=p_branch) AND (p_status IS NULL OR s.status=p_status);
 SELECT count(*) FILTER(WHERE b.status='confirmed'),count(*) FILTER(WHERE b.status='confirmed' AND b.attendance_status='present'),count(*) FILTER(WHERE b.status='confirmed' AND b.attendance_status='unconfirmed')
 INTO bc,ac,uc FROM public.bookings b JOIN public.class_sessions s ON s.id=b.session_id JOIN public.rooms r ON r.id=s.room_id
 WHERE s.starts_at>=p_from AND s.starts_at<p_to AND (p_branch IS NULL OR r.branch_id=p_branch) AND (p_status IS NULL OR s.status=p_status);
 SELECT count(*) INTO ca FROM public.bookings b JOIN public.class_sessions s ON s.id=b.session_id JOIN public.rooms r ON r.id=s.room_id
 WHERE b.status='cancelled' AND b.cancelled_at>=p_from AND b.cancelled_at<p_to AND (p_branch IS NULL OR r.branch_id=p_branch) AND (p_status IS NULL OR s.status=p_status);
 SELECT jsonb_build_object('session_count',sc,'booking_count',bc,'attendance_count',ac,'unconfirmed_attendance_count',uc,'cancellation_count',ca,
 'teacher_session_count',sc,'booking_rate',CASE WHEN cap>0 THEN round(100.0*bc/cap,1) END,
 'attendance_rate',CASE WHEN bc-uc>0 THEN round(100.0*ac/(bc-uc),1) END,
 'cancellation_rate',CASE WHEN bc+ca>0 THEN round(100.0*ca/(bc+ca),1) END,'room_utilization_rate',NULL) INTO result;
 RETURN result;
END $$;

CREATE OR REPLACE FUNCTION public.flowie_v1_teaching_records(p_from timestamptz,p_to timestamptz)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE uid uuid:=auth.uid(); result jsonb;
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'UNAUTHENTICATED'; END IF;
 IF p_from IS NULL OR p_to IS NULL OR p_to<=p_from OR p_to-p_from>interval '370 days' THEN RAISE EXCEPTION 'INVALID_INTERVAL'; END IF;
 IF NOT flowie_private.is_admin() AND NOT EXISTS(SELECT 1 FROM public.teachers t JOIN public.profiles p ON p.id=t.id WHERE t.id=uid AND t.is_active AND p.is_active) THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
 SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.starts_at DESC),'[]'::jsonb) INTO result FROM (
 SELECT s.id AS session_id,b.name AS branch_name,r.name AS room_name,c.name AS course_name,p.display_name AS teacher_name,s.starts_at,s.ends_at,s.status,
 (extract(epoch from(s.ends_at-s.starts_at))/60)::integer AS duration_minutes,
 (SELECT count(*) FROM public.bookings bk WHERE bk.session_id=s.id AND bk.status='confirmed') AS booking_count,
 (SELECT count(*) FROM public.bookings bk WHERE bk.session_id=s.id AND bk.status='confirmed' AND bk.attendance_status='present') AS attendance_count
 FROM public.class_sessions s JOIN public.rooms r ON r.id=s.room_id JOIN public.branches b ON b.id=r.branch_id JOIN public.courses c ON c.id=s.course_id JOIN public.profiles p ON p.id=s.teacher_id
 WHERE s.starts_at>=p_from AND s.starts_at<p_to AND (flowie_private.is_admin() OR s.teacher_id=uid) ORDER BY s.starts_at DESC LIMIT 1000) x;
 RETURN result;
END $$;

CREATE OR REPLACE FUNCTION public.flowie_v1_schedule(p_session uuid,p_room uuid,p_course uuid,p_teacher uuid,p_starts timestamptz,p_ends timestamptz,p_capacity integer,p_opens timestamptz,p_closes timestamptz,p_deadline timestamptz,p_until date DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE s public.class_sessions%ROWTYPE; batch uuid; i integer:=0; ids uuid[]:='{}'; start_i timestamptz; end_i timestamptz;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'UNAUTHENTICATED'; END IF;
 IF NOT flowie_private.is_admin() THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
 IF p_starts IS NULL OR p_ends IS NULL OR p_starts<=now() OR p_ends<=p_starts OR p_capacity IS NULL OR p_capacity<=0 THEN RAISE EXCEPTION 'INVALID_INTERVAL'; END IF;
 IF NOT EXISTS (SELECT 1 FROM public.rooms r JOIN public.branches b ON b.id=r.branch_id WHERE r.id=p_room AND r.is_active AND b.is_active AND p_capacity<=r.capacity)
    OR NOT EXISTS(SELECT 1 FROM public.courses c JOIN public.course_categories cc ON cc.id=c.category_id WHERE c.id=p_course AND c.is_active AND cc.is_active)
    OR NOT EXISTS(SELECT 1 FROM public.teachers t JOIN public.profiles p ON p.id=t.id WHERE t.id=p_teacher AND t.is_active AND p.is_active AND p.display_name IS NOT NULL) THEN RAISE EXCEPTION 'SESSION_UNAVAILABLE'; END IF;
 IF p_session IS NOT NULL THEN
   SELECT * INTO s FROM public.class_sessions WHERE id=p_session FOR UPDATE;
   IF NOT FOUND OR s.status<>'scheduled' OR s.starts_at<=now() THEN RAISE EXCEPTION 'SESSION_UNAVAILABLE'; END IF;
   IF EXISTS(SELECT 1 FROM public.bookings WHERE session_id=p_session) THEN RAISE EXCEPTION 'BOOKED_SESSION_CHANGE_REQUIRES_CANCELLATION'; END IF;
   UPDATE public.class_sessions SET room_id=p_room,course_id=p_course,teacher_id=p_teacher,starts_at=p_starts,ends_at=p_ends,capacity=p_capacity,booking_opens_at=coalesce(p_opens,now()),booking_closes_at=p_closes,cancellation_deadline_override_at=p_deadline WHERE id=p_session;
   RETURN jsonb_build_array(p_session);
 END IF;
 IF p_until IS NOT NULL AND (p_until<(p_starts AT TIME ZONE 'Asia/Taipei')::date OR p_until>(p_starts AT TIME ZONE 'Asia/Taipei')::date+180) THEN RAISE EXCEPTION 'INVALID_INTERVAL'; END IF;
 IF p_until IS NOT NULL THEN batch:=gen_random_uuid(); END IF;
 LOOP
   start_i:=p_starts+make_interval(days=>i*7); end_i:=p_ends+make_interval(days=>i*7);
   EXIT WHEN i>0 AND (p_until IS NULL OR (start_i AT TIME ZONE 'Asia/Taipei')::date>p_until);
   INSERT INTO public.class_sessions(room_id,course_id,teacher_id,starts_at,ends_at,capacity,booking_opens_at,booking_closes_at,cancellation_deadline_override_at,series_id)
   VALUES(p_room,p_course,p_teacher,start_i,end_i,p_capacity,coalesce(p_opens,now()),p_closes+make_interval(days=>i*7),p_deadline+make_interval(days=>i*7),batch) RETURNING * INTO s;
   ids:=array_append(ids,s.id); i:=i+1;
 END LOOP;
 RETURN to_jsonb(ids);
END $$;

-- 管理員取消場次時，所有有效預約與原扣堂必須在同一交易內退回。
CREATE OR REPLACE FUNCTION public.flowie_v1_cancel_session(p_session uuid)
RETURNS public.class_sessions LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE s public.class_sessions%ROWTYPE; b public.bookings%ROWTYPE; debit public.credit_ledger%ROWTYPE;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'UNAUTHENTICATED'; END IF;
 IF NOT flowie_private.is_admin() THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
 SELECT * INTO s FROM public.class_sessions WHERE id=p_session FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'FORBIDDEN_OR_NOT_FOUND'; END IF;
 IF s.status='cancelled' THEN RETURN s; END IF;
 IF s.status<>'scheduled' OR s.starts_at<=now() THEN RAISE EXCEPTION 'SESSION_STARTED'; END IF;
 FOR b IN SELECT bk.* FROM public.bookings bk LEFT JOIN public.credit_ledger l ON l.booking_id=bk.id AND l.entry_type='BOOKING_DEBIT'
   WHERE bk.session_id=s.id AND bk.status='confirmed' ORDER BY l.student_package_id NULLS FIRST,bk.id FOR UPDATE OF bk LOOP
   SELECT * INTO debit FROM public.credit_ledger WHERE booking_id=b.id AND entry_type='BOOKING_DEBIT';
   IF NOT FOUND THEN RAISE EXCEPTION 'MISSING_BOOKING_DEBIT'; END IF;
   PERFORM 1 FROM public.student_packages WHERE id=debit.student_package_id FOR UPDATE;
   UPDATE public.bookings SET status='cancelled',cancelled_at=now() WHERE id=b.id;
   INSERT INTO public.credit_ledger(student_package_id,booking_id,entry_type,delta,operator_id,idempotency_key)
   VALUES(debit.student_package_id,b.id,'CANCELLATION_REFUND',-debit.delta,auth.uid(),'flowie:refund:'||b.id::text);
 END LOOP;
 UPDATE public.class_sessions SET status='cancelled' WHERE id=s.id RETURNING * INTO s;
 RETURN s;
END $$;

CREATE OR REPLACE FUNCTION public.flowie_v1_set_student_active(p_student uuid,p_active boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'UNAUTHENTICATED'; END IF;
 IF NOT flowie_private.is_admin() THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
 IF p_active IS NULL OR p_student=auth.uid() OR EXISTS(SELECT 1 FROM public.profiles WHERE id=p_student AND is_admin) THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
 UPDATE public.profiles SET is_active=p_active WHERE id=p_student;
 IF NOT FOUND THEN RAISE EXCEPTION 'FORBIDDEN_OR_NOT_FOUND'; END IF;
END $$;

-- 交易函式只能由已登入使用者呼叫，函式內再次檢查身分與授權。
REVOKE ALL ON FUNCTION public.flowie_v1_book(uuid,text),public.flowie_v1_cancel_booking(uuid),public.flowie_v1_issue_package(uuid,uuid,text,timestamptz),public.flowie_v1_adjust_credits(uuid,integer,text,text),public.flowie_v1_bookings(uuid),public.flowie_v1_mark_attendance(uuid,text),public.flowie_v1_session_students(uuid),public.flowie_v1_set_student_active(uuid,boolean),public.flowie_v1_schedule(uuid,uuid,uuid,uuid,timestamptz,timestamptz,integer,timestamptz,timestamptz,timestamptz,date),public.flowie_v1_cancel_session(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.flowie_v1_book(uuid,text),public.flowie_v1_cancel_booking(uuid),public.flowie_v1_issue_package(uuid,uuid,text,timestamptz),public.flowie_v1_adjust_credits(uuid,integer,text,text),public.flowie_v1_bookings(uuid),public.flowie_v1_mark_attendance(uuid,text),public.flowie_v1_session_students(uuid),public.flowie_v1_set_student_active(uuid,boolean),public.flowie_v1_schedule(uuid,uuid,uuid,uuid,timestamptz,timestamptz,integer,timestamptz,timestamptz,timestamptz,date),public.flowie_v1_cancel_session(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.flowie_v1_packages(uuid),public.flowie_v1_report(timestamptz,timestamptz,uuid,text),public.flowie_v1_teaching_records(timestamptz,timestamptz) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.flowie_v1_packages(uuid),public.flowie_v1_report(timestamptz,timestamptz,uuid,text),public.flowie_v1_teaching_records(timestamptz,timestamptz) TO authenticated;
COMMIT;

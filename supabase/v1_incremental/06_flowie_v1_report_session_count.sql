-- Flowie V1 增量修正：區間報表的未取消排課場次
-- 必須先完成 V1 的 01～04，以及 05_flowie_v1_api_and_transactions.sql。
-- 不建立或刪除資料表，也不更動既有資料列；僅更新既有的報表函式。
-- teacher_session_count 計算區間內狀態為 scheduled 或 completed 的場次；
-- 已取消場次不計入。此數字代表未取消的排課，不代表確認實際授課。
BEGIN;
DO $preflight$
BEGIN
  IF to_regprocedure('public.flowie_v1_report(timestamp with time zone,timestamp with time zone,uuid,text)') IS NULL THEN
    RAISE EXCEPTION 'FLOWIE_V1_05_REQUIRED: 請先執行 05_flowie_v1_api_and_transactions.sql';
  END IF;
END
$preflight$;

CREATE OR REPLACE FUNCTION public.flowie_v1_report(p_from timestamptz,p_to timestamptz,p_branch uuid DEFAULT NULL,p_status text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE sc bigint; teacher_sc bigint; cap bigint; bc bigint; ac bigint; uc bigint; ca bigint; result jsonb;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'UNAUTHENTICATED'; END IF;
 IF NOT flowie_private.is_admin() THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
 IF p_from IS NULL OR p_to IS NULL OR p_to<=p_from OR p_to-p_from>interval '370 days' THEN RAISE EXCEPTION 'INVALID_INTERVAL'; END IF;
 IF p_status IS NOT NULL AND p_status NOT IN ('scheduled','completed','cancelled') THEN RAISE EXCEPTION 'INVALID_STATUS'; END IF;
 SELECT count(*),count(*) FILTER(WHERE s.status<>'cancelled'),coalesce(sum(s.capacity) FILTER(WHERE s.status<>'cancelled'),0) INTO sc,teacher_sc,cap
 FROM public.class_sessions s JOIN public.rooms r ON r.id=s.room_id WHERE s.starts_at>=p_from AND s.starts_at<p_to AND (p_branch IS NULL OR r.branch_id=p_branch) AND (p_status IS NULL OR s.status=p_status);
 SELECT count(*) FILTER(WHERE b.status='confirmed'),count(*) FILTER(WHERE b.status='confirmed' AND b.attendance_status='present'),count(*) FILTER(WHERE b.status='confirmed' AND b.attendance_status='unconfirmed')
 INTO bc,ac,uc FROM public.bookings b JOIN public.class_sessions s ON s.id=b.session_id JOIN public.rooms r ON r.id=s.room_id
 WHERE s.starts_at>=p_from AND s.starts_at<p_to AND (p_branch IS NULL OR r.branch_id=p_branch) AND (p_status IS NULL OR s.status=p_status);
 SELECT count(*) INTO ca FROM public.bookings b JOIN public.class_sessions s ON s.id=b.session_id JOIN public.rooms r ON r.id=s.room_id
 WHERE b.status='cancelled' AND b.cancelled_at>=p_from AND b.cancelled_at<p_to AND (p_branch IS NULL OR r.branch_id=p_branch) AND (p_status IS NULL OR s.status=p_status);
 SELECT jsonb_build_object('session_count',sc,'booking_count',bc,'attendance_count',ac,'unconfirmed_attendance_count',uc,'cancellation_count',ca,
 'teacher_session_count',teacher_sc,'booking_rate',CASE WHEN cap>0 THEN round(100.0*bc/cap,1) END,
 'attendance_rate',CASE WHEN bc-uc>0 THEN round(100.0*ac/(bc-uc),1) END,
 'cancellation_rate',CASE WHEN bc+ca>0 THEN round(100.0*ca/(bc+ca),1) END,'room_utilization_rate',NULL) INTO result;
 RETURN result;
END $$;


COMMIT;

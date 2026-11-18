-- 在已執行 01～06 的 V1 資料庫執行一次。先在測試專案驗證；勿重跑 01～04。
BEGIN;
CREATE TABLE public.knowledge_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL CHECK (btrim(title) <> ''),
  body_area text NOT NULL CHECK (btrim(body_area) <> ''),
  summary text NOT NULL CHECK (btrim(summary) <> ''),
  image_url text NOT NULL CHECK (btrim(image_url) <> ''),
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.knowledge_articles FOR EACH ROW EXECUTE FUNCTION flowie_private.set_updated_at();
ALTER TABLE public.knowledge_articles ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.knowledge_articles FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.knowledge_articles TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.knowledge_articles TO authenticated;
CREATE POLICY knowledge_read ON public.knowledge_articles FOR SELECT TO anon, authenticated USING (is_active OR (SELECT flowie_private.is_admin()));
CREATE POLICY knowledge_insert ON public.knowledge_articles FOR INSERT TO authenticated WITH CHECK ((SELECT flowie_private.is_admin()));
CREATE POLICY knowledge_update ON public.knowledge_articles FOR UPDATE TO authenticated USING ((SELECT flowie_private.is_admin())) WITH CHECK ((SELECT flowie_private.is_admin()));
CREATE POLICY knowledge_delete ON public.knowledge_articles FOR DELETE TO authenticated USING ((SELECT flowie_private.is_admin()));
INSERT INTO public.knowledge_articles (title, body_area, summary, image_url, sort_order) VALUES
 ('橋式：喚醒臀部與核心', '臀部・核心', '以穩定呼吸配合骨盆抬升，感受臀部與腹部的參與。依自身狀況調整幅度。', '/images/knowledge-bridge.svg', 1),
 ('貓牛式：讓背部溫柔活動', '脊椎・肩背', '緩慢配合呼吸活動脊椎，留意肩頸放鬆，不必追求大幅度。', '/images/knowledge-cat-cow.svg', 2),
 ('側躺抬腿：覺察髖部力量', '髖部・臀側', '側躺時保持軀幹穩定，練習髖部控制與臀側肌群覺察。', '/images/knowledge-side-leg.svg', 3);
UPDATE public.homepage_sections SET title = '認識自己的身體', subtitle = '從皮拉提斯練習認識身體的力量與活動。' WHERE section_type = 'teachers';
ALTER TABLE public.bookings ADD COLUMN teacher_feedback text CHECK (teacher_feedback IS NULL OR (char_length(btrim(teacher_feedback)) BETWEEN 1 AND 2000));
-- 已有的 flowie_v1_bookings 使用 to_jsonb(b)，新增欄位會自然出現在本人上課紀錄。
-- 函式 flowie_v1_set_teacher_feedback：由授權老師／管理員保存課後建議。
CREATE OR REPLACE FUNCTION public.flowie_v1_set_teacher_feedback(p_booking uuid, p_feedback text)
RETURNS public.bookings LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE uid uuid := auth.uid(); result public.bookings%ROWTYPE;
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'UNAUTHENTICATED'; END IF;
 IF p_feedback IS NULL OR char_length(btrim(p_feedback)) NOT BETWEEN 1 AND 2000 THEN RAISE EXCEPTION 'INVALID_FEEDBACK'; END IF;
 UPDATE public.bookings b SET teacher_feedback = btrim(p_feedback)
 FROM public.class_sessions s
 WHERE b.id = p_booking AND b.session_id = s.id AND b.status = 'confirmed'
   AND (flowie_private.is_admin() OR (s.teacher_id = uid AND EXISTS (
     SELECT 1 FROM public.teachers t JOIN public.profiles p ON p.id=t.id
     WHERE t.id=uid AND t.is_active AND p.is_active)))
 RETURNING b.* INTO result;
 IF NOT FOUND THEN RAISE EXCEPTION 'FORBIDDEN_OR_NOT_FOUND'; END IF;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.flowie_v1_set_teacher_feedback(uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.flowie_v1_set_teacher_feedback(uuid,text) TO authenticated;
-- 場次學生名單只限該場老師或管理員，讓老師可再次編輯已寫的建議。
-- 函式 flowie_v1_session_students：沿用既有 V1 的資料讀取、完整性或權限檢查；本次僅補註解，不改變函式定義。
CREATE OR REPLACE FUNCTION public.flowie_v1_session_students(p_session uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE uid uuid:=auth.uid(); result jsonb;
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'UNAUTHENTICATED'; END IF;
 IF NOT flowie_private.is_admin() AND NOT EXISTS (SELECT 1 FROM public.class_sessions s JOIN public.teachers t ON t.id=s.teacher_id JOIN public.profiles p ON p.id=t.id WHERE s.id=p_session AND t.id=uid AND t.is_active AND p.is_active) THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
 SELECT coalesce(jsonb_agg(jsonb_build_object('booking_id',b.id,'student_id',b.student_id,'student_name',p.display_name,'status',b.status,'attendance_status',b.attendance_status,'teacher_feedback',b.teacher_feedback) ORDER BY p.display_name),'[]'::jsonb)
 INTO result FROM public.bookings b JOIN public.profiles p ON p.id=b.student_id WHERE b.session_id=p_session AND b.status='confirmed';
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.flowie_v1_session_students(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.flowie_v1_session_students(uuid) TO authenticated;
COMMIT;

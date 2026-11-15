-- 選用：須先執行 01、02，並先建立真正的 Supabase Auth 帳號。
-- 將 teacher_user_id 改成該帳號的 User UID；只供測試，日期從明天起算。
BEGIN;
DO $$
DECLARE
  teacher_user_id uuid := '8af16db2-1a4a-43f2-96d0-d3553a644b0c'; -- 例：'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'::uuid
  first_date date := (now() AT TIME ZONE 'Asia/Taipei')::date + 1;
BEGIN
  IF teacher_user_id IS NULL THEN RAISE EXCEPTION '請先填入老師的 Auth User UID'; END IF;
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = teacher_user_id) THEN RAISE EXCEPTION '老師 UID 不存在於 Supabase Auth'; END IF;
  IF EXISTS (SELECT 1 FROM public.class_sessions WHERE id IN (
    '90000000-0000-4000-8000-000000000001'::uuid,'90000000-0000-4000-8000-000000000002'::uuid,
    '90000000-0000-4000-8000-000000000003'::uuid,'90000000-0000-4000-8000-000000000004'::uuid,
    '90000000-0000-4000-8000-000000000005'::uuid,'90000000-0000-4000-8000-000000000006'::uuid
  )) THEN RAISE EXCEPTION '示範場次已存在；此示範腳本只應執行一次'; END IF;
  INSERT INTO public.profiles(id, display_name) VALUES (teacher_user_id, '示範老師')
  ON CONFLICT (id) DO UPDATE SET display_name = COALESCE(public.profiles.display_name, EXCLUDED.display_name);
  INSERT INTO public.teachers(id) VALUES (teacher_user_id) ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.class_sessions(id, room_id, course_id, teacher_id, starts_at, ends_at, capacity)
  SELECT (ARRAY['90000000-0000-4000-8000-000000000001'::uuid,'90000000-0000-4000-8000-000000000002'::uuid,'90000000-0000-4000-8000-000000000003'::uuid,'90000000-0000-4000-8000-000000000004'::uuid,'90000000-0000-4000-8000-000000000005'::uuid,'90000000-0000-4000-8000-000000000006'::uuid])[n],
    (ARRAY['30000000-0000-4000-8000-000000000001'::uuid,'30000000-0000-4000-8000-000000000002'::uuid,'30000000-0000-4000-8000-000000000003'::uuid,'30000000-0000-4000-8000-000000000004'::uuid])[1 + (n - 1) % 4],
    (ARRAY['60000000-0000-4000-8000-000000000001'::uuid,'60000000-0000-4000-8000-000000000002'::uuid,'60000000-0000-4000-8000-000000000003'::uuid,'60000000-0000-4000-8000-000000000004'::uuid,'60000000-0000-4000-8000-000000000005'::uuid,'60000000-0000-4000-8000-000000000006'::uuid])[n],
    teacher_user_id, ((first_date + (n - 1)) + time '10:00') AT TIME ZONE 'Asia/Taipei',
    ((first_date + (n - 1)) + time '11:00') AT TIME ZONE 'Asia/Taipei', 8
  FROM generate_series(1, 6) AS n
  ON CONFLICT (id) DO NOTHING;
END $$;
COMMIT;


--檢查用
SELECT
    cs.id,
    c.name AS course_name,
    p.display_name AS teacher_name,
    b.name AS branch_name,
    r.name AS room_name,
    cs.starts_at AT TIME ZONE 'Asia/Taipei' AS start_time,
    cs.ends_at AT TIME ZONE 'Asia/Taipei' AS end_time,
    cs.capacity,
    cs.status
FROM public.class_sessions cs
JOIN public.courses c ON c.id = cs.course_id
JOIN public.teachers t ON t.id = cs.teacher_id
JOIN public.profiles p ON p.id = t.id
JOIN public.rooms r ON r.id = cs.room_id
JOIN public.branches b ON b.id = r.branch_id
ORDER BY cs.starts_at;
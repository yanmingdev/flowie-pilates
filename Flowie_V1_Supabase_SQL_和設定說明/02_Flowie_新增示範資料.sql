-- 請在 01 建表後執行一次。所有內容都是示範值，請在上線前自行修改。
-- 不建立虛構 Auth 帳號、老師、場次、預約或堂數；它們需有真正的使用者與交易。
BEGIN;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.site_settings) OR EXISTS (SELECT 1 FROM public.homepage_sections)
     OR EXISTS (SELECT 1 FROM public.branches) OR EXISTS (SELECT 1 FROM public.rooms)
     OR EXISTS (SELECT 1 FROM public.course_categories) OR EXISTS (SELECT 1 FROM public.courses)
     OR EXISTS (SELECT 1 FROM public.course_packages) OR EXISTS (SELECT 1 FROM public.announcements) THEN
    RAISE EXCEPTION '已有內容資料；示範資料僅適用於剛建表的空白資料庫。';
  END IF;
END $$;
INSERT INTO public.site_settings(id, brand_name, logo_url, brand_tagline, contact_email, contact_phone, cancellation_hours)
VALUES (1, 'Flowie 芙洛', '/logo.svg', '在呼吸與流動之間，找到自己的節奏。', NULL, NULL, 12);
INSERT INTO public.homepage_sections(section_type, title, subtitle, image_url, link_url, sort_order) VALUES
('hero', '找到自己的節奏', '從呼吸開始，與更好的自己相遇。', '/images/flowie-hero.png', '/classes', 1),
('courses', '近期課程', '一起在每一天，找到你的 flow。', NULL, NULL, 2),
('quick_booking', '為自己留一段時間', '選擇適合你的課程', NULL, NULL, 3),
('teachers', '認識我們的老師', '用專業與溫柔，陪你練習。', NULL, NULL, 4),
('announcements', '最新消息', 'Flowie 的日常與提醒', NULL, NULL, 5);
INSERT INTO public.branches(id, name, address) VALUES
('20000000-0000-4000-8000-000000000001', '南港館', '台北市南港區（示範地址）'),
('20000000-0000-4000-8000-000000000002', '信義館', '台北市信義區（示範地址）');
INSERT INTO public.rooms(id, branch_id, name, capacity) VALUES
('30000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','晨光教室',10),
('30000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000001','流動教室',8),
('30000000-0000-4000-8000-000000000003','20000000-0000-4000-8000-000000000002','日和教室',10),
('30000000-0000-4000-8000-000000000004','20000000-0000-4000-8000-000000000002','木沐教室',8);
INSERT INTO public.course_categories(id, name, sort_order) VALUES
('50000000-0000-4000-8000-000000000001','皮拉提斯',1),
('50000000-0000-4000-8000-000000000002','瑜珈',2),
('50000000-0000-4000-8000-000000000003','舒緩伸展',3);
INSERT INTO public.courses(id, category_id, name, description, image_url, default_duration_minutes, difficulty, credit_cost) VALUES
('60000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-000000000001','初晨墊上皮拉提斯','從核心與呼吸開始，喚醒全身。','/images/flowie-course.png',60,'入門',1),
('60000000-0000-4000-8000-000000000002','50000000-0000-4000-8000-000000000001','器械基礎','透過器械輔助，練習穩定控制。','/images/flowie-course.png',60,'入門',1),
('60000000-0000-4000-8000-000000000003','50000000-0000-4000-8000-000000000002','柔和流動瑜珈','在流動中找到呼吸節奏。','/images/flowie-course.png',60,'入門',1),
('60000000-0000-4000-8000-000000000004','50000000-0000-4000-8000-000000000003','晚安舒緩伸展','釋放久坐後的緊繃。','/images/flowie-course.png',60,'所有程度',1),
('60000000-0000-4000-8000-000000000005','50000000-0000-4000-8000-000000000001','核心平衡練習','以穩定的節奏培養核心力量。','/images/flowie-course.png',60,'初中階',1),
('60000000-0000-4000-8000-000000000006','50000000-0000-4000-8000-000000000002','週末呼吸瑜珈','為週末留一點空白。','/images/flowie-course.png',60,'所有程度',1);
INSERT INTO public.course_packages(id, name, total_credits, validity_days) VALUES
('70000000-0000-4000-8000-000000000001','自在流動 10 堂',10,180),
('70000000-0000-4000-8000-000000000002','輕盈體驗 5 堂',5,90);
INSERT INTO public.announcements(id, title, content) VALUES
('80000000-0000-4000-8000-000000000001','歡迎來到 Flowie','請在上課前提早 10 分鐘抵達，讓自己慢慢準備。');
COMMIT;

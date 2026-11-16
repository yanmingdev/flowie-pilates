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

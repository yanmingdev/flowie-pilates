# 前端畫面、資料表與初始資料對照

畫面以欄位值渲染，並不把每種重複的課程、分店、老師或文字各建一欄。資料表以單數資料列和關聯表正規化，對外 API 欄位採 snake_case，ID 使用 UUID；`studio_id` 分隔品牌。

| 畫面／操作 | 主要資料表與欄位 | 讀寫方式／備註 |
|---|---|---|
| 網站標誌與頁尾 | `studios.name`, `studios.logo_url`; `site_settings.brand_tagline`, `contact_email`, `contact_phone` | 公開資料；版型、導覽文字及 CSS 色彩屬程式。 |
| 首頁主視覺 | `banners.title`, `subtitle`, `image_url`, `link_url`, `sort_order`, `is_active`; `homepage_sections`; `site_settings.headline`, `subheadline` | 啟用且排序第一的 Banner 優先，其次首頁區塊，最後網站設定文字。 |
| 首頁區塊 | `homepage_sections.section_type`, `title`, `subtitle`, `sort_order`, `is_active` | 決定既有區塊順序及顯示；種類與版型由程式定義。 |
| 近期課程、課程探索與詳情 | `courses.name`, `description`, `difficulty`, `duration_minutes`, `credit_cost`, `image_url`; `class_sessions.starts_at`, `ends_at`, `capacity`, `booking_opens_at`, `booking_closes_at`; `branches`, `rooms`, `teachers`, `course_categories` | `/sessions` 經 `session_catalog` 整合場次；名額依場次與教室上限、有效預約計算。 |
| 收藏 | `course_favorites` 關聯 `student_details` 和 `courses` | `/favorites` 與 `set_course_favorite`，按本人與品牌隔離；收藏課程不是收藏單一場次。 |
| 預約、取消、堂數 | `bookings`, `course_packages`, `student_packages`, `package_courses`, `credit_ledger`, `booking_settings` | 由 RPC 原子地檢查名額與資格、扣堂或退堂；已預約的取消期限為快照。 |
| 上課紀錄／出席 | `bookings`, `class_sessions`, `attendance`, `courses`, `teachers` | 只顯示本人資料；老師可標記自己授課場次的出勤。 |
| 個人資料 | `profiles`, `studio_memberships`, `student_details` | `profiles` 是帳號資料；`student_details` 為品牌內學生資料，品牌備註在 membership。 |
| 公告、老師 | `announcements.title`, `content`, 有效區間；`teachers.name`, `photo_url`, `specialty`, `bio` | 公開顯示；課程資格、分店及時間由各關聯表維護。 |
| 管理排課／日曆 | `branches`, `rooms`, `room_availability`, `teachers`, `teacher_branches`, `teacher_courses`, `teacher_availability`, `teacher_time_off`, `schedule_rules`, `class_sessions` | 衝堂、教室時段、容量及授課資格由資料庫約束／RPC 驗證。 |
| 報表 | `class_sessions`, `bookings`, `attendance`, `rooms`, `room_availability` | `business_metrics` 計算營運數值；公式與歷史限制見 DATABASE。 |

## SQL 初始資料

整合檔 `00_flowie_install_schema_and_seed.sql` 的第一部分建立結構、權限及函式，第二部分插入一個示範品牌、2 間分店、4 間教室與每週 28 個教室時段、4 位老師、3 個課程分類、6 種課程、2 種堂數方案、首頁設定、Banner、公告，以及執行當日附近的示範場次。這些都是可修改的示範值，並非真實課表或販售價格。帳號、密碼、學生餘額、預約與出勤**不由此 SQL 插入**；需要註冊真實 Auth 使用者並透過操作授予方案。本機可另執行示範帳號腳本。

示範 Banner、課程圖片和標誌的資料庫值分別是 `/images/flowie-hero.png`、`/images/flowie-course.png`、`/logo.svg`；這些是前端專案內的公開檔案，需一併部署前端。也可將圖片上傳 Supabase Storage 後，以公開 HTTPS 圖片 URL 取代欄位值。

## 可在測試專案修改的例子

以下 UUID 僅對本版示範資料有效。在 Supabase SQL Editor 執行後重新整理畫面；正式資料請使用自己的 ID，先備份並核對影響範圍。

```sql
update public.courses
set name = '我的皮拉提斯課程', description = '依照你的課程內容修改。'
where studio_id = '10000000-0000-4000-8000-000000000001'
  and id = '60000000-0000-4000-8000-000000000001';

update public.banners
set title = '找到自己的節奏', image_url = 'https://example.com/your-image.jpg'
where studio_id = '10000000-0000-4000-8000-000000000001' and sort_order = 1;
```

一般內容可用管理後台或 Table Editor 更新；不要直接修改預約、學生方案餘額、帳本或出勤等交易資料，應使用後台／授權 RPC。結構、RLS 或函式變更應新增 migration。RLS 不會限制 Supabase SQL Editor 的高權限操作。

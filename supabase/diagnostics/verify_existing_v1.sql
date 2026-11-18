-- 唯讀盤點：在現有 Supabase SQL Editor 執行；不修改表、角色或資料。
-- 此檔不是 migration，不納入 01～07 安裝順序，可重跑。
-- NULL 表示目前 public schema 找不到；先確認缺漏原因，再決定是否套用尚未執行的 SQL。
WITH expected(table_name) AS (
  VALUES ('profiles'), ('site_settings'), ('homepage_sections'), ('branches'),
         ('rooms'), ('teachers'), ('course_categories'), ('courses'),
         ('class_sessions'), ('course_favorites'), ('course_packages'),
         ('student_packages'), ('bookings'), ('credit_ledger'), ('announcements'),
         ('knowledge_articles')
)
SELECT table_name,
       to_regclass('public.' || table_name) AS existing_table,
       CASE WHEN to_regclass('public.' || table_name) IS NOT NULL
            THEN has_table_privilege('anon', to_regclass('public.' || table_name), 'SELECT')
            ELSE false END AS anon_has_select
FROM expected ORDER BY table_name;

-- teacher_feedback 是 07 的另一個必要欄位；沒有結果表示該欄目前不可見或不存在。
SELECT table_name, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'bookings'
  AND column_name = 'teacher_feedback';

-- 列出目前已存在的 Flowie 公開函式簽名，不呼叫交易、不暴露函式實作。
SELECT p.proname AS function_name, pg_get_function_identity_arguments(p.oid) AS arguments
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname LIKE 'flowie_%'
ORDER BY p.proname, arguments;

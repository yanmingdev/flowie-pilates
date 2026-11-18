# Flowie V1：Supabase 建立與初始資料

本資料包依照這次的 **15 張資料表、116 個欄位** 設計。Excel 的總覽列出各表用途；每張表各有一個分頁，說明欄位、型別、是否可空、主外鍵、限制及示例。

**請先留意：**這次是新的資料庫設計與建表 SQL，先前的 Flowie V1.2 專案和舊版 SQL 使用不同表名及欄位，不能直接搭配此版資料庫。應先完成程式改寫及整合測試，才能使用預約、課程管理等功能。本次沒有連線或修改您的 Supabase 專案。

## 一、檔案與執行順序

| 順序 | 檔案 | 用途 |
| --- | --- | --- |
| 參考 | `Flowie_V1_15張資料表欄位字典.xlsx` | 查看 15 張表與 116 個欄位。 |
| 1 | `01_Flowie_建立資料表.sql` | 建立 15 張表、關聯、限制、索引、RLS、帳號初始化觸發器及公開老師資料函式。 |
| 2 | `02_Flowie_新增示範資料.sql` | 新增品牌、首頁、分店、教室、分類、課程、方案及公告的示範資料。 |
| 選用 | `03_Flowie_指定第一位管理員.sql` | 填入已存在的 Auth UID 後，設定第一位管理員。 |
| 選用 | `04_Flowie_建立示範老師與場次.sql` | 填入已存在的老師 Auth UID 後，新增一位示範老師及 6 個示範場次。 |

01、02 和 04 都以全新、空白環境為前提；01 偵測到同名表、02 偵測到既有內容，或 04 偵測到示範場次，會停止以避免混入既有資料。不要將舊版 SQL 與這次的 SQL 混用。預設取消期限 12 小時、所有方案適用全部課程，都是本次 V1 設計假設，請依實際營運確認。

## 二、在 Supabase 執行

1. 登入 [Supabase Dashboard](https://supabase.com/dashboard)，建立或選擇**全新、尚未建立這 15 張業務表的專案**，等待專案啟用。
2. 打開左側 **SQL Editor**，建立新的查詢。用文字編輯器開啟 `01_Flowie_建立資料表.sql`，複製整個檔案內容、貼入 SQL Editor，按 **Run**，確認沒有錯誤。
3. 建立另一個查詢，貼上完整的 `02_Flowie_新增示範資料.sql`，按 **Run**，確認沒有錯誤。
4. 到 **Table Editor**，選擇 `public` schema，即可看到 Excel 所列的 15 張表。01 已開啟 RLS；01 也會為 Auth 中既有帳號建立缺少的 `profiles`，之後的新註冊帳號會自動建立 profile。
5. 02 的分店地址、課程介紹、方案內容與公告均為示範，請依實際營運資料修改。聯絡 Email 和電話初始為 NULL，請在 `site_settings` 填入實際值。

SQL Editor 發生錯誤時先看錯誤訊息；每個腳本以交易執行，失敗時應先釐清原因。不要為了重跑而直接刪除已有正式資料的資料表。

## 三、可選：設定管理員及示範課表

1. 在 **Authentication → Users** 建立或使用真實帳號，複製該使用者的 User UID。使用 Auth 管理登入資料，不要自行向 `auth.users` 插入假帳號。
2. 如需設定第一位管理員，開啟 03，將 `admin_user_id uuid := NULL;` 替換為：

   ```sql
   admin_user_id uuid := '您的使用者-UUID'::uuid;
   ```

   保留單引號與 `::uuid`，只替換引號中的內容，再於 SQL Editor 執行。這只設定管理員旗標，不代表後台功能已完成。
3. 如需示範老師及課表，開啟 04，將 `teacher_user_id uuid := NULL;` 換成老師帳號的 Auth UID，方式同上，於 SQL Editor 執行一次。必須先完成 01 與 02。腳本只會在名稱尚未填寫時填入「示範老師」，不會覆寫既有名稱；該帳號需為啟用狀態。
4. 04 產生的 6 場示範課以執行時台北日期的隔天起算，每天 10:00–11:00；上線前請更換或清除示範資料。01、02 本身不會新增假老師、課程場次、預約或堂數。

## 四、檢查建表與初始值

在 SQL Editor 執行：

```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'profiles', 'site_settings', 'homepage_sections', 'branches', 'rooms',
    'teachers', 'course_categories', 'courses', 'class_sessions',
    'course_favorites', 'course_packages', 'student_packages',
    'bookings', 'credit_ledger', 'announcements'
  )
ORDER BY tablename;
```

應有 15 列，`rowsecurity` 均為 `true`。執行 02 後，網站設定 1 筆、首頁區塊 5 筆、分店 2 筆、教室 4 筆、課程分類 3 筆、課程 6 筆、方案 2 筆、公告 1 筆。老師及場次在執行選用的 04 前是空的；學生、收藏、方案持有、預約與帳本需要真實使用者及之後的業務操作。

## 五、後續維護與尚未完成的功能

- 首頁、品牌、分店、教室、課程、分類、方案範本和公告等內容，可由有資料庫管理權限的人在 Supabase Table Editor 維護；有些欄位有外鍵、非空或唯一限制。請在適當的測試環境先檢查修改效果。
- 初始圖片是前端相對路徑 `/logo.svg`、`/images/flowie-hero.png` 和 `/images/flowie-course.png`，SQL 不會把圖片上傳到 Supabase。部署時需讓前端提供這些檔案，或自行上傳並把欄位改成可使用的圖片網址。
- 公開內容設定了讀取政策；使用者只能讀取自己的私有資料或管理自己的收藏，管理員可讀取管理用途資料。一般帳號不能自行修改管理員旗標。可公開的老師姓名及照片應以 `flowie_public_teachers()` 讀取。
- **預約、取消、扣堂、退堂、發放方案、點名及後台排課尚未實作完整的安全後端交易／RPC。** 此 SQL 刻意不開放這些表由一般前端直接寫入；直接用 Table Editor 手動寫入交易資料也無法自動確保名額、餘額、退堂金額及並發一致性。這些功能須先補齊並測試，不能僅憑建表 SQL 上線。
- 查詢學生歷史預約及已停用課程／老師等情境，仍需在程式改寫時設計受控查詢及授權。刪除 Auth 帳號可能因歷史資料外鍵而被拒絕；正式營運前需另定帳號停用與保留流程。
- 後續改寫程式時，使用專案 URL 與可公開的 publishable key（或既有 anon key）並配合 RLS。Secret／service role key 具有高權限，請勿放入前端、Excel 或公開程式碼。

## 參考資料

- [Supabase：建立及管理資料表](https://supabase.com/docs/guides/database/tables)
- [Supabase：Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase：管理使用者資料](https://supabase.com/docs/guides/auth/managing-user-data)

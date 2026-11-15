# Supabase 完整設定與啟動

本指南針對「全新、空白的測試專案」。建議先完成測試，再建立獨立正式專案；不要把示範資料當成真實營運資料。SQL 與程式來自同一份版本，請勿混用舊版或另兩份結構不同的 SQL。

## 一、建立 Supabase 測試專案

1. 登入 [Supabase Dashboard](https://supabase.com/dashboard)，建立新專案，記下專案名稱與資料庫密碼，等專案啟動完成。
2. 在專案的 **Connect** 或 **Project Settings → API Keys** 找到 **Project URL** 和 **Publishable key**；若你的專案使用舊式金鑰，可使用 `anon` key。前、後端都連同一專案。
3. 在 **Authentication** 啟用 Email／Password 註冊登入。測試可依需要設定 Email confirmation；若開啟，使用者必須先完成信件驗證才能登入。正式使用前應設定自己的寄信服務與信件驗證流程。
4. 在 Authentication 的 URL Configuration 設定 Site URL 為 `http://localhost:5173`，Redirect URLs 加入 `http://localhost:5173/reset-password`。正式網站需改成自己的 HTTPS 網址並加入對應重設路徑。
5. 使用 **SQL Editor** 執行下列步驟。另一條 CLI 安裝路徑見下方；同一資料庫只選一條。

官方參考：[API keys](https://supabase.com/docs/guides/getting-started/api-keys)、[Email／密碼登入](https://supabase.com/docs/guides/auth/passwords)、[Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls)。Dashboard 的選單名稱可能隨版本調整。

## 二、在 SQL Editor 建立資料表與示範資料

對全新空白測試專案，開啟 `supabase/sql-editor/00_flowie_install_schema_and_seed.sql`，將全部內容貼入 Supabase Dashboard 的 SQL Editor 並按 Run。此檔包含建表、索引、約束、函式、RLS、Storage 政策及示範 `INSERT`，執行後不需要再執行 `01` 或 `02`。

也可依需求改選分開安裝：先執行 `01_flowie_schema.sql`，再視需要執行 `02_flowie_demo_seed.sql`。示範資料不是營運資料，不適合直接用於正式環境；不需要範例時只執行 `01`。

| 檔案 | 用途 |
|---|---|
| `00_flowie_install_schema_and_seed.sql` | 全新安裝的結構與示範資料整合檔，與 `01` + `02` 二擇一。 |
| `01_flowie_schema.sql` | 僅建立全部結構、RLS、RPC 及公開圖片 bucket／政策。 |
| `02_flowie_demo_seed.sql` | 可選示範資料，在 `01` 成功後執行。 |
| `03_first_platform_admin.sql` | 帳號建立後，授權指定的第一位平台管理員。 |

`00` 的結構與示範資料是兩個獨立交易：如果第二部分失敗，結構可能已成功建立；確認原因後可只重新執行 `02`，不要重跑 `00`。`01` 包含現有表／bucket 檢查；如回報 `FLOWIE_EXISTING_TABLES` 或 `FLOWIE_EXISTING_BUCKET`，停止並確認連線目標，不要刪除既有資料。`02` 若示範品牌已存在會拒絕重複匯入。

示範資料包含品牌、分店、教室、老師、課程、方案、網站內容與部分場次，但**不會建立 Auth 使用者、密碼、學生方案餘額、預約或出勤**。如需在雲端登入，請依下一步建立真實使用者；本機可另執行示範腳本。

執行後可檢查：

```sql
select to_regclass('public.studios') as studios,
       to_regclass('public.course_favorites') as course_favorites,
       to_regclass('public.room_availability') as room_availability,
       to_regclass('public.class_sessions') as class_sessions,
       to_regclass('public.credit_ledger') as credit_ledger;
select id, public, file_size_limit, allowed_mime_types
from storage.buckets where id = 'studio-public';
select tablename, policyname from pg_policies
where schemaname = 'public' and tablename in ('bookings','student_packages','course_favorites');
```

這只確認物件存在，不代表整合測試已通過。SQL Editor 不會登記 Supabase CLI migration 歷史，**不要在同一資料庫再執行此專案的 `supabase db push`**。

## 三、建立第一位管理員

1. 執行完 `00` 或 `01` 後，在 Authentication → Users 建立／註冊一個你自己控制的帳號，或啟動應用程式後透過註冊頁建立；若啟用信箱驗證，先完成驗證。
2. 在 Authentication → Users 複製該帳號的 **User ID（UUID）**。註冊 trigger 應自動建立 `public.profiles`；帳號必須在 schema 安裝後建立。
3. 開啟 `03_first_platform_admin.sql`，把 `target_user_id uuid := NULL;` 替換為 `target_user_id uuid := '你的真實-User-ID'::uuid;`，以 SQL Editor 執行。這會授予該帳號跨品牌的平台管理權限；只指定你信任的人。腳本預設 NULL，忘記替換時會停止。
4. 如果載入示範資料，登入後切到示範品牌；否則以平台管理員在「資料管理 → 平台與品牌管理」建立品牌。平台管理員可指派品牌管理員。
5. 老師先註冊並提供 User ID；管理員在老師資料的 `profile_id` 綁定帳號，再設定分店、課程資格及可授課時間。學生先註冊，可自行加入品牌；管理員也可用其 User ID 加入，再於「學生與方案指派」授予方案。一般後台不代建未註冊的 Auth 帳號。

## 四、設定並執行專案

安裝 Node.js 20.19 以上；解壓專案後在專案根目錄執行：

```bash
npm ci
```

複製根目錄 `.env.example` 為 `.env`，設定：

```dotenv
PORT=3001
FRONTEND_URL=http://localhost:5173
SUPABASE_URL=https://你的專案.supabase.co
SUPABASE_ANON_KEY=你的_Publishable_或_anon_key
```

複製 `frontend/.env.example` 為 `frontend/.env`，設定：

```dotenv
VITE_API_BASE_URL=http://localhost:3001/api/v1
VITE_SUPABASE_URL=https://你的專案.supabase.co
VITE_SUPABASE_ANON_KEY=同一專案的_Publishable_或_anon_key
```

變數名稱為 `*_ANON_KEY`，值可使用相容的 Supabase publishable key 或 legacy anon key。`SUPABASE_SERVICE_ROLE_KEY`／secret key 不可放進前端或交給使用者；一般 API 運行不需要它。根目錄範例中的 service role 欄位僅供本機 demo 腳本，不在遠端設定或執行 demo 腳本。不要把 `.env` 上傳至版本庫。

Windows PowerShell 使用 `Copy-Item .env.example .env` 和 `Copy-Item frontend/.env.example frontend/.env`；macOS／Linux 用 `cp`。之後：

```bash
npm run dev
```

開啟 `http://localhost:5173`；確認 `http://localhost:3001/api/v1/health` 回傳狀態。後端 CORS 的 `FRONTEND_URL` 必須等於前端的實際 origin，修改環境檔後重啟。健康檢查只代表 Express 啟動，不代表 Supabase 驗證成功。

## 五、Storage 設定

Schema SQL 預期建立公開 bucket `studio-public`，限定 PNG、JPEG、WebP，單檔 5 MiB；以 `<studio UUID>/<file>` 作物件路徑，RLS 只允許該品牌管理員寫入。請在 Storage 檢查 bucket 設定與 policies，實測合法／越權操作。這是公開圖片位置，任何取得公開網址的人都能讀取；不得存放學生私人資料。此版本後台以圖片 URL 管理，圖片須先透過 Supabase Dashboard 或授權的 Storage 客戶端上傳，再將公開網址填入後台；目前沒有後台上傳按鈕。示範資料的 `/images/...` 與 `/logo.svg` 是隨前端部署的檔案，不是自動上傳到 Storage 的檔案。參考 [Storage 存取控制](https://supabase.com/docs/guides/storage/security/access-control)。

## 六、使用 Supabase CLI 的替代安裝

如要讓 CLI 管理 migration 歷史，從**未執行 SQL Editor 安裝檔的新專案**開始：在根目錄依序 `npx supabase login`、`npx supabase link --project-ref <專案參照>`、`npx supabase db push --dry-run` 檢查目標和變更，再執行 `npx supabase db push`。本套件的十一份 migration 會建立相同結構；示範資料不是預設的正式資料，如需示範資料再執行 `02_flowie_demo_seed.sql`，第一管理員仍需執行 `03`。此環境未實際在遠端執行 CLI，請依 CLI 輸出及 [官方 CLI 文件](https://supabase.com/docs/reference/cli/introduction) 核對。

本機 Supabase 需要 Docker。在專案根目錄執行 `npx supabase start` 及 `npx supabase status -o env`，再把顯示的本機 URL、anon/publishable key 和本機 service role/secret key 填入根目錄 `.env`，及本機 URL、publishable key 填入 `frontend/.env`。`npm run db:reset` 會**清空並重建本機**資料庫與示範資料；已有資料應先備份。其後可執行 `npm run db:demo` 建立本機測試角色與學生方案。此腳本僅允許 localhost，並以本機 `LOCAL_SUPABASE_DB_URL` 建立少量補建的歷史出勤紀錄，不可對遠端 Supabase 執行。

本機示範帳號：`flowie-demo-super@gmail.com`、`flowie-demo-admin@gmail.com`、`flowie-demo-teacher@gmail.com`，學生 `flowie-demo-student01@gmail.com` 至 `flowie-demo-student20@gmail.com`；共用本機示範密碼 `FlowieDemo123!`。這些不是正式帳號，不要用於正式系統。本次環境沒有 Docker，完整 `db:demo` 對真實 Supabase Auth 的建立與登入尚未驗證；歷史資料函式已在隔離 PostgreSQL 測試。

## 七、舊資料庫與上線前檢查

- 如果已執行舊專案或另兩份 SQL，先備份資料庫並確認資料表、欄位、RLS、函式及 migration 歷史；不得直接執行 `01`、`db reset`、新套件 `db push` 或自行刪表。新套件 migration 時間戳已統一為 14 位，與 V1.0 的歷史不同。需要專門的資料遷移方案；原有預約若未保存當時的取消期限，無法由目前設定還原真正的歷史規則。
- 品牌管理員目前擁有該品牌所有分店的管理權限；尚未支援將管理員限制於特定分店。若你的需求需要此隔離，完成資料模型、RLS 與 RPC 調整和測試後才可使用。
- 在測試專案完整測試平台管理員、品牌管理員、老師、學生、匿名與跨品牌存取，以及建立課程、排課、指派方案、預約、取消、退堂、出勤和授課報表。測試 Auth 驗證與重設密碼、Storage 權限、備份還原、RWD 和 PWA。正式部署使用 HTTPS、正確 CORS 和 redirect URL。
- 詳見 [測試範圍與已知限制](TESTING.md)。本次沒有你的 Supabase 連線資訊，因此以上遠端設定與驗收尚未實際執行。

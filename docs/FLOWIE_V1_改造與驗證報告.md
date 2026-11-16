# Flowie V1 改造與驗證報告

## 1. 交付範圍與前提

依使用者提供的專案及 `Flowie_V1_Supabase_SQL_和設定說明/01`～`04` 調整，以單一品牌、多分店及 V1 的 15 表為資料契約。01～04 保留原檔，不重新執行；新增的 05 是獨立 SQL，**沒有套用至使用者的正式 Supabase**。本次未使用正式帳號或憑證。

## 2. V1.2 → V1 對照

| 舊模型／欄位 | V1 資料來源與處理 |
| --- | --- |
| `studios`、多工作室 `studio_id` | `site_settings` 是單一品牌；API 的 `flowie` 僅為相容用視圖識別，不寫入資料庫。 |
| `studio_memberships`、`platform_admins` | `profiles.is_admin`、`profiles.is_active`；老師身分由 `teachers.id = profiles.id` 判斷。 |
| `profiles.full_name` | `profiles.display_name`；學生本人於個人資料維護。 |
| `teachers.name` | `profiles.display_name`；公開老師資料使用既有 `flowie_public_teachers()`。 |
| `courses.duration_minutes` | `courses.default_duration_minutes`；場次清單的 `duration_minutes` 是 `ends_at - starts_at` 所得顯示值。 |
| `class_sessions.branch_id` | `class_sessions.room_id → rooms.branch_id → branches.id`。 |
| `banners`、`site_settings.headline`、`subheadline` | 主視覺來自 `homepage_sections.section_type = 'hero'`。 |
| `booking_settings.cancellation_hours` | `site_settings.cancellation_hours`；場次可由 `cancellation_deadline_override_at` 覆蓋。 |
| `student_packages.balance`、`credits_charged` 欄位 | 餘額由 `SUM(credit_ledger.delta)` 即時計算；預約扣堂取其 `BOOKING_DEBIT` 帳本紀錄。 |
| `attendance` 表 | `bookings.attendance_status`、`attendance_marked_by`、`attendance_marked_at`。 |
| 老師資格、老師請假、教室可用時間、限定課程方案 | V1 無相應資料表；介面提示人工確認，不新增假資料。 |
| 方案價格、電話、生日、學生備註 | V1 無相應欄位；不保存、不假裝更新。 |

## 3. API 與交易函式

| API | V1 處理方式 |
| --- | --- |
| `GET /studios` | 查 `site_settings`，回傳單品牌的相容檢視。 |
| `GET /auth/me`、`PATCH /auth/profile` | Supabase Auth + `profiles`；只允許使用者修改自己的 `display_name`。 |
| 基本內容 GET／POST／PATCH | 針對 15 表中可管理的內容採實際 PK，管理寫入由 Express 與 RLS 雙重驗證。 |
| `GET /teachers/public` | 呼叫既有 `flowie_public_teachers()`。 |
| `GET /sessions` | `flowie_v1_session_catalog` 僅公開場次資訊及 confirmed 訂位總數，不公開學生身分。 |
| `GET/POST /favorites` | `course_favorites(student_id, course_id)`，由 Auth UID 限定本人及既有 RLS 保護。 |
| `GET/POST /bookings`、取消預約 | `flowie_v1_bookings`、`flowie_v1_book`、`flowie_v1_cancel_booking`。 |
| 學生方案及堂數 | `flowie_v1_packages` 由帳本加總；`flowie_v1_issue_package`、`flowie_v1_adjust_credits` 控制寫入。 |
| 管理員排課／取消場次、點名 | `flowie_v1_schedule`、`flowie_v1_cancel_session`、`flowie_v1_mark_attendance`、`flowie_v1_session_students`。 |
| 管理員報表、老師授課紀錄 | `flowie_v1_report`、`flowie_v1_teaching_records`；教室使用率因缺少可使用時段而為 NULL。 |
| 學生狀態 | `flowie_v1_set_student_active`；不得透過此功能停用管理員或本人。 |

05 的函式以 JWT 的 `auth.uid()` 與 `profiles` 驗證身分；管理資料以現有 RLS 搭配增量 policy／grant，交易表不開放一般直接寫入。預約鎖定場次及方案、檢查名額與帳本餘額後，於同一交易建立預約與扣堂；取消則以原扣堂金額退回同一方案。使用請求識別碼及既有唯一索引防止重複扣堂。取消截止時間在建立預約時保存為快照。

方案有效性採「預約當下與上課開始時均有效」；一堂課由到期日最早且餘額足夠的單一有效方案扣堂，不跨方案拆扣。請依實際營運確認。異動帳本仍以資料庫管理者直接修改為高權限操作，應限制管理權限並保留備份。

## 4. 逐檔修改清單

| 檔案／位置 | 修改與原因 |
| --- | --- |
| `backend/src/routes/index.ts` | 改成 V1 欄位、關聯、公開清單、個人資料、收藏及受控 RPC；不再查舊多租戶表。 |
| `backend/src/controllers/resources.ts` | 依資源實際 PK、排序與允許欄位處理 CRUD，不使用 `studio_id` 過濾資料表。 |
| `backend/src/validators/resources.ts` | 驗證 V1 真實存在的欄位與型別。 |
| `backend/src/middleware/auth.ts` | 加入從資料庫驗證 `is_admin && is_active` 的後端檢查。 |
| `backend/src/middleware/errors.ts` | 加入交易失敗、個人資料未完成、缺少 05 等中文訊息。 |
| `backend/src/openapi.ts` | 更新目前提供的主要 API 文件，舊版放入 `legacy/v1_2/backend/`。 |
| `frontend/src/services/context.tsx`、`types.ts`、`api.ts`、`favorites.ts` | 單品牌相容、V1 帳號型別、錯誤狀態與本人收藏。 |
| `frontend/src/components/Layout.tsx`、`Ui.tsx` | 依 V1 權限顯示後台，增加錯誤重試及台北時間日期顯示。 |
| `frontend/src/pages/Home.tsx`、`Auth.tsx`、`Classes.tsx` | 改讀 V1 主視覺、帳號、場次及預約設定，取消舊會員加入流程。 |
| `frontend/src/pages/Account.tsx`、`Favorites.tsx`、`History.tsx`、`Announcements.tsx` | 姓名、堂數、出勤與錯誤狀態改用 V1。 |
| `frontend/src/pages/Calendar.tsx`、`TeachingRecords.tsx`、`AdminHome.tsx` | 改用 V1 排課與權限，明確使用 Asia/Taipei；無資料基礎的教室使用率不計算。 |
| `frontend/src/pages/Manage.tsx`、`manage-config.ts` | 僅顯示 V1 支援欄位；首頁區塊使用 `section_type`，老師使用已註冊帳號 UID。 |
| `supabase/v1_incremental/05_flowie_v1_api_and_transactions.sql` | 新增受控讀取、交易函式、必要管理權限；不新增資料表或欄位。 |
| `supabase/migrations/README.md`、`supabase/config.toml`、`legacy/v1_2/` | 封存舊版 migration、install、舊測試與文件，關閉舊 seed 自動載入。 |
| `.env.example`、`frontend/.env.example`、`.gitignore` | 範本改為佔位值並排除實際環境檔。 |
| `package.json`、`backend/package.json`、`frontend/package.json`、`package-lock.json` | 調整安全測試與本機啟動指令，加入台北時區日曆插件及測試依賴；移除危險的舊 DB 自動執行快捷指令。 |
| `frontend/tests/home.test.tsx` | 驗證首頁內容、loading、空資料及連線錯誤與重試。 |
| `scripts/test-v1-db.mjs`、`test-v1-concurrency.mjs`、`test-v1-http.mjs` | 使用隔離資料庫測試交易、並發和 PostgREST／Express 介面。 |
| `README.md`、本報告 | 提供 V1 安裝、設定、差異、測試及未完成事項。 |

## 5. 測試結果

| 項目 | 結果及範圍 |
| --- | --- |
| TypeScript typecheck、ESLint、建置 | **Pass**；建置提示前端 chunk 較大，非建置失敗。 |
| `npm run dev` | **Pass**；以本機測試設定確認前端 HTTP 200、後端 health 200。 |
| 後端 API 邊界 | **Pass**；10 項測試涵蓋健康檢查、未登入拒絕及參數驗證。 |
| 前端元件 | **Pass**；使用模擬資料驗證首頁內容、載入、空資料、錯誤和重試。 |
| SQL 邏輯 | **Pass**；隔離本機 PGlite：15 表、身份、RLS、餘額、預約、重試、額滿、取消與退堂、出席、管理員權限。 |
| 並發交易 | **Pass**；隔離本機 PostgreSQL：4 人同搶 1 個名額僅 1 人成功；2 筆同搶 1 堂僅 1 筆成功，同識別碼重試不重複扣堂。 |
| 本機 HTTP 整合 | **Pass**；隔離 PostgreSQL + 真實 PostgREST + Express，Auth 使用模擬服務；驗證 2 分店、4 教室、6 課程、1 老師、6 場次、公告、權限、收藏、預約、取消及堂數。 |
| 正式 Supabase、真實 Auth 與正式資料 | **Not Run**；未使用正式資料或自動部署。 |
| 瀏覽器實際視覺與手機畫面 | **Not Run**；本執行環境瀏覽器無法存取本機測試伺服器，需由使用者於自己的電腦驗證。 |

如有需要，本機 HTTP 測試可在安裝 PostgREST 後執行：

```powershell
$env:POSTGREST_BINARY = 'C:\你的路徑\postgrest.exe'
npm run test:postgrest
```

測試只建立臨時本機 PostgreSQL 與模擬帳號，不連線正式專案。選用瀏覽器測試需另有 Playwright Chromium，設定 `FLOWIE_UI_TEST=1`。本次環境未能執行瀏覽器視覺測試。

## 6. 尚未完成／停用與已知風險

1. V1 沒有老師可授課時間、請假、分店／課程資格及教室可使用時段；排課需人工確認，教室使用率無法計算。
2. 已建立週期的批次修改及批次取消尚未開放，可逐場處理；有任何預約紀錄的場次禁止直接修改。場次完成狀態的自動更新尚未實作。
3. 單一品牌，不提供平台多品牌或額外會員關聯。學生列表為非管理員 `profiles`，老師也可能同時是學生；V1 未另設學生角色。
4. 不提供方案售價、線上付款、學生手機／生日／備註、方案限定課程及管理員代改姓名。姓名由帳號本人維護。
5. `GET /sessions/manage` 目前最多 1000 筆；授課紀錄上限 1000 筆，應依日期區間查詢。上線前應評估較大資料量的分頁與索引。
6. 報表取消數按取消時間，其餘數據按場次開始時間；取消率為期間取消數占期間有效預約與取消數之比例，並非同一批場次的歷史取消率。
7. 05 在本機資料庫完成測試，部署前仍須在獨立的 Supabase 專案驗證 JWT、RLS、政策及競態；確認備份並審查後再手動執行。
8. 上線前依實際部署設定 Supabase Auth 的 Site URL／Redirect URL、前後端網址及 CORS；密碼及 Secret key 不進 Git。PWA 在正式環境需要 HTTPS。
9. 瀏覽器／手機的視覺、PWA 安裝及真實帳號登入尚未實機驗證，請使用隔離測試帳號檢查後再上線。
10. 專案提供的原始 03、04 SQL 含使用者原本填入的 Auth UID，依要求保留原文；如要上傳公開儲存庫，應先確認是否需遮去這些識別碼。

## 7. 本次交付補正

- 新增 `supabase/v1_incremental/06_flowie_v1_report_session_count.sql`，以可單獨審查的增量 SQL 更新報表函式，排除已取消場次。此函式保留原有身分與管理員檢查；未修改 01～05、15 張資料表或資料列。
- 統計名稱調整為「未取消排課場次」，計入區間中的 scheduled 與 completed，排除 cancelled；這不表示已確認實際授課。06 必須在 05 成功執行後執行。若此前已執行 05，請勿因此重跑 05。
- 針對取消、已排課、已完成及狀態篩選新增隔離資料庫測試。
- Node.js 版本調整為 24.15.0 以上的 24.x；舊版文件寫的 20.19 以上並不符合鎖定的測試套件要求。
- 舊版 V1.2 檔案留在 `legacy/v1_2/`；交付目錄中不放可能被 CLI 當成現行 migration 的舊 SQL。

## 8. 本次啟動修正與檔案整理

1. 您上傳的設定位於 `supabase/.env`，而後端讀取專案根目錄的 `.env`，因此原本啟動時找不到 `SUPABASE_URL`、`SUPABASE_ANON_KEY`。本版已將原本提供的專案網址與 publishable key 保留在根目錄 `.env`，後端改用程式位置尋找該檔案，缺少設定時顯示明確訊息。
2. 前端與後端預設共用根目錄 `.env` 中的公開 Supabase 網址與 key；前端的系統環境變數可供部署與測試明確覆寫。若放入 secret 或 service_role key，啟動會拒絕，避免將高權限 key 提供給前端。
3. 交付檔不包含 `node_modules`、`.git`、IDE 快取或編譯結果。原上傳專案混入的 34 個舊版重複檔案與 `legacy/v1_2/` 封存內容一致（換行差異除外），已從現行位置移除，但封存保留。未使用的 Supabase CLI 套件已移除；測試所需套件仍保留在套件清單中。
4. 保留圖片檔名及畫面內容，對兩張主要圖片做無損壓縮；不同頁面按需載入，並將 Supabase 函式庫獨立打包，以縮小單一前端檔案。頁面變更不涉及資料表或 SQL。
5. 本機 Node.js 24.22.1（Linux）已完成乾淨 `npm ci`、`npm run dev` 的前後端 HTTP 及設定讀取、typecheck、lint、build、單元測試、隔離資料庫交易測試、並發測試，以及使用模擬 Auth 的本機 PostgREST／Express 整合測試。新增設定缺漏、拒絕高權限 key 與頁面路由測試。
6. 本次瀏覽器實機測試因執行環境限制無法啟動 Chromium；Windows 實機、真實 Supabase 連線及正式帳號操作尚未驗證。完整預約與報表功能仍須確認既有 Supabase 已完成 05、06；本次沒有在該資料庫執行 SQL 或寫入資料。

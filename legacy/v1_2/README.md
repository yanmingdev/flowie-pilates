# Flowie Studio V1.2

皮拉提斯／瑜珈課程管理專案。前端為 React、TypeScript、Vite；API 為 Node.js、Express、TypeScript；資料、身分驗證、列級權限與交易函式以 Supabase PostgreSQL／Auth 實作。資料表欄位、API 參數與前端服務統一使用 `snake_case`。

學生端提供課程探索、預約及取消、方案堂數、收藏、上課紀錄與帳戶；管理端提供資料管理、FullCalendar 排課、學生與方案管理、出勤、授課紀錄和營運指標。首頁文案、排序、課程與圖片網址等來自資料庫，固定導覽文字、畫面佈局與樣式仍在程式中維護。詳細對照見 [前端與資料庫](docs/FRONTEND_DATABASE_MAP.md)。

**先在全新、空白的 Supabase 測試專案安裝。** 本交付未連線你的 Supabase，真實 Auth、Storage、權限與端到端流程仍需驗證。現有資料庫不可直接執行全新安裝 SQL 或 reset；須先備份並規劃遷移。

## 快速開始

1. 按 [Supabase 設定指南](docs/SUPABASE_SETUP.md) 建立測試專案，啟用 Auth 的 Email／Password。
2. 在 SQL Editor 執行 `supabase/sql-editor/00_flowie_install_schema_and_seed.sql`。它包含建表與示範資料；若不需要示範資料，僅執行 `01_flowie_schema.sql`。`00` 和 `01`／`02` 是替代方案，不可重複執行。
3. 建立自己的 Auth 使用者，把 User ID 填入 `03_first_platform_admin.sql` 後執行，授權第一位平台管理員。初始資料不會建立登入帳號或密碼。
4. 安裝 Node.js 20.19 以上。在根目錄將 `.env.example` 複製為 `.env`，將 `frontend/.env.example` 複製為 `frontend/.env`，依指南填入同一 Supabase 專案的 URL 與 publishable key。
5. 根目錄執行 `npm ci`，接著 `npm run dev`。開啟 `http://localhost:5173`；API 健康檢查為 `http://localhost:3001/api/v1/health`，API 文件為 `http://localhost:3001/api/docs`。健康檢查不代表 Supabase 已連線成功。

SQL Editor 與 Supabase CLI migration 是兩條安裝路徑，同一個資料庫請擇一。SQL Editor 不登記 CLI migration 歷史，不可再直接對其執行本專案的 `db push`。`npm run db:sql` 從 11 份 migration 與 seed 產生安裝檔。SQL／API／前端應使用同一版本。

一般 API 使用登入者 JWT 和 RLS，不需要 service role。`.env.example` 的 `SUPABASE_SERVICE_ROLE_KEY` 和 `LOCAL_SUPABASE_DB_URL` 只供本機示範腳本；不可將任何 secret／service role key 放入前端或版本庫。本機示範帳號及資料僅透過 `npm run db:demo` 建立，且腳本拒絕非 localhost URL，詳見設定指南。

## 文件

- [Supabase 安裝與帳號設定](docs/SUPABASE_SETUP.md)
- [前端畫面與資料庫欄位對照、初始資料](docs/FRONTEND_DATABASE_MAP.md)
- [資料表、正規化及交易規則](docs/DATABASE.md)、[日常資料維護](docs/DATA_MAINTENANCE.md)
- [API](docs/API.md)、[架構與權限](docs/ARCHITECTURE.md)、[部署](docs/DEPLOYMENT.md)
- [RWD／PWA](docs/RWD_PWA.md)、[測試結果與限制](docs/TESTING.md)
- [原始需求](README_V1.md)、[變更紀錄](CHANGELOG.md)、[品牌參考圖](docs/design/flowie-brand-reference.png)

常用檢查：`npm run typecheck`、`npm run lint`、`npm test`、`npm run build`、`npm run test:db-smoke`、`npm run test:concurrency`。本機資料庫測試使用獨立測試資料及 Auth／Storage 替身，不等同託管 Supabase 驗收。

目前品牌管理員的授權範圍是整個品牌（含旗下所有分店），**尚無限制為特定分店的管理員權限**。其餘限制見測試文件。V1.0、V1.1 與本版 SQL／API 不應混搭；舊資料庫升級需先盤點 migration 歷史並另行驗證。

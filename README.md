# Flowie｜完整專案與分層整理版

本版以 `flowie-pilates(5).zip` 為基準，整理檔案責任及重複程式，不增加業務需求。保留 React 18、Vite 6、Express 4、Supabase、Radix UI、Tailwind、FullCalendar、RWD／PWA、既有 UI／網址／API／SQL 契約，未升級套件。

**本包完整包含附件原有 `.git`，包含物件、index、設定、分支及 reflog；沒有初始化新 Git、commit、reset 或 push。** 這是上傳當時的 Git 快照，保留其 staged／unstaged 狀態，不會自動變成乾淨的工作目錄。

## 啟動

使用 Node.js 24.15 以上的 24.x。停止舊服務後，先把舊資料夾完整改名備份，再將本包唯一一層 `flowie-pilates/` 解壓到原位置；需要時可把外層目錄改名為 `flowie-studio`。

```powershell
cd C:\flowie-pilates
npm ci
npm run dev
```

如果您的專案路徑是 `C:\flowie-studio`，第一行改成該路徑即可。前端 http://localhost:5173，API 健康檢查 http://localhost:3001/api/v1/health，API 文件 http://localhost:3001/api/docs。

公開連線設定沿用附件的 `config/env/.env.local`，根目錄 `.env` 亦保留；有分類設定檔時以分類設定為準，系統環境變數優先。僅更換程式不需重跑 SQL。node_modules／dist 不隨包交付，`npm ci` 依原 lockfile 重建。

## 目錄分工

| 位置 | 責任 |
|---|---|
| frontend/src/app/ | bootstrap、providers、router、layouts，組裝應用 |
| frontend/src/features/ | 按功能分類的 pages、components、hooks、config |
| frontend/src/shared/ | 共用 UI、Auth、HTTP、全站狀態、型別與工具 |
| frontend/src/styles/ | 基礎色票、元件、功能、RWD 與覆寫樣式；順序不變 |
| backend/src/index.ts、server.ts | 唯一 CLI 入口與 HTTP 生命週期 |
| backend/src/app/ | Express 工廠及模組路由掛載 |
| backend/src/modules/ | 每個領域的 routes → controller → service → repository／RPC |
| backend/src/infrastructure/、shared/ | Supabase、RPC transport、middleware、共用驗證及服務 context |
| config/ | 環境載入、工具、測試及圖片對照設定 |
| supabase/sql/ | 唯一現行 SQL、安裝順序與 ER 圖 |
| tests/、scripts/ | 現行測試與維護腳本 |
| docs/ | 架構、替換、設計與本次驗證紀錄 |
| archive/ | 舊程式及歷史文件 ZIP，僅供查閱 |
| .git/ | 原版本資訊與物件，完整保留 |

Mantine 是 React UI 元件庫，不是檔案分層框架。本專案現有 Radix UI 基礎元件與品牌 CSS，並未使用 Mantine；本次沿用既有元件方案。共用的 Button／Dialog 位於 `shared/ui/primitives/`，功能元件留在各 feature。

## 驗證與建置

```powershell
npm run check
npm run test:concurrency
npm run build
```

`check` 包含架構、TypeScript、ESLint、前後端測試、隔離 SQL 測試及建置；第二行另跑本機 PostgreSQL 併發測試。正式後端使用 `npm run start -w backend`；前端產物為 `frontend/dist`，正式靜態主機須支援 SPA fallback。VITE_API_BASE_URL 是含 `/api/v1` 的完整 API 前綴。

詳見 [架構與審查](docs/architecture/ARCHITECTURE.md)、[替換步驟](docs/operations/REPLACEMENT.md)、[本次驗證](docs/verification/RESULTS.md)、[審查報告](docs/architecture/REVIEW_20261118.md)。新空白 Supabase 才依 `supabase/sql/README_SQL.md` 建置；沒有改動或初始化您的遠端資料庫。

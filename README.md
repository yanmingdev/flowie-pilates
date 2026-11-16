# Flowie V1：啟動與 Supabase 設定

本專案使用 React、Express 與既有的 Supabase V1 15 張資料表。此下載包已依原專案的 `supabase/.env` 帶入專案網址與 **publishable key**，並移到專案根目錄 `.env`。前端與後端會共用這份設定，不用再建立 `frontend/.env`。

`.env` 已由 `.gitignore` 排除。下載包仍包含您的 Supabase 專案網址與公開用 key，以及原始 03、04 SQL 中的帳號 UID；分享壓縮包或公開上傳 SQL 前，請確認內容。**不可將 secret key 或 service_role key 填入專案**；應使用 publishable key 或 anon key。

## 1. 換成這份專案

1. 停止目前執行中的程式（在 PowerShell 按 `Ctrl+C`）。
2. 將原本的 `C:\flowie-studio` 重新命名為備份，例如 `C:\flowie-studio-backup`。
3. 解壓縮本下載包，使新的路徑為 `C:\flowie-studio`。請勿直接覆蓋舊資料夾，否則被移除的舊版 SQL 可能仍會留在原位置。
4. 若需保留原本的 Git 分支與歷史，請將備份資料夾內的 `.git` 複製到新的 `C:\flowie-studio\.git`。然後以 `git status` 檢查變更；本下載包不含 `.git` 或 `node_modules`。

## 2. 安裝與啟動

使用 Node.js **24.15.0 以上的 24.x**（Node.js 24.21.0 符合），並在 PowerShell 執行：

```powershell
cd C:\flowie-studio
npm ci
npm run dev
```

首次執行 `npm ci` 需要網路下載套件。下載包不含 `node_modules`，因此檔案較小；安裝完成後，電腦中仍會有執行與測試所需的套件。

- 前端：<http://localhost:5173>
- 後端健康檢查：<http://localhost:3001/api/v1/health>
- API 文件：<http://localhost:3001/api/docs>

## 3. 修改 Supabase 設定

以文字編輯器開啟**專案根目錄**的 `.env`。此檔已依您上傳的設定填入原專案網址與公開 key；若之後切換 Supabase 專案，修改以下兩個值即可：

```dotenv
PORT=3001
FRONTEND_URL=http://localhost:5173
SUPABASE_URL=https://你的專案.supabase.co
SUPABASE_ANON_KEY=你的_publishable_或_anon_key
```

儲存後停止並重新執行 `npm run dev`，讓前後端重新載入。請勿把 `.env` 放在 `supabase/` 資料夾。若 `.env` 遺失，可複製 `.env.example` 為 `.env` 並填入上述值。

本機啟動時前端優先共用根目錄 `.env`；已明確設定的系統環境變數 `VITE_SUPABASE_URL`、`VITE_SUPABASE_ANON_KEY` 可供部署或測試覆寫。`frontend/.env.example` 是舊版相容範例，不需要另外複製。登入與資料讀取仍取決於 Supabase 專案、Auth 設定、RLS 和現有資料。

## 4. 資料庫 SQL

本版沿用既有 V1 15 張表，程式啟動不會自動執行 SQL。依您先前的說明，01～04 已執行過，**不要重新執行 01～04**。

- 若 05 尚未執行：先審查 `supabase/v1_incremental/05_flowie_v1_api_and_transactions.sql`，執行成功後再執行 06。
- 若 05 已成功執行：確認後執行 `supabase/v1_incremental/06_flowie_v1_report_session_count.sql`。若稍後重跑 05，需再執行 06。
- 05、06 請在正確的 Supabase 專案中以 SQL Editor 手動執行；建議先在隔離測試專案驗證與備份。沒有存取您的 Supabase，無法代為確認是否已執行。

舊 V1.2 檔案僅保留在 `legacy/v1_2/` 供查閱，不可套用到 V1 資料庫；也不要執行 `supabase db reset` 或 `supabase db push`。

## 5. 功能及驗證

- 設定完整且 05、06 成功套用後，可依現有資料測試首頁、課表、登入、收藏、預約、取消與後台。
- 學生測試預約前，需填寫姓名、由管理員指派有效方案及堂數，並選擇可預約的未來場次。
- 報表的「未取消排課場次」包含已排課及已完成場次，不含已取消場次；不代表已確認實際授課。
- 原 V1 不提供老師請假／資格、教室可使用時段及教室使用率等資料；這些限制未因本次啟動修正而改變。

開發檢查：`npm run typecheck`、`npm run lint`、`npm run build`、`npm test`。並發測試可執行 `npm run test:concurrency`。詳細資料模型與驗證限制請參考 `docs/FLOWIE_V1_改造與驗證報告.md`。

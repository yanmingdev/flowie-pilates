# Flowie V1：啟動與 Supabase 設定

本專案使用 React、Express 與 Supabase V1 的 15 張原始資料表；執行 07 後增加一張身體知識內容表，共 16 張。根目錄 `.env` 已保留原專案的網址與 **publishable key**，前端與後端共用這份設定。

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

如果您的 Windows 環境先前需要使用系統憑證，在**同一個 PowerShell 視窗**於 `npm run dev` 前先執行 `$env:NODE_USE_SYSTEM_CA = "1"`。每次開啟新的 PowerShell 視窗都要重新設定；不要關閉 TLS 憑證驗證。

本次修正已補回必要的 `backend/src/index.ts`。若解壓後仍看到 `Cannot find module ... src/index.ts`，請確認解壓路徑是 `C:\flowie-studio\backend\src\index.ts`，並確認沒有把壓縮檔解成雙層的 `flowie-studio\flowie-studio`。

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

本版以既有 V1 15 張表為基礎，執行 07 後共有 16 張。程式啟動不會自動執行 SQL。依您先前的說明，01～04 已執行過，**不要重新執行 01～04**。

- 若 05 尚未執行：先審查 `supabase/v1_incremental/05_flowie_v1_api_and_transactions.sql`，執行成功後再執行 06。
- 若 05 已成功執行：確認後執行 `supabase/v1_incremental/06_flowie_v1_report_session_count.sql`。若稍後重跑 05，需再執行 06。
- 05、06 請在正確的 Supabase 專案中以 SQL Editor 手動執行；建議先在隔離測試專案驗證與備份。沒有存取您的 Supabase，無法代為確認是否已執行。

舊 V1.2 檔案僅保留在 `legacy/v1_2/` 供查閱，不可套用到 V1 資料庫；也不要執行 `supabase db reset` 或 `supabase db push`。

## 4A. 本次新增的 07 SQL 與介面更新

本包包含 `supabase/v1_incremental/07_flowie_v1_knowledge_and_feedback.sql`。如果目前 Supabase 已執行 01～06 且尚未執行 07，請在正確專案 SQL Editor **只執行 07 一次**；已執行 07 就不要重跑。07 新增身體知識內容表 `knowledge_articles`、在既有 `bookings` 新增 `teacher_feedback`，以及老師／管理員寫入建議的受控函式與三筆知識示範資料。若是全新空白專案，順序為 01、02、選用 03／04、05、06、07；請先於測試專案驗證，再於正式專案執行。

首頁已移除五格捷徑；頂部選單新增師資介紹與會員月曆。身體知識示意圖位於 `frontend/public/images/knowledge-*.svg`，可在 `knowledge_articles.image_url` 改成正式圖片網址。老師的課後建議會顯示在學生的上課紀錄。

本壓縮包保留原本 `.git` 與根目錄 `.env`（僅含原本的 publishable key），排除可由 `npm ci` 重建的 `node_modules` 與可由 `npm run build` 產生的 `dist`。請勿把此包與舊專案交錯覆蓋：先備份舊資料夾，再解壓整包成 `C:\flowie-studio`。在新目錄執行 `npm ci` 後再啟動。Git 遠端連結雖已保留，上傳前仍需查看 `git status` 和待提交檔案，尤其是可能被追蹤的環境設定。

## 5. 功能及驗證

- 設定完整且 05、06 成功套用後，可依現有資料測試首頁、課表、登入、收藏、預約、取消與後台。
- 學生測試預約前，需填寫姓名、由管理員指派有效方案及堂數，並選擇可預約的未來場次。
- 報表的「未取消排課場次」包含已排課及已完成場次，不含已取消場次；不代表已確認實際授課。
- 原 V1 不提供老師請假／資格、教室可使用時段及教室使用率等資料；這些限制未因本次啟動修正而改變。

開發檢查：`npm run typecheck`、`npm run lint`、`npm run build`、`npm test`。並發測試可執行 `npm run test:concurrency`。詳細資料模型與驗證限制請參考 `docs/FLOWIE_V1_改造與驗證報告.md`。

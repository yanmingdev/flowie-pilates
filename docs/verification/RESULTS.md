# 本次架構整理驗證

基準：flowie-pilates(5).zip。日期：2026-11-18（Asia/Taipei）。執行環境為 Linux、Node 24.22.3、npm 11.9.0；使用附件原 package.json 與 package-lock.json，沒有升級套件。

| 項目 | 本次實際結果 | 證據與限制 |
|---|---|---|
| 全新 npm ci | 通過，安裝 788 packages | 使用原 lockfile，重新安裝取代附件的 Windows node_modules |
| npm run check | 通過，exit 0 | check-output.log；含架構、TypeScript、ESLint、測試及正式建置 |
| 架構檢查 | 131 個現行程式檔、674 個有說明的函式／回呼，0 issues | architecture-output.log；44 個重複檔案不再出現 |
| 後端測試 | 22／22 通過，5 個測試檔 | 含實際 Express router 與原 68 端點基準比對 |
| 前端測試 | 15／15 通過，4 個測試檔 | jsdom：首頁、路由、Provider 訂閱清理、圖片 |
| 隔離資料庫 smoke | 通過 | Auth／RLS、堂數、預約、冪等、取消、點名、報表等原測試 |
| 全新 SQL 安裝 | 通過 | 隔離 PGlite，01→02→03→04→05→06→07；16 表、6 場次、3 知識內容 |
| PostgreSQL 併發 | 三個原情境通過 | concurrency-output.log；搶最後名額、同鍵重試、搶最後堂數 |
| 正式建置／PWA | 通過 | 後端 tsc、前端 Vite、SW 與 manifest 產生成功 |
| npm run dev HTTP | 通過 | http-boot.json：健康檢查、OpenAPI、前端 HTML／入口／Provider 模組均回 200 |
| 架構規則負例 | 兩項通過 | 故意放回舊設定、shared re-export feature，均被拒絕；fixture 已清理 |
| SQL／API／樣式 | 原基準全部維持 | 7 支 SQL 有效指紋、68 API、CSS 完整展開順序、11 圖片相容網址 |
| Git | 62 個原 .git 檔案 SHA-256 全部相同；git fsck exit 0 | git-integrity.json；包含 objects、index、分支、設定、reflog |
| 套件與環境 | 原始位元組相同 | package.json、三份 manifest、root lockfile、.env 與分類 .env.local |

## 實際限制

Chromium 在執行環境因 Unix socket 權限限制無法啟動，因此本次沒有完成真實瀏覽器的視覺／RWD 檢查，也沒有以舊截圖冒充。本次 UI 相關證據是現行 jsdom 測試、CSS 指紋不變、Vite 建置與 HTTP 模組載入成功。

本次未對正式 Supabase 執行 SQL 或寫入資料，沒有驗證真實寄信、正式登入流程或實體手機 PWA 安裝；本機測試通過不等於上述情境已完成驗收。未執行 commit／push／部署。

上版驗證已保留在 archive/previous-layout-reference.zip，現行資料夾僅放本次實際輸出。最終 ZIP 的 Git 檔案另於封裝時與上傳 ZIP 再次逐檔比對。

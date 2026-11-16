# 正式部署

此交付尚未部署、沒有正式 Supabase 專案或實際正式帳號。上線前必須先通過 `TESTING.md` 的真實 Supabase 驗證項目與安全審查。

1. 準備 Supabase 專案，套用已審核的 migrations，配置 Auth URL／redirect 與電子郵件。以可信任管理方式初始化第一個平台管理員。
2. 以 `npm ci` 安裝，再執行 `npm run build`。前端 build 的 Vite 環境變數應於 build 前設定：`VITE_API_BASE_URL=https://<api-domain>/api/v1`、`VITE_SUPABASE_URL=https://<project>.supabase.co`、`VITE_SUPABASE_ANON_KEY=<publishable-or-anon-key>`。部署 `frontend/dist`，並在靜態主機設定 SPA fallback 至 `index.html`。
3. 在支援 Node.js 的主機部署後端；設定 `NODE_ENV=production`、`PORT`、`FRONTEND_URL=https://<web-domain>`、`SUPABASE_URL` 及 `SUPABASE_ANON_KEY`，以 `npm run start -w backend` 執行已編譯的程式。不要把 `.env` 上傳原始碼庫或前端。
4. 確保前後端 HTTPS、CORS 僅允許預期網域；在反向代理環境校驗真實 IP 與 rate limit 設定；配置安全標頭、請求日誌、監控告警及 `/api/v1/health` 健康檢查。健康檢查只表示 Express 程序可回應，不驗證資料庫連線。
5. 設定 Supabase 定期備份、保存期限及還原演練；更新 schema 只透過 migration。新部署先在測試環境驗證，並準備回滾方案。
6. 圖片公開 bucket 只放可公開素材；學生資料不得放入。驗證 MIME、大小、路徑歸屬與 RLS。配置正式寄信服務與 Supabase Auth rate limit。

本版 Express 使用單一 `FRONTEND_URL` 進行 CORS；部署路徑、保護代理的速率限制及多實例部署需按主機環境確認。不要使用示範密碼、示範資料或本機 service role key。

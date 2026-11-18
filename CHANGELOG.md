# 2026-11-18 架構分類整理

- 合併重複實作至現行分層，舊程式、SQL 及驗證紀錄封存。
- AppProviders 集中組裝；加強 re-export、殘留重複檔與執行時路由驗證。
- 保留套件、功能、UI、SQL 與完整 .git；重寫替換說明。

# 2026-11-18 Node.js／Express 完整替換與 ER 模型

新增 createApp 工廠、Node HTTP server 與關閉流程，控制器改傳最小 service context。01～07 集中到 supabase/sql/，同層加入由 SQL 實際擷取的 ER PNG／DOT／schema catalog。03／04 歷史 UID 改成明確占位文字，未變更 schema 或交易；新增完整空白安裝順序及伺服器邊界測試。完整目錄可獨立安裝啟動，沒有正式 DB 操作或部署。

# 2026-11-18 架構整理版

以本次上傳附件為基準：前端功能模組化、後端 9 領域分層、環境設定集中、圖片分類與 PNG、舊 URL 相容同步、函式註解、架構檢查及回歸測試。保留套件 lockfile、API 與 SQL 有效內容；沒有執行正式 SQL、Git 推送或部署。歷史紀錄如下，不作本次驗證證據。

# V1.2

- 依品牌參考重整手機首頁、課程詳情、收藏、上課紀錄與後台。
- 新增收藏、教室可用時段、營運指標與可設定的預約截止時間。
- 新增 SQL Editor 結構＋示範資料整合檔、資料欄位對照、實際瀏覽器截圖與測試文件。
- 補充本機示範帳號與歷史資料腳本；Auth／Storage 等真實服務驗收仍未執行。

# Changelog

## V1.1 — 2026-11-14

- API 欄位與資料庫統一使用 `snake_case`；舊版客戶端須同步更新。
- 新增品牌內學生資料及管理、學生清單分頁、授課紀錄；強化帳本不可竄改與餘額一致性、租戶複合外鍵與取消期限快照。
- 修正場次資料讀取權限與 PostgREST 老師關聯；新增真實 PostgREST 加本機測試替身的 API 整合檢查。
- 提供由 migration 產生的完整 SQL Editor 全新安裝檔、示範資料及首位管理員初始化檔。migration 檔名統一為 14 位時間戳，舊版資料庫不可直接沿用 CLI 歷史。
- 真實 Supabase、Auth、Storage、完整 RWD／PWA 驗收仍待實測；功能限制見 `docs/TESTING.md`。

## V1.0 — 2026-11-14

### Added
- React / Express / Supabase 分離式專案、品牌樣式、RWD 與 PWA 設定。
- 多品牌資料模型、RLS、排課約束、交易 RPC、帳本與稽核。
- 課程、老師、教室、行事曆、學生、方案、預約、出勤、網站設定與基本報表介面。
- 本機示範資料與使用 Auth Admin API 的本機帳號建立腳本。
- API 基本測試、PGlite 資料庫測試及 PostgreSQL 15 並行測試。

### Changed
- 正式資料庫使用 Supabase；先前 PocketBase 規劃已被取代。

### Fixed
- 防止重複扣堂、重複退堂、最後名額超賣與並行扣成負數，並增加已預約場次及教室容量保護。上述為本次可用本地測試環境的驗證結果，真實 Supabase 仍待驗證。

### Removed
- 無。

### Known Issues（V1.0 當時的狀態）
- 無 Docker / Supabase 憑證，未完成真實 Supabase Auth、API、Storage 與完整業務整合驗證。
- 六種指定 viewport 與 PWA 實機安裝／離線／更新尚未完整測試。
- 老師工時沒有獨立彙總報表，後台無替未註冊使用者建立正式 Auth 帳號；管理列表分頁 UI 尚未完整實作。

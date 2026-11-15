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

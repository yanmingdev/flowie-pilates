# V1 專案安全提示

此目錄不含自動執行的 migration。原 V1.2 SQL 已封存至 `legacy/v1_2/`，不可套用到既有 V1 正式資料庫。

V1 的必要增量位於 `supabase/v1_incremental/`，先在隔離資料庫測試及人工審閱，再由專案管理者透過 SQL Editor 執行。不要執行 db reset、db push，或修改 migration history。

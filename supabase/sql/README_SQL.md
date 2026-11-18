# Flowie SQL 安裝順序與 ER Model

本資料夾是目前專案唯一的 SQL 安裝入口，包含 01～07 與同層 Flowie_ER_Model.png。不需要從舊專案複製任何 SQL 或圖片。本專案使用 Supabase PostgreSQL／Auth；auth.users、anon、authenticated 為 Supabase 管理，不要在正式環境自行仿造 Auth schema。

## 一、新空白 Supabase 專案

| 順序 | 檔案 | 用途與是否重跑 |
|---|---|---|
| 1 | 01_Flowie_建立資料表.sql | 建立 15 張核心業務表、約束、索引、trigger、RLS／GRANT；僅空白資料庫執行一次，既有表會拒絕 |
| 2 | 02_Flowie_新增示範資料.sql | 初始品牌、分店、教室、課程、方案、公告等示範內容；不建立 Auth 使用者，不重複執行 |
| 3（選用） | 03_Flowie_指定第一位管理員.sql | 先在 Authentication 建立真實帳號；將全部 REPLACE_WITH_EXISTING_ADMIN_AUTH_UID 換成同一個 UID；相同 UID 重跑僅重設同帳號旗標 |
| 4（選用） | 04_Flowie_建立示範老師與場次.sql | 使用真實老師 Auth UID 替換 REPLACE_WITH_EXISTING_TEACHER_AUTH_UID，檢查示範分店／教室／課程；固定六筆場次，只執行一次 |
| 5 | 05_flowie_v1_api_and_transactions.sql | V1 受控讀取、預約、取消、發放、調整、排課及點名函式；同簽名可重新套用，但先備份與審核 |
| 6 | 06_flowie_v1_report_session_count.sql | 報表場次數修正；一定在 05 後，若重跑 05 再套 06 |
| 7 | 07_flowie_v1_knowledge_and_feedback.sql | 第 16 張 knowledge_articles、bookings.teacher_feedback 與授權函式；只執行一次 |

順序是 **01 → 02 → 選用 03／04 → 05 → 06 → 07**，不是要求重複跑兩套 SQL。每次完整執行單一檔案，不要只執行其中半段。

03／04 未替換占位文字時必定拒絕，不會沿用過去環境的帳號 UID。03 有指定與檢查兩處占位文字，請全數取代。Auth 使用者須在執行 01 之後建立，讓 trigger 產生 profile；或由選用腳本明確處理該帳號。登入、老師姓名與 profile 啟用狀態仍需確認。

Supabase Dashboard：建立專案 → SQL Editor 跑 01、02 → Authentication 建立需要的帳號 → 填 UID 跑選用 03、04 → 05、06、07 → 設定 Site／Redirect URL（本機 http://localhost:5173、重設密碼路徑／正式網域）→ 設定 SMTP／測試寄信 → 驗證前後端設定與 RLS。project URL／publishable／anon key 放 config/env，不能放 service role／secret key 到前端。

## 二、已存在 V1 資料庫

移除舊程式資料夾**不會移除遠端 Supabase 資料庫**。新專案沿用相同公開設定即可接回既有資料。本次後端分層沒有變更表結構或交易函式，因此不用為換程式而重跑 SQL。

已執行 01～04 就不能再跑初始化；05／06／07 依實際套用狀態只審查尚未套用者，尤其 07 不能重跑。先於副本驗證並備份 schema、資料、函式、policy／GRANT；不要 db reset、DROP TABLE CASCADE 或用全表更新初始化。舊 V1.2 只在 archive 裡供查閱，不可混用。

本次唯一 SQL 範本調整是 03／04 的環境特定 UID 改成明確占位文字；沒有變更 schema、RLS 或交易邏輯。sql-integrity-baseline.json 保留這兩項變更的前後指紋與原因。01、02、05、06、07 有效內容未變。

單一腳本執行失敗時由其交易回滾。成功套用後要回退，應還原先前審核過的函式／權限定義與程式版本，不以刪除正式表或舊資料覆蓋帳本處理。不存在本包可推定的雲端已套用狀態，必須依您專案實際狀態判斷。

## 三、ER 圖與可重建資料

- Flowie_ER_Model.png：完整實體關聯圖，16 張 public 表、126 個應用欄位、17 個外鍵；auth.users 只列被參照的 id，不冒充 Supabase 完整內部模型。
- 圖中包含 PK／FK／UQ、PostgreSQL 型別、NN／NULL、crow-foot 基數及精確外鍵對照。series_id 只是群組 UUID，沒有捏造 FK。堂數由 credit_ledger.delta 加總；出勤與課後建議仍在 bookings。
- schema-catalog.json：實際在隔離 PostgreSQL 相容引擎執行 01、05、06、07 後擷取的欄位、完整約束與外鍵，不以人工猜測欄位名稱畫圖。
- Flowie_ER_Model.dot：Graphviz 可編輯圖形原稿。
- er-artifacts.json：PNG、DOT、catalog 的 SHA-256 與數量，供一致性檢查。
- installation-plan.json：程式與測試共用的安裝順序、選用步驟與占位文字清單。

PNG 已附在本層，**啟動網站不需要 Graphviz 或 Python**。只有要重新產生 ER 圖才安裝 Graphviz（dot 在 PATH），再於專案根目錄執行 npm run db:er；輸出仍在本資料夾。npm run db:catalog 可只更新 schema catalog，沒有 Graphviz 也能執行；修改 catalog 後須同步重畫 PNG 才會通過檢查。

本地驗證：npm run test:db-install 實際跑完整 01～07（以隔離 Auth fixture 替換 UID），確認占位文字未換時拒絕；npm run test:db-smoke 驗證 RLS／交易；npm run test:concurrency 驗證並發。這些不代表已在您的真實 Supabase 專案執行。

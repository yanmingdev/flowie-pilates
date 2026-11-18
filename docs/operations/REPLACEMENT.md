# 完整替換與保留 Git

本 ZIP 只有一層 `flowie-pilates/`，**包含附件原有完整 `.git/`**，不需重新 `git init`。只依上傳時快照保留 Git 歷史與暫存區；若您上傳後又新增 commit 或 staged 內容，請使用下方「較新的 Git」步驟。

## 依上傳快照完整替換

1. 停止正在執行的 npm／Node 服務，關閉占用檔案的編輯器工作階段。
2. 將目前整個專案資料夾改名備份，例如 `C:\flowie-pilates` 改為 `C:\flowie-pilates_backup_20261118`。**不要刪除舊資料夾或 `.git`。**
3. 把 ZIP 解壓到 `C:\`，得到 `C:\flowie-pilates`。如果原專案叫 `flowie-studio`，將解壓得到的外層目錄改成原名稱。不要形成兩層同名目錄。
4. 在新專案根目錄執行：

```powershell
npm ci
npm run check
npm run dev
```

前端 http://localhost:5173，後端健康檢查 http://localhost:3001/api/v1/health。另開終端可用 `git status -sb` 檢查原分支與檔案變更；因檔案已整理，看到修改／刪除／未追蹤項目是預期結果，請自行 review 後再決定提交。

不能只把新檔案直接覆蓋到未整理的舊目錄：一般解壓覆蓋不會清除舊 pages／routes 等重複檔案。新增架構檢查會指出殘留檔案。上述先改名備份、再完整解壓的方式會保留舊內容，也能得到乾淨的新目錄。

## 如果本機 Git 比上傳附件更新

先完成完整舊目錄備份。解壓新包到另一個暫存資料夾，**只在該暫存資料夾排除包內的 `.git`**；保留備份中較新的 `.git`，將它複製到新程式目錄，原備份仍完整保留。不要以本包的舊 `.git` 覆寫您上傳後的新 Git 紀錄。不要執行 reset／clean 來消除預期的重構變更。

## 設定、SQL 與回退

附件 `.env`、`config/env/.env.local` 均保留。分類環境檔存在時不讀根目錄 fallback，系統變數優先。若本機設定在上傳後更動過，從備份取回您更新的連線設定，再重啟服務。

本次不改遠端 Supabase，單純換程式不需要執行 SQL。新空白專案才依 `supabase/sql/README_SQL.md` 執行 01→02→選用 03／04→05→06→07；03／04 需真實 Auth UID。舊 SQL 與舊驗證輸出在 archive 只供參考。

node_modules 和 dist 由原 lockfile／build 重建，不含在 ZIP。回退時停止新服務，將備份資料夾還原原名稱即可；本次沒有變更正式資料庫。

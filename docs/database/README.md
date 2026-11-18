# 資料庫文件

完整 SQL、安裝順序與 ER PNG 現在全部位於 supabase/sql/。以該資料夾 README_SQL.md 為最新說明。原 Excel 字典保留作核心 V1 15 表參考；07 新增 knowledge_articles 與 bookings.teacher_feedback，精確 16 表及所有欄位／約束請看 schema-catalog.json 與 ER 圖。

01、02、05、06、07 有效內容與上版一致；03／04 僅把環境特定 Auth UID 改為明確占位文字，避免全新安裝誤用舊 UID。本次沒有執行正式 SQL，也不需要為 Node／Express 分層重跑資料庫腳本。舊 V1.2 仍僅封存在 archive 裡。

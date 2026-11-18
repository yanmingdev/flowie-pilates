# 圖片與靜態資產分類

| 分類 | 路徑 | 維護方式 |
|---|---|---|
| 品牌向量 | frontend/public/assets/images/brand/ | logo.svg、logo-light.svg、favicon.svg 維持向量 |
| 首頁圖片 | frontend/public/assets/images/home/flowie-hero.png | 保留附件既有 PNG 位元組 |
| 課程圖片 | frontend/public/assets/images/courses/flowie-course.png | 保留附件既有 PNG 位元組 |
| 身體知識 | frontend/public/assets/images/knowledge/*.png | 由附件三張 SVG 真正轉出 PNG，保留內容 |
| 知識可編輯原稿 | docs/design/source-assets/knowledge/*.svg | 僅原稿與舊 URL 相容來源，非新前端圖片來源 |
| PWA 圖示 | frontend/public/assets/icons/pwa/*.png | 保留 192、512、maskable 圖示 |
| 設計參考 | docs/design/flowie-brand-reference.png | 附件原始參考，不當成新的網站圖片 |
| 歷史截圖 | docs/history/screenshots/*.jpg | 保留真實 JPEG 格式；不是 AI 圖，不冒稱本次新驗證 |

未新增 AI 生成圖片，也不假設附件圖片的授權來源。若未來產生 AI 圖片，公開匯出檔統一用真實 PNG（檢查檔案簽章），依 home／courses／knowledge 等用途分類；不要把 JPEG 或 SVG 改副檔名假裝 PNG。Logo 與 UI 圖示等可維護的向量資產維持 SVG。

前端集中透過 shared/config/assets.ts 的 resolvePublicAssetUrl 轉換已知舊網址，外部圖片網址原樣保留。設定新圖片時應使用分類後的 /assets/... 路徑。既有 DB 舊值不用修改。

config/assets/legacy-url-map.json 是舊公開 URL→新公開 URL；legacy-source-map.json 只用於舊 SVG 路徑須保留向量 MIME 的情況。同步腳本從 canonical 圖或可編輯原稿產生相容副本，避免 /images/knowledge-bridge.svg 回傳 PNG 位元組卻標成 SVG。npm run dev／build 會自動同步，亦可獨立執行 npm run assets:sync。相容副本在 Git ignore 中，不能手改，也不是第二份原始來源。

PWA 圖示路徑與 HTML favicon 已同步更新；大張內容圖保持不進預快取，避免分類後意外增加離線快取大小。外部圖片或資料庫自訂 URL 的可用性與授權仍須由營運方確認。

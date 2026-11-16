# 原始需求與歷史紀錄

此檔保留原始需求及早期版本的交付紀錄；目前程式、安裝與測試狀態請以 V1.2 的 README 和 docs 為準。

# Flowie Studio V1.0｜完整專案開發需求與執行 Prompt

**專案名稱：** Flowie Studio  
**品牌名稱：** Flowie｜芙洛  
**版本：** V1.0  
**需求定稿日期：** 2026-11-14  
**技術架構：** React + Node.js + Express + Supabase  
**核心原則：** Database-Driven、Mobile-First、RWD、PWA、前後端分離、可持續維護

---

# 0. 角色與任務

你現在是一個具備完整產品交付能力的資深軟體開發團隊，包含：

- Senior Full-Stack Engineer
- Software Architect
- PostgreSQL Database Architect
- UI/UX Product Designer
- QA Automation Engineer
- DevOps Engineer
- Security Engineer

請使用 GPT 工作模式實際建立完整的 **Flowie Studio V1.0 瑜珈與皮拉提斯課程預約管理平台**。

本次要求的是正式結構、具備完整資料庫與業務流程的可執行專案，不是靜態網站、展示用 Mockup 或只有部分功能的 Prototype。

請直接進行實作、建立檔案、串接資料庫、整合前後端、測試、修正錯誤，最後提供可下載的完整 ZIP 專案。

請自行解決一般性技術決策，不要在每個開發階段停下來要求我確認。

若任務受到工具、權限或執行環境限制，應完成可以執行的部分，並清楚記錄未完成事項，不可虛構測試或完成結果。

## 0.1 核心開發目標

1. 建立完整前後端分離的網站。
2. 前端使用 React + TypeScript + Vite。
3. 後端使用 Node.js + Express + TypeScript。
4. 正式資料庫使用 Supabase PostgreSQL。
5. 使用 Supabase Auth 管理使用者。
6. 使用 PostgreSQL RLS 與後端權限驗證保護資料。
7. 支援多品牌、多分店、多教室、多老師、多課程。
8. 完成教室、老師、課程、時段、學生、方案、預約與出勤管理。
9. 主要網站與營運資料由資料庫提供。
10. 盡量讓後續維護只需透過 Supabase 或 Flowie 後台修改資料。
11. 完整支援手機、平板及桌面的 RWD。
12. 完整支援 PWA 安裝及基本離線處理。
13. 提供真正可操作的月、週、日行事曆。
14. 實作安全的預約名額與堂數交易。
15. 完成測試、操作文件及版本管理。
16. 最後提供 `flowie-studio-v1.0.zip`。

## 0.2 本次不開發的項目

避免過度設計，V1 暫不包含：

- 線上信用卡金流
- 訂閱制自動扣款
- AI 智慧推薦
- 即時聊天
- LINE 官方帳號整合
- 簡訊大量發送
- 複雜候補名單
- 薪資與會計系統
- 原生 Android / iOS App
- 複雜 Marketplace 抽成系統

課程方案可以由管理員建立與指派給學生，但 V1 不需要實際金流。

未來可以擴充，但不應為未開發功能建立大量空殼程式。

---

# 1. 品牌設計系統

## 1.1 正式品牌資訊

| 項目 | 內容 |
|---|---|
| 品牌名稱 | Flowie |
| 中文名稱 | 芙洛 |
| 管理平台名稱 | Flowie Studio |
| 程式專案名稱 | flowie-studio |
| 英文標語 | Find Your Flow. |
| 中文主標題 | 找到屬於自己的節奏。 |
| 中文副標題 | 從呼吸開始，與更好的自己相遇。 |

品牌定位：

打造一套針對年輕女性設計的瑜珈、皮拉提斯課程預約平台。

風格需具備：

- 清新簡潔
- 女性親和力
- 奶茶色調
- 柔和療癒
- 現代感
- 精品運動生活風格
- 操作直覺
- 清楚的資訊層次

學生端應像一個日常使用的精緻生活 APP。

管理端則要兼顧相同品牌風格與真正的後台操作效率。

## 1.2 品牌色票

請使用以下色彩建立完整 Design Tokens：

| 色彩 | HEX | 用途 |
|---|---|---|
| 鼠尾草綠 | #849A86 | 主品牌色 |
| 奶茶米白 | #F7F3EE | 主要背景 |
| 柔霧粉 | #E9CFC9 | 輔助點綴 |
| 可可棕 | #514A45 | 文字 |
| 純白 | #FFFFFF | 卡片及表單 |
| 淺灰綠 | #E6EBE4 | 次要背景 |

請建立：

- Primary
- Primary Hover
- Primary Active
- Background
- Surface
- Text Primary
- Text Secondary
- Border
- Success
- Warning
- Error
- Disabled

使用 CSS Variables 或相容的 Theme Tokens 集中管理。

不得在各個頁面隨意加入不一致的顏色。

需確保文字、表單與互動元素的必要對比度。

## 1.3 Logo

建立原創 Flowie Logo。

設計方向：

- 小寫 `flowie.`
- 柔和圓潤的文字
- 流動感
- 呼吸曲線
- 簡約葉片
- 優雅但不過度成熟

請提供：

- SVG Logo
- 深淺背景版本
- Favicon
- PWA App Icon
- Maskable Icon

避免直接複製其他品牌標誌。

## 1.4 UI 參考方向

參考下列產品的設計理念：

- Apple Wallet：資訊卡片與視覺層次。
- Cash App：操作簡潔。
- Too Good To Go：親切的手機體驗。
- 精品 Pilates Studio：柔和、自然的視覺語言。

不得複製既有品牌素材或畫面。

## 1.5 UI 元件規範

統一建立可重複使用的：

- Button
- Input
- Select
- Date Picker
- Time Picker
- Calendar
- Dialog
- Drawer
- Bottom Sheet
- Card
- Badge
- Table
- Search Bar
- Filter Panel
- Tabs
- Toast
- Pagination
- Empty State
- Loading Skeleton
- Confirmation Dialog

手機端的主要操作應容易觸控。

桌面管理端應具備較高資訊密度，但避免畫面擁擠。

---

# 2. 正式技術架構

## 2.1 Frontend

採用：

- Node.js LTS
- React
- TypeScript
- Vite
- React Router
- Tailwind CSS
- shadcn/ui 或相容方案
- TanStack Query
- React Hook Form
- Zod
- FullCalendar
- vite-plugin-pwa

前端負責：

- UI Rendering
- Routing
- State Management
- Form Validation
- API Integration
- Responsive Layout
- PWA
- Calendar
- Dashboard
- 資料展示

前端業務 API 應統一呼叫 Express。

不得在 React 直接使用 Supabase 的高權限金鑰。

## 2.2 Backend

採用：

- Node.js LTS
- Express
- TypeScript
- Supabase JavaScript SDK
- Zod
- RESTful API
- Structured Logging
- Error Middleware
- Rate Limiting

後端分層：

Route → Controller → Service → Repository / Supabase SDK

請勿將所有功能塞進單一 Controller。

請避免不必要的 Util、Adapter、Mapper、Test Stub。

應使用可讀性高的命名，並在重要業務邏輯添加簡潔註解。

## 2.3 Database

正式使用：

**Supabase PostgreSQL**

包含：

- PostgreSQL Database
- Supabase Auth
- Supabase Storage
- Row Level Security
- SQL Migration
- PostgreSQL Functions
- PostgreSQL Transactions
- RPC
- Supabase CLI
- Supabase Studio / Table Editor

不使用 PocketBase、Prisma 或其他 ORM 作為 V1 的正式資料層。

以 SQL Migration 作為資料結構的版本管理來源。

使用 Supabase CLI 管理本地環境與 Schema。

## 2.4 架構資料流

所有主要業務流程遵循：

React Frontend

↓

Express REST API

↓

Supabase SDK / PostgreSQL RPC

↓

Supabase PostgreSQL

↓

回傳 JSON

↓

React Query 更新 UI

前端與後端必須能獨立 Build、部署及維護。

不應建立額外、沒有必要的 Express Session 資料庫。

## 2.5 認證架構

使用 Supabase Auth。

支援：

- Email / Password 註冊
- 登入
- 登出
- 重設密碼
- 使用者資料查詢
- Session Expiration
- Token Refresh
- 權限驗證

Express 需驗證 Supabase Auth 的使用者身分。

不得只解碼 JWT Payload 就視為已通過驗證。

需使用經驗證的 JWT 簽章、Claims、Issuer、Audience 或官方伺服器端驗證機制。

任何高權限操作，都要檢查目前使用者的角色與資料歸屬。

---

# 3. Database-Driven Architecture

## 3.1 核心需求

我希望未來維護 Flowie 時，能盡量透過 Supabase Table Editor 或 Flowie Studio 後台操作，而不用修改前端程式碼。

例如：

- 新增課程
- 修改課程名稱
- 更換課程圖片
- 新增老師
- 修改老師介紹
- 新增教室
- 修改教室容量
- 設定老師可授課時間
- 調整課程日期與時間
- 修改首頁 Banner
- 修改網站標語
- 修改公告
- 設定預約期限
- 設定取消規則
- 新增課程方案
- 停用課程分類

上述功能應盡量實現「修改資料後，重新取得 API 資料即可更新前端」。

不得將正式營運資料寫死在 React Component 中。

## 3.2 動態資料來源

下列資料必須由 Supabase 提供：

| 資料 | 用途 |
|---|---|
| studios | 品牌資訊 |
| branches | 分店資訊 |
| rooms | 教室資訊 |
| teachers | 老師 |
| course_categories | 課程分類 |
| courses | 課程模板 |
| class_sessions | 課程場次 |
| bookings | 預約 |
| student_packages | 學生課程方案 |
| credit_ledger | 堂數 |
| attendance | 出勤 |
| site_settings | 網站設定 |
| homepage_sections | 首頁元件設定 |
| banners | 網站橫幅 |
| booking_settings | 預約規則 |
| announcements | 公告 |

實際 Schema 可以依照正規化及需求調整。

## 3.3 Config-Driven UI

網站首頁不應完全寫死。

請使用明確定義的 React 元件，例如：

- HeroBanner
- CourseSection
- TeacherSection
- AnnouncementSection
- QuickBookingSection

再透過資料庫控制：

- 顯示或隱藏
- 標題
- 副標題
- 圖片
- 排序
- 導向連結
- 內容

不應將任意 JavaScript 存入資料庫並在前端執行。

資料庫負責內容與設定，React 負責組件與互動行為。

## 3.4 後續維護流程

例如：

在 Supabase 修改 `courses.name`。

Express API 重新讀取資料。

React Query 在資料失效、重新整理或重新取得資料時更新課程名稱。

再例如：

管理員在後台新增老師。

資料寫入 `teachers`。

排課畫面透過 API 取得老師清單。

新增老師即出現在符合分店及課程資格的選項中。

## 3.5 快取與更新

請建立合理的：

- Query Key
- Query Invalidation
- Stale Time
- Refetch Strategy
- Error Handling

內容變更後應確保相關畫面取得新資料。

不要求每筆資料都使用 Realtime。

預約名額必須在真正提交時由後端重新驗證，不能相信前端快取。

## 3.6 後台內容管理

請建立「網站設定」管理功能。

至少可管理：

- 品牌資訊
- 首頁 Banner
- 首頁文案
- 首頁區塊排序
- 公告
- 聯絡資訊
- 課程分類
- 基礎營運設定

應使用權限控管，避免一般學生修改網站內容。

## 3.7 資料與 Schema 的區別

修改既有資料列：

使用 Supabase Table Editor 或 Flowie 管理後台。

修改資料表結構、索引、RLS、Functions：

使用 SQL Migration，並提交 Git。

不得讓正式環境的 Schema 長期依賴未記錄的人工修改。

---

# 4. 資料庫模型

## 4.1 多工作室架構

雖然 V1 可以先用一個示範品牌運作，但資料結構要支援未來多品牌 SaaS。

關聯：

Studio → Branch → Room

Studio → Course → Class Session

Teacher → Class Session

Student → Booking → Class Session

Student → Student Package → Credit Ledger

Class Session → Attendance

所有需要隔離的業務資料都應具備明確的 Studio / Tenant 關聯。

## 4.2 主要資料表

至少規劃：

| Table | 功能 |
|---|---|
| profiles | 使用者基本資料 |
| studios | 工作室品牌 |
| studio_memberships | 品牌成員與角色 |
| branches | 分店 |
| rooms | 教室 |
| teachers | 老師資料 |
| teacher_branches | 老師與分店關聯 |
| teacher_courses | 老師授課資格 |
| teacher_availability | 老師可授課時段 |
| teacher_time_off | 老師請假 |
| course_categories | 課程分類 |
| courses | 課程模板 |
| schedule_rules | 重複排課規則 |
| class_sessions | 實際課程場次 |
| bookings | 學生預約 |
| attendance | 學生出勤 |
| course_packages | 課程方案 |
| student_packages | 學生購買或持有方案 |
| credit_ledger | 堂數異動 |
| site_settings | 品牌網站設定 |
| homepage_sections | 首頁內容設定 |
| banners | Banner |
| booking_settings | 預約規則 |
| announcements | 公告 |
| audit_logs | 重要操作紀錄 |

可以合理新增或合併必要資料表，但需說明設計原因。

## 4.3 Schema 基本規範

每個適用的資料表需包含：

- id
- studio_id
- created_at
- updated_at
- status 或 is_active
- 必要關聯欄位

並設計：

- Primary Key
- Foreign Key
- Unique Constraint
- Index
- Check Constraint
- Referential Integrity

不可所有欄位都使用自由文字，導致資料關聯無法維護。

歷史資料不得因停用老師、課程或教室而消失。

## 4.4 Profiles 與 Auth

認證資料由 Supabase Auth 管理。

應使用 `auth.users.id` 與應用程式 `profiles.id` 建立明確關聯。

不得將密碼另外以明文儲存在 profiles。

建立使用者時應妥善處理 profile 初始化、角色指派與權限。

## 4.5 方案與堂數

必須區分：

Course Package：方案模板。

Student Package：學生實際持有的方案。

Credit Ledger：每次堂數異動。

例如：

學生購買或由管理員指派 10 堂方案。

student_packages 記錄該學生的方案、起始日期、到期日等資訊。

credit_ledger 記錄：

- 初始授予 +10
- 預約扣除 -1
- 取消返還 +1
- 人工調整 +2

需要能查詢目前可用堂數。

可使用經驗證的一致性快取欄位提升效率，但帳本仍必須可稽核，且不得讓前端直接任意修改餘額。

堂數異動不得重複執行。

---

# 5. 使用者角色與權限

## 5.1 Super Admin

可管理：

- 平台工作室
- 品牌啟用狀態
- 品牌管理員
- 基本平台設定

Super Admin 是應用程式角色，不代表瀏覽器擁有 Supabase Service Role Key。

## 5.2 Studio Admin

可管理自己有權限的品牌與分店：

- 分店
- 教室
- 老師
- 課程
- 排課
- 學生
- 預約
- 出勤
- 堂數
- 網站設定
- 報表

不得讀取其他品牌的未授權敏感資料。

## 5.3 Teacher

可：

- 查看自己的排課
- 查看自己的授課場次
- 查看必要的學生名單
- 登記出勤
- 查看授課時數
- 查看老師行事曆

不得任意修改學生方案或堂數。

## 5.4 Student

可：

- 查看公開課程
- 預約
- 取消預約
- 查看自己的堂數
- 查看自己的預約
- 查看自己的出勤
- 修改自己的基本資料

## 5.5 RBAC + RLS

所有敏感資料表需建立適當的 Row Level Security。

不能只依靠 React 隱藏功能。

需明確處理：

- Anonymous
- Authenticated Student
- Teacher
- Studio Admin
- Super Admin

避免因權限設計產生跨品牌資料洩漏。

必要的管理功能使用後端可信任路徑。

在使用高權限 Supabase Client 時，Express 必須先驗證角色、Tenant 與資源歸屬。

---

# 6. 管理 Dashboard

首頁至少顯示：

- 今日課程數
- 今日預約人數
- 今日出席人數
- 本週課程數
- 本月預約數
- 今日取消數
- 各教室使用情況
- 近期課程
- 待處理事項

所有數據由資料庫計算。

支援：

- 日期區間
- 分店篩選
- 場次狀態篩選

不得硬編碼統計數值。

---

# 7. 分店與教室管理

## 7.1 分店管理

功能：

- 新增
- 修改
- 查詢
- 停用
- 搜尋

欄位：

- 品牌
- 分店名稱
- 地址
- 電話
- Email
- 營業時間
- 描述
- 狀態

## 7.2 教室管理

功能：

- 新增教室
- 修改教室
- 停用教室
- 搜尋教室
- 查看教室行事曆
- 查看教室使用情況

欄位：

- 所屬分店
- 教室名稱
- 容納人數
- 描述
- 設備或特色
- 狀態

一間教室必須可以擁有多個課程時段。

教室不應直接綁死單一老師或單一課程。

已排課的教室停用時，應保護既有場次與預約資料。

---

# 8. 老師管理

功能：

- 新增老師
- 修改老師
- 停用老師
- 搜尋老師
- 指派分店
- 設定授課資格
- 設定可授課時間
- 查看授課紀錄
- 查看老師行事曆

欄位：

- 姓名
- Email
- 手機
- 照片
- 專長
- 簡介
- 所屬分店
- 可授課課程
- 狀態

## 8.1 老師請假

V1 必須可以設定老師不可授課時段。

包括：

- 日期
- 開始時間
- 結束時間
- 請假原因或備註
- 狀態

排課時必須檢查請假及原有授課時間。

## 8.2 代課

管理員可以為指定場次更換授課老師。

更換前必須檢查：

- 老師是否具備授課資格
- 是否有排課衝突
- 是否請假
- 是否在可授課時段

需要保留原授課老師及調整紀錄。

---

# 9. 課程管理

## 9.1 課程分類

分類可由管理員維護，例如：

- 瑜珈
- 皮拉提斯
- 墊上皮拉提斯
- 器械皮拉提斯
- 核心訓練
- 舒緩伸展

不可永久寫死於前端。

## 9.2 課程欄位

- 課程名稱
- 分類
- 說明
- 圖片
- 課程時長
- 難度
- 預設容量
- 消耗堂數
- 啟用狀態

課程模板與實際場次必須分開。

同一課程可以在不同分店、教室、老師及時間開設。

---

# 10. 排課管理

這是 Flowie 的核心模組之一。

管理員應可以在同一個排課畫面選擇：

1. 分店
2. 教室
3. 課程名稱
4. 老師
5. 日期
6. 開始時間
7. 結束時間
8. 人數上限
9. 預約開放時間
10. 取消期限
11. 單次或重複排課

請提供清楚的場次預覽。

## 10.1 排課方式

支援：

- 單次排課
- 每週固定排課
- 自訂結束日期
- 修改單一場次
- 修改未來場次
- 取消單一場次

## 10.2 時間檢查

必須檢查：

- 教室撞期
- 老師撞期
- 老師請假
- 老師可授課時間
- 老師授課資格
- 教室容量
- 無效時間區間
- 重複建立同一場次

不能只在前端進行檢查。

重要排課衝突應在資料庫層透過合理約束、鎖定或交易保護，避免同時操作造成重複排課。

## 10.3 重複排課

使用 schedule_rules 管理規則。

產生 class_sessions 作為實際可預約場次。

應具備：

- 防止重複產生
- 避免無限產生
- 支援設定有效期間
- 支援修改單筆場次
- 支援取消未來場次

不得在查詢時無限制產生所有歷史與未來日期。

## 10.4 已有預約的場次

若已有人預約：

- 不可直接刪除場次而失去紀錄。
- 取消場次須處理所有有效預約。
- 依規則退還堂數。
- 留存修改及取消歷史。
- 不可任意將容量縮小至小於已預約人數。

---

# 11. 行事曆

使用 FullCalendar 或同級成熟元件。

## 11.1 檢視模式

至少提供：

- 月檢視
- 週檢視
- 日檢視
- 列表檢視

## 11.2 篩選

至少包含：

- 日期區間
- 分店
- 教室
- 老師
- 課程
- 場次狀態

## 11.3 互動

支援：

- 點擊場次查看詳情
- 點擊日期或空白時段建立課程
- 點擊查看學生名單
- 點擊修改場次
- 點擊取消場次
- 不同狀態的顏色區分

可以視實作穩定性評估拖曳調整時間，但不得犧牲排課衝突檢查與既有預約資料一致性。

## 11.4 手機版

手機行事曆必須適當簡化。

建議：

- 日期選擇器
- 日程列表
- 精簡週檢視
- 課程詳情 Bottom Sheet

不可單純縮小桌面版月曆導致文字擠壓。

---

# 12. 學生管理

支援：

- 新增學生
- 修改學生
- 停用學生
- 搜尋學生
- 查看預約紀錄
- 查看出勤紀錄
- 查看課程方案
- 查看剩餘堂數
- 查看堂數異動

必要欄位：

- 姓名
- Email
- 手機
- 生日（選填）
- 註冊日期
- 帳號狀態
- 備註

學生資料需遵守最小權限與資料保護原則。

---

# 13. 課程方案與堂數

## 13.1 Course Package

管理員可建立：

- 方案名稱
- 總堂數
- 適用課程
- 有效期限
- 啟用狀態
- 方案備註

V1 可提供方案參考價格欄位，但不需串接金流。

## 13.2 Student Package

學生持有的方案需記錄：

- 學生
- 課程方案
- 啟用時間
- 到期時間
- 授予堂數
- 狀態

## 13.3 Credit Ledger

每筆堂數交易至少包含：

- Student
- Student Package
- Transaction Type
- Credit Delta
- Related Booking
- Operator
- Created At
- Note
- Idempotency Key 或等效唯一約束

異動類型例如：

- GRANT
- BOOKING_DEBIT
- CANCELLATION_REFUND
- MANUAL_ADJUSTMENT
- EXPIRATION（適用時）

需維護可稽核的紀錄。

不可用前端直接加減堂數後寫回資料庫。

## 13.4 堂數規則

- 不可預約超過剩餘堂數的課程。
- 過期方案不可用於新預約。
- 不適用的方案不可扣除。
- 預約失敗不可扣堂。
- 取消成功依規則返還。
- 同一筆預約不可重複扣除或重複退還。
- 必須防止並行操作造成負數堂數。

---

# 14. 預約系統

這是最高優先級業務功能。

## 14.1 學生預約流程

學生端採用三步驟：

Step 1：選擇分店、課程或日期。

Step 2：選擇可預約場次。

Step 3：確認預約。

成功後顯示：

- 課程名稱
- 日期時間
- 分店
- 教室
- 老師
- 消耗堂數
- 預約編號
- 預約狀態

## 14.2 Booking 狀態

建議建立明確狀態機，例如：

- CONFIRMED
- CANCELLED
- COMPLETED
- NO_SHOW

出勤狀態與預約狀態應合理區分，避免狀態互相矛盾。

需定義允許的狀態轉換。

## 14.3 預約驗證

必須確認：

- 使用者已登入。
- 使用者有預約資格。
- 場次尚未開始。
- 場次未被取消。
- 預約已開放。
- 尚有名額。
- 學生尚未預約此場次。
- 學生持有適用方案。
- 有效堂數足夠。

## 14.4 並行預約安全

例如：

場次人數上限 10 人。

目前已有 9 個有效預約。

同時有 5 位學生按下預約。

系統最多只能允許 1 位成功。

不能讓前端與後端分別查詢後，依序建立多筆預約造成超賣。

## 14.5 資料庫交易

請建立受保護的 PostgreSQL Function，例如：

`book_class_session(...)`

具體命名可調整。

必須在單一資料庫交易內：

1. 確認呼叫者身分。
2. 驗證角色與學生資料歸屬。
3. 對必要資源進行鎖定。
4. 驗證場次及預約期限。
5. 檢查剩餘名額。
6. 檢查有效方案及堂數。
7. 建立 Booking。
8. 建立 Credit Ledger。
9. 更新必要的計數或餘額。
10. 回傳成功結果。

失敗時全部 Rollback。

請採用 PostgreSQL Row Lock、Unique Constraint、適當 Isolation Strategy 或其他經驗證可行的並行控制方式。

不可只透過 JavaScript 的 if 判斷避免超賣。

## 14.6 RPC 安全

PostgreSQL Functions 必須：

- 明確限制 EXECUTE 權限。
- 驗證呼叫者身分。
- 驗證使用者與學生紀錄的關聯。
- 驗證 Tenant 歸屬。
- 避免使用者偽造操作人或目標學生。
- 對 SECURITY DEFINER Function 設定安全的 search_path。
- 不接受前端任意指定扣除堂數或最終餘額。
- 防止重複請求。

若 Express 使用 Service Role 呼叫 RPC，必須設計可信任的身分傳遞方式，並避免把任意前端 user_id 當成可信任身分。

優先使用可保留已驗證使用者身分的 JWT Context 與受限函式權限。

## 14.7 取消預約

建立對應的安全取消流程：

`cancel_class_booking(...)`

應：

1. 驗證使用者與預約所有權。
2. 驗證取消期限。
3. 驗證預約尚未取消。
4. 更新 Booking。
5. 視規則返還堂數。
6. 建立 Refund Ledger。
7. 保留歷史紀錄。
8. 防止重複取消與重複退款。

以上動作應在同一筆資料庫交易中完成。

---

# 15. 老師與學生出勤

## 15.1 老師授課紀錄

可搜尋：

- 日期區間
- 分店
- 教室
- 老師
- 課程
- 時段
- 場次狀態

顯示：

- 課程名稱
- 教室
- 日期
- 開始與結束時間
- 授課時長
- 報名人數
- 出席人數

## 15.2 學生出勤

課程詳情顯示學生名單。

老師或管理員可以標記：

- 已出席
- 缺席
- 未確認

取消預約者不應被當作有效出席。

需保留合理的出勤修改紀錄。

## 15.3 權限

老師只能管理有授權的場次。

管理員可查看所屬品牌及分店。

學生只能查看自己的紀錄。

---

# 16. 學生端

## 16.1 首頁

使用 Flowie 品牌視覺。

包含：

- Logo
- Hero Banner
- 品牌標語
- 快速預約
- 近期可預約課程
- 我的下一堂課
- 我的剩餘堂數
- 課程分類
- 公告

## 16.2 課程探索

可依：

- 分店
- 課程類型
- 老師
- 日期
- 時段
- 剩餘名額

進行搜尋。

## 16.3 課程卡片

顯示：

- 課程圖片
- 課程名稱
- 老師
- 分店
- 日期
- 時間
- 課程時長
- 剩餘名額
- 消耗堂數
- 預約按鈕

## 16.4 我的預約

包含：

- 即將到來
- 歷史紀錄
- 已取消
- 預約詳情
- 取消預約

## 16.5 我的堂數

包含：

- 有效方案
- 剩餘堂數
- 方案到期日
- 堂數使用紀錄
- 異動紀錄

## 16.6 我的個人資料

支援：

- 個人資料查詢
- 修改基本資料
- 密碼變更
- 登出

## 16.7 手機導覽

建議底部導覽列：

- 首頁
- 課程
- 我的預約
- 我的堂數
- 我的

可依視覺設計適度調整，但重要功能應易於找到。

---

# 17. RWD 響應式設計

**RWD 是 V1 的強制驗收項目。**

採用 Mobile-First。

至少測試下列 Viewport：

| 尺寸 | 裝置 |
|---|---|
| 320 × 568 | 小型手機 |
| 375 × 812 | 一般手機 |
| 430 × 932 | 大型手機 |
| 768 × 1024 | 平板 |
| 1280 × 800 | 桌面 |
| 1440 × 900 | 大型桌面 |

## 17.1 手機設計

- 單欄優先。
- 底部導覽。
- 卡片式內容。
- 大小適當的觸控按鈕。
- 表單適合手機輸入。
- 支援 Safe Area。
- 優化日期及時間選擇。
- 重要操作不應需要水平捲動。

## 17.2 桌面設計

- 管理端採用 Sidebar。
- 適當使用資料表格。
- 支援複合查詢。
- 行事曆顯示更完整資訊。
- 不浪費過多畫面空間。

## 17.3 平板設計

依寬度動態調整布局。

不能只將桌面版縮小。

## 17.4 驗收條件

不得出現：

- 不合理水平捲動
- 表單超出畫面
- Dialog 被裁切
- 按鈕重疊
- 導覽列無法使用
- 重要文字無法閱讀
- 行事曆操作失敗

請以實際瀏覽器測試，而不是只檢查 CSS 是否存在 Media Query。

---

# 18. PWA

**PWA 是 V1 的必要功能。**

採用：

- vite-plugin-pwa
- Web App Manifest
- Service Worker
- Workbox 或相容機制

## 18.1 必要功能

包含：

- name: Flowie
- short_name: Flowie
- start_url
- scope
- display: standalone
- theme_color
- background_color
- 192×192 Icon
- 512×512 Icon
- Maskable Icon
- Service Worker
- Offline Fallback
- Update Handling

## 18.2 安裝

應支援符合條件的瀏覽器與裝置：

- Android Chrome
- iOS Safari 加入主畫面
- 支援 PWA 的桌面瀏覽器

不得假設不同平台的安裝操作完全相同。

## 18.3 離線策略

V1 採用：

**Online-First Booking**

可以快取：

- App Shell
- 靜態圖示
- 基本靜態資源
- 合適的非敏感公開內容

不可在離線狀態下：

- 假裝預約成功
- 假裝取消成功
- 自行扣堂數
- 自行增加名額
- 顯示過期名額卻當作即時資料
- 無限制保存私人敏感 API 回應

如網路離線：

顯示清楚的離線提示，並禁止需要連線的交易操作。

## 18.4 PWA 更新

需要：

- 偵測新版本。
- 合理提醒更新。
- 避免舊快取導致功能錯誤。
- 避免在表單輸入過程強制重整。

## 18.5 PWA 測試

必須驗證：

- Manifest
- Icons
- Service Worker
- Standalone Mode
- Offline Fallback
- Online Recovery
- Cache Isolation
- Logout Privacy
- Version Update

若無實際手機測試環境，應列出尚未完成的實機驗證。

---

# 19. REST API

使用 `/api/v1` 前綴。

| 模組 | 路徑 |
|---|---|
| Auth | `/api/v1/auth` |
| Studios | `/api/v1/studios` |
| Branches | `/api/v1/branches` |
| Rooms | `/api/v1/rooms` |
| Teachers | `/api/v1/teachers` |
| Teacher Availability | `/api/v1/teacher-availability` |
| Courses | `/api/v1/courses` |
| Course Categories | `/api/v1/course-categories` |
| Sessions | `/api/v1/sessions` |
| Schedule Rules | `/api/v1/schedule-rules` |
| Students | `/api/v1/students` |
| Bookings | `/api/v1/bookings` |
| Attendance | `/api/v1/attendance` |
| Packages | `/api/v1/packages` |
| Student Packages | `/api/v1/student-packages` |
| Credit Ledger | `/api/v1/credit-ledger` |
| Reports | `/api/v1/reports` |
| Site Settings | `/api/v1/site-settings` |
| Homepage | `/api/v1/homepage` |
| Banners | `/api/v1/banners` |
| Announcements | `/api/v1/announcements` |

需依照實際資源合理設定 GET、POST、PATCH、DELETE。

Booking、Credit Ledger 與 Attendance 等重要業務資料不得任意開放通用 DELETE 或任意狀態 PATCH。

應提供明確的業務操作 Endpoint。

## 19.1 API 規範

包含：

- Pagination
- Sorting
- Filtering
- Search
- Validation
- Error Handling
- Request ID
- Auth Middleware
- RBAC
- Tenant Validation

## 19.2 API 文件

提供：

- OpenAPI Specification
- Swagger UI 或同級文件
- Request Example
- Response Example
- Error Code

---

# 20. Supabase 安全

## 20.1 RLS

所有含個人資料或品牌隔離需求的 Table 都需啟用並測試 RLS。

應明確考慮：

- Anonymous
- Authenticated
- Student
- Teacher
- Studio Admin
- Super Admin

不可以使用過度寬鬆的 Policy 來讓開發比較容易。

## 20.2 金鑰安全

Supabase Publishable Key 可以依官方用途配置。

Supabase Secret Key / Service Role Key 必須只存在可信任後端。

不得出現在：

- React 程式碼
- 前端環境變數
- 瀏覽器 Bundle
- Git Repository
- README 真實憑證

## 20.3 Storage

課程公開圖片、Logo、老師公開照片可以使用適當的公開 Bucket。

學生私人資料如未來需要檔案儲存，應使用受保護的 Bucket 與存取規則。

需要限制：

- 檔案類型
- 檔案大小
- 檔案權限
- 上傳者
- 路徑歸屬

不可因為使用公開課程圖片 Bucket，就將所有使用者檔案設成公開。

## 20.4 其他安全要求

包含：

- Rate Limiting
- CORS
- Helmet 或相容安全標頭
- Input Validation
- 安全錯誤處理
- SQL Injection Prevention
- XSS Prevention
- 資料權限驗證
- Audit Logging

避免在 Log 中紀錄 Password、完整 Token 或其他敏感資料。

---

# 21. Supabase 初始化與 Migration

請使用 Supabase CLI。

建立：

- `supabase/config.toml`
- `supabase/migrations/`
- `supabase/seed.sql`
- 必要 SQL Functions
- RLS Policies
- Database Indexes
- Storage Bucket Configuration

應提供本地開發方式。

例如：

```bash
npm install
npx supabase start
npx supabase db reset
```

實際指令需以選定的套件版本與 Workspace 配置為準。

## 21.1 Migration

資料結構的新增、修改都必須使用版本化 SQL Migration。

不可只在 Supabase 線上 Table Editor 建立結構，卻沒有可以重建環境的 Migration。

## 21.2 Seed Data

至少包含：

- 1 個品牌
- 2 個分店
- 4 間教室
- 4 位老師
- 6 種課程
- 20 位學生
- 未來 30 天課程場次
- 歷史已完成場次
- 已取消場次
- 不同預約狀態
- 有效課程方案
- 堂數交易
- 出勤資料
- 首頁 Banner
- 網站設定
- 預約設定

Seed Data 須具有合理關聯。

不可大量產生沒有用途的假資料。

## 21.3 示範帳號

需建立可實際登入的：

- Super Admin
- Studio Admin
- Teacher
- Student

Auth 使用者應透過官方支援的方式建立。

不可只插入無法登入的 profiles 然後宣稱示範帳號已完成。

開發用帳號密碼只能用於本地測試。

## 21.4 部署文件

請說明如何：

- 建立 Supabase Project
- 設定環境變數
- 套用 Migration
- 建立 Auth 設定
- 建立 Storage Bucket
- 設定 Express 連線
- 設定前端 API URL
- Build Frontend
- 啟動 Backend

不得要求把 Service Role Key 放到前端。

---

# 22. 專案目錄

建議使用 Monorepo，但前後端保持清楚分離。

```text
flowie-studio/
│
├── frontend/
│   ├── public/
│   │   ├── icons/
│   │   └── favicon.svg
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   ├── features/
│   │   ├── hooks/
│   │   ├── layouts/
│   │   ├── pages/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── styles/
│   │   ├── types/
│   │   └── utils/
│   ├── package.json
│   └── vite.config.ts
│
├── backend/
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── repositories/
│   │   ├── validators/
│   │   ├── types/
│   │   └── app.ts
│   ├── tests/
│   └── package.json
│
├── supabase/
│   ├── config.toml
│   ├── migrations/
│   └── seed.sql
│
├── docs/
│   ├── ARCHITECTURE.md
│   ├── DATABASE.md
│   ├── API.md
│   ├── SUPABASE_SETUP.md
│   ├── DATA_MAINTENANCE.md
│   ├── RWD_PWA.md
│   ├── TESTING.md
│   └── DEPLOYMENT.md
│
├── README.md
├── README_V1.md
├── CHANGELOG.md
├── .env.example
├── .gitignore
├── package.json
└── package-lock.json
```

可依照實際 Workspace 調整。

但不得將全部程式寫在少數超大型檔案內。

---

# 23. 測試計畫

## 23.1 靜態檢查

必須執行：

- TypeScript Type Check
- Frontend Build
- Backend Build
- ESLint
- Migration Validation

## 23.2 API 測試

至少涵蓋：

- 登入
- 權限
- 教室 CRUD
- 老師 CRUD
- 課程 CRUD
- 排課
- 學生管理
- 預約
- 取消
- 出勤
- 堂數
- 報表

## 23.3 預約交易測試

必須驗證：

1. 一般預約成功。
2. 堂數不足失敗。
3. 名額已滿失敗。
4. 重複預約失敗。
5. 課程未開放預約失敗。
6. 場次已開始失敗。
7. 課程已取消失敗。
8. 使用過期方案失敗。
9. 取消成功返還堂數。
10. 重複取消不得重複退堂。
11. 交易失敗不得部分扣堂。
12. 並行預約最後一個名額不得超賣。
13. 使用者不得替其他學生偽造預約。
14. 跨品牌預約不得越權。
15. 重複請求不應造成重複交易。

建議使用整合測試與資料庫並行測試。

## 23.4 排課測試

至少包含：

- 教室撞期
- 老師撞期
- 老師請假
- 老師不可授課
- 教室容量不足
- 重複排課
- 已有預約的場次取消
- 代課老師衝突

## 23.5 RLS 測試

驗證：

- 學生只能讀取自己的私人資料。
- 老師只能操作授權場次。
- 管理員只能管理所屬品牌。
- 跨 Tenant 讀寫被拒絕。
- Anonymous 不可讀取敏感資料。
- 直接呼叫 RPC 不得繞過權限。

## 23.6 Database-Driven 測試

實際驗證：

- 修改課程名稱 → 前端更新。
- 新增老師 → 排課選單更新。
- 新增教室 → 管理後台更新。
- 修改 Banner → 首頁更新。
- 修改課程分類 → 篩選器更新。
- 修改教室容量 → 預約限制更新。
- 修改取消期限 → 後端規則更新。
- 修改課程消耗堂數 → 未來預約使用新設定。

## 23.7 RWD 測試

使用 Playwright 或相容工具檢查手機、平板及桌面尺寸。

## 23.8 PWA 測試

驗證：

- Manifest
- Service Worker
- Icons
- Offline Handling
- Standalone
- Update Flow
- Cache Privacy

## 23.9 測試報告

必須列出：

- 測試名稱
- 執行環境
- 實際結果
- 成功或失敗
- 失敗原因
- 尚未驗證項目

不可只寫「測試全部通過」而沒有實際執行紀錄。

---

# 24. README 與版本管理

這是本專案強制規範。

## 24.1 README.md

此檔案是目前正式專案說明。

包含：

- 專案介紹
- 技術架構
- 安裝步驟
- Supabase 設定
- Environment Variables
- 啟動方法
- Demo 帳號
- API 文件
- 測試方法
- RWD / PWA
- 資料維護方式
- 已知問題

## 24.2 README_V1.md

完整保存本次 V1.0 開發 Prompt。

不得只有摘要。

需額外記錄：

- 開發日期
- 版本
- 實際完成功能
- 技術決策
- 測試結果
- 未完成項目
- 已知問題

如仍存在舊版 PocketBase 規劃，應清楚註明：

**Flowie V1.0 最終正式資料庫為 Supabase；PocketBase 屬於已被取代的規劃草案，不是目前程式的正式依賴。**

## 24.3 未來版本

未來提出新的需求時：

- V2 建立 `README_V2.md`
- V3 建立 `README_V3.md`
- V4 建立 `README_V4.md`

規範：

1. 不覆蓋舊版文件。
2. 保留完整版本需求。
3. 記錄本版與上一版差異。
4. 保留既有正常功能。
5. DB Schema 調整使用 Migration。
6. 不隨意刪除既有功能。
7. 修改後重新執行測試。
8. 新需求優先沿用既有架構，不重複開發。

## 24.4 CHANGELOG.md

維持：

- Added
- Changed
- Fixed
- Removed
- Known Issues

---

# 25. 專案啟動與部署

## 25.1 本地開發

應支援透過 README 指令完成：

1. 安裝 Node.js。
2. 安裝依賴。
3. 啟動 Supabase 本地環境。
4. 執行 Migration。
5. 載入 Seed。
6. 啟動 Express。
7. 啟動 React。
8. 開啟網站。

可使用：

- Frontend：`http://localhost:5173`
- Backend：`http://localhost:3001`
- Supabase：依 CLI 實際產生的本地服務位址

實際指令與 Port 必須與專案一致。

## 25.2 建議指令

請提供可運作的：

- `npm install`
- `npm run dev`
- `npm run build`
- `npm run test`
- `npm run lint`
- `npm run typecheck`
- `npm run db:reset`
- `npm run db:migrate`

實際 Script 名稱可以調整，但文件需正確。

## 25.3 環境變數

需提供 `.env.example`。

例如：

- `PORT`
- `FRONTEND_URL`
- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SECRET_KEY`
- `VITE_API_BASE_URL`

請依照實際 Supabase SDK 及版本使用正確名稱。

不要把真正的 Secret 放進 `.env.example`。

## 25.4 正式部署

需提供：

- HTTPS
- Frontend Hosting
- Express Hosting
- Supabase Cloud
- Environment Variables
- CORS
- Domain
- Logging
- Backup
- Health Check
- Migration Deployment

本次不要求替使用者購買網域或付費服務。

如果缺少正式 Supabase 專案憑證，仍應完成本地可執行版本與雲端設定文件。

---

# 26. 開發流程

請依照以下順序執行。

## Phase 1：架構設計

先完成：

- 功能模組盤點
- RBAC 權限矩陣
- ERD
- API 規劃
- 預約狀態機
- 堂數交易規則
- RWD 設計
- PWA 策略

然後立即進入實作。

## Phase 2：初始化

建立：

- React
- Express
- Supabase CLI
- TypeScript
- Tailwind CSS
- 基礎路由
- 環境設定
- 版本文件

## Phase 3：資料庫

建立：

- Tables
- Relations
- Indexes
- Constraints
- RLS
- SQL Functions
- Storage Policies
- Migration
- Seed

## Phase 4：後端

完成：

- Auth
- RBAC
- CRUD API
- Scheduling Service
- Booking Service
- Cancellation Service
- Credit Ledger
- Attendance
- Reports
- Site Settings

## Phase 5：前端

完成：

- 品牌設計
- 登入註冊
- 學生首頁
- 課程探索
- 課程預約
- 我的預約
- 我的堂數
- 個人資料
- 管理 Dashboard
- 分店管理
- 教室管理
- 老師管理
- 課程管理
- 排課管理
- 行事曆
- 學生管理
- 出勤管理
- 報表
- 網站設定

## Phase 6：RWD 與 PWA

完整實作並驗證：

- Mobile-First
- Responsive Navigation
- Responsive Calendar
- PWA Manifest
- Service Worker
- App Icons
- Offline Handling
- Update Handling

## Phase 7：整合測試

確認：

- 前後端可啟動
- Supabase 可連線
- Migration 成功
- Demo 帳號可登入
- CRUD 正常
- 排課正常
- 預約正常
- 堂數正常
- 出勤正常
- 資料庫驅動正常
- RWD 正常
- PWA 正常

發現問題應直接修正後重新測試。

## Phase 8：交付

完成：

- README.md
- README_V1.md
- CHANGELOG.md
- Database Docs
- API Docs
- Supabase Setup Docs
- RWD/PWA Docs
- Testing Report
- Deployment Docs

最後打包完整專案。

---

# 27. 必要驗收清單

不得將未實際驗證的項目標記完成。

## 技術與資料庫

- [ ] React 可啟動
- [ ] Express 可啟動
- [ ] Supabase 可連接
- [ ] Migration 可執行
- [ ] Seed 成功
- [ ] Auth 正常
- [ ] RLS 正常
- [ ] RBAC 正常
- [ ] API 文件可使用

## 管理功能

- [ ] 分店 CRUD
- [ ] 教室 CRUD
- [ ] 老師 CRUD
- [ ] 課程 CRUD
- [ ] 課程分類維護
- [ ] 老師可授課時間
- [ ] 老師請假
- [ ] 代課
- [ ] 排課
- [ ] 重複排課
- [ ] 行事曆月、週、日檢視
- [ ] 學生管理
- [ ] 課程方案
- [ ] 堂數異動
- [ ] 出勤
- [ ] 報表

## 預約

- [ ] 學生可預約
- [ ] 正確扣堂數
- [ ] 不會重複扣堂
- [ ] 滿額限制正常
- [ ] 並行預約不超賣
- [ ] 可合法取消預約
- [ ] 正確退堂數
- [ ] 不會重複退堂
- [ ] 失敗交易正確回滾

## Database-Driven

- [ ] DB 修改課程，網站更新
- [ ] DB 新增老師，網站更新
- [ ] DB 修改教室，網站更新
- [ ] DB 修改 Banner，網站更新
- [ ] DB 修改營運規則，API 正確套用
- [ ] 不需要因一般內容變動重新部署前端

## RWD

- [ ] 小手機
- [ ] 一般手機
- [ ] 大手機
- [ ] 平板
- [ ] 桌面
- [ ] 行事曆響應式
- [ ] 表單響應式
- [ ] 管理後台響應式

## PWA

- [ ] Manifest
- [ ] App Icons
- [ ] Service Worker
- [ ] Standalone Mode
- [ ] Offline Fallback
- [ ] Update Flow
- [ ] Cache Privacy

## 文件及交付

- [ ] README.md
- [ ] README_V1.md
- [ ] CHANGELOG.md
- [ ] API.md
- [ ] DATABASE.md
- [ ] SUPABASE_SETUP.md
- [ ] DATA_MAINTENANCE.md
- [ ] RWD_PWA.md
- [ ] TESTING.md
- [ ] DEPLOYMENT.md
- [ ] 完整 ZIP

---

# 28. 最終交付格式

完成後，請依下列順序回覆。

### A. 完整專案

提供：

`flowie-studio-v1.0.zip`

必須是真正已建立、可下載的檔案。

### B. 技術架構

說明：

- React
- Express
- Supabase
- Auth
- RLS
- RPC
- RWD
- PWA

### C. 功能完成情況

清楚區分：

- 已完成
- 部分完成
- 未完成

### D. 實際畫面

如環境支援，提供：

- 學生端首頁
- 學生課程預約
- 管理 Dashboard
- 課程行事曆
- 管理後台

只能使用實際執行畫面，不可用概念圖冒充。

### E. Supabase 維護說明

教我如何修改：

- 老師
- 教室
- 課程
- 時段
- Banner
- 首頁文字
- 預約規則
- 學生方案

並說明修改後如何更新前端。

### F. 啟動與測試

提供：

- 安裝指令
- 啟動指令
- Demo 帳號
- 測試指令
- 測試結果

### G. 已知限制

列出未完成或需正式部署環境才能確認的事項。

### H. 後續版本規劃

提出合理的 README_V2 開發方向，但不得擅自實作 V1 範圍外的大型功能。

---

# 29. 最終執行指令

請現在直接開始實際開發 Flowie Studio V1.0。

採用：

**React + TypeScript + Vite**

**Node.js + Express + TypeScript**

**Supabase PostgreSQL + Auth + RLS + Storage + RPC**

完整保留：

- Flowie 品牌名稱與 Logo
- 奶茶色、鼠尾草綠、柔霧粉品牌色票
- 年輕女性運動預約 APP 風格
- Database-Driven
- Config-Driven UI
- RWD
- PWA
- 分店與教室管理
- 老師與授課管理
- 課程管理
- 排課及行事曆
- 學生管理
- 課程方案與堂數
- 安全預約與取消
- 出勤管理
- 基本營運報表
- README_V1 版本管理

請從實際程式開發開始，不要停留在文字規劃。

優先完成真正可運作的完整流程：

**管理員新增分店與教室 → 新增老師與課程 → 建立課程場次 → 行事曆顯示 → 學生登入並預約 → 資料庫扣堂數 → 老師登記出勤 → 管理員查詢報表。**

以上流程必須能真實存取 Supabase 資料庫。

不得以假資料或靜態頁面冒充正式功能。

請實際撰寫檔案、執行可行的測試、修正問題、更新 README_V1，最後交付完整 ZIP。

本次專案的最高優先順序為：

**資料正確性、預約交易安全、功能完整性、Database-Driven 可維護性、Mobile-First 使用體驗、RWD、PWA 及未來版本擴充能力。**
---

# V1 交付紀錄（2026-11-14）

- **資料庫決策**：Flowie V1.0 最終正式資料庫為 Supabase；PocketBase 屬於已被取代的規劃草案，不是目前程式的正式依賴。
- **完成的程式**：React / Express / Supabase migration、RLS、預約與退堂 RPC、老師與排課、學生方案與帳本、出勤、網站內容、基本報表與 PWA 設定。詳細實作及操作參見 README 與 docs。
- **實際測試**：以 PGlite 執行 migration / seed 及業務測試，以本機 PostgreSQL 15 和 Auth／Storage 測試替身執行並行測試；執行 Node TypeScript、ESLint、建置和 API 邊界測試。確切結果請見 `docs/TESTING.md`，不可把測試替身視為真正的 Supabase 驗證。
- **尚未完成**：目前環境沒有 Docker 和正式 Supabase 憑證，沒有執行真正的 Supabase、Auth、Storage、示範帳號登入或端到端操作；指定的全部 RWD 尺寸與 PWA 真機驗收未完成。老師工時彙總、後台建立未註冊學生帳號、完整分頁 UI 尚未實作。
- **版本規範**：後續新增需求應建立 README_V2.md 等新檔，保留原需求與既有正常功能；schema 變更使用新 migration 並重新測試。


---

# 本次 Flowie 品牌設計與系統需求（完整原文）

# Flowie Studio V1.0｜完整系統開發與 UI/UX 設計規格

**專案名稱：** Flowie Studio  
**網站名稱：** Flowie｜芙洛  
**品牌標語：** Find Your Flow.  
**網站主標題：** 找到自己的節奏  
**技術架構：** React + TypeScript + Vite / Node.js + Express / Supabase PostgreSQL  
**設計基準：** 使用者提供的 Flowie 品牌設計圖片  
**版本：** V1.0

---

# 0. 核心任務

你是一位資深全端工程師、軟體架構師、UI/UX 設計師、資料庫架構師與 QA 工程師。

請開發完整可執行的 **Flowie Studio**，這是一套提供瑜珈與皮拉提斯教室使用的課程預約管理平台。

本次開發必須同時達到以下兩項目標：

**目標 A：忠實還原 Flowie 品牌視覺**

請以本次附上的 Flowie 品牌圖片作為正式設計依據。

不是只參考色彩，而是要實際還原圖片中的：

- Logo 視覺語言
- 奶茶米白底色
- 鼠尾草綠主要操作色
- 柔霧粉輔助色
- 可可棕文字
- 留白比例
- 卡片排列
- 圓角設計
- 排版層次
- 手機首頁結構
- 底部導覽列
- 課程列表風格

不得自行改成其他健身 APP、深色科技風格或通用 SaaS 模板。

**目標 B：完成真正可運作的預約管理系統**

不只製作漂亮的前端，而是必須完成：

- Supabase 資料庫
- Express API
- 身分認證
- 權限管理
- 分店管理
- 教室管理
- 老師管理
- 課程管理
- 排課及行事曆
- 學生預約
- 堂數管理
- 取消退堂
- 出勤紀錄
- 基本統計報表
- Database-Driven 渲染
- RWD
- PWA

請實際撰寫並整合程式，不要只交付 UI Demo 或靜態畫面。

---

# 1. 設計圖片的使用規範

## 1.1 圖片是本專案的正式設計依據

請先完整檢視我本次附上的 Flowie 品牌圖片。

圖片中的設計是我希望保留的視覺方向，**不允許只提取顏色後重新設計整套介面**。

請將圖片納入專案設計文件：

`docs/design/flowie-brand-reference.png`

若工作環境能存取附件，請複製原圖到此路徑。

若附件無法直接存取，請清楚說明，但仍需依照本需求書及可見圖片完成設計，不得宣稱已保存不存在的圖片。

## 1.2 圖片應用範圍

圖片分成兩個主要部分：

**左側：品牌視覺規範**

包含：

- Flowie Logo
- 品牌概念
- 品牌關鍵字
- 品牌色彩
- 字體風格
- 功能圖示

**右側：手機 APP 首頁設計**

包含：

- 頂部 Logo
- 通知圖示
- Hero 主視覺
- 中文主標題
- 副標題
- 預約課程按鈕
- 近期課程
- 課程卡片
- 底部導覽列

請將右側手機 UI 視為學生端首頁的重要設計範本。

## 1.3 還原原則

請優先保持：

1. 相似的視覺層次。
2. 相似的留白密度。
3. 相似的品牌色彩。
4. 相似的卡片比例。
5. 相似的按鈕樣式。
6. 相似的資訊排列方式。
7. 相似的字體大小階層。
8. 相似的柔和、輕盈與療癒氛圍。

可以因為 RWD、可讀性、無障礙及功能需求進行合理調整。

不要求每個像素完全一致，但整體觀感應高度接近原圖。

請勿直接將整張圖片放進首頁冒充完成的 UI。

必須用真正的 React 元件、HTML、CSS 與動態資料重新實作。

---

# 2. 品牌設計系統

## 2.1 品牌基本資訊

品牌名稱：Flowie

中文名稱：芙洛

英文標語：Find Your Flow.

網站主標題：找到自己的節奏

網站副標題：從呼吸開始，與更好的自己相遇。

品牌關鍵字：

- 輕盈流動
- 身心平衡
- 親切溫暖
- 年輕時尚
- 自然舒適
- 柔和療癒

適用對象：

喜愛瑜珈、皮拉提斯及身心健康生活的年輕女性。

網站應有質感，但不過度成熟或正式。

## 2.2 色彩規範

請以下列色票作為整個專案的主要顏色。

| Token | 色彩 | HEX |
|---|---|---|
| primary | 鼠尾草綠 | #849A86 |
| background | 奶茶米白 | #F7F3EE |
| accent | 柔霧粉 | #E9CFC9 |
| text-primary | 可可棕 | #514A45 |
| surface | 純白 | #FFFFFF |
| surface-muted | 淺灰綠 | #E6EBE4 |

需要補充 Hover、Active、Disabled、Success、Warning、Error 等顏色時，請由既有品牌色延伸。

不得隨意增加不協調的高飽和色彩。

請建立全域 Design Tokens，例如：

```css
:root {
  --color-primary: #849A86;
  --color-background: #F7F3EE;
  --color-accent: #E9CFC9;
  --color-text-primary: #514A45;
  --color-surface: #FFFFFF;
  --color-surface-muted: #E6EBE4;
}
```

請整合至 Tailwind CSS Theme。

若品牌主色與白色文字搭配時無法達到必要對比度，請使用較深的主色變體作為互動按鈕背景。

## 2.3 字體規範

字體應呈現：

- 圓潤
- 清新
- 優雅
- 高辨識度
- 適合繁體中文閱讀

品牌 Logo 可以使用具有柔和曲線的字體風格。

一般 UI 文字應優先選擇繁體中文閱讀清楚、數字容易辨認的字體。

建議：

- 英文字體：Nunito 或同級現代圓潤字體
- 中文字體：Noto Sans TC
- 強調性標題：可使用較優雅的中文標題字體，但不可犧牲可讀性

請將字體定義為設計系統，不要在不同頁面任意混用字體。

## 2.4 Logo 設計

請依照圖片中的 Logo 進行實作。

核心元素：

- 小寫 `flowie.`
- 流線造型的 F
- 柔和葉片
- 鼠尾草綠
- 柔霧粉
- 可可棕字標
- 自然、呼吸及流動感

請建立原創 SVG Logo，並盡量接近圖片中的比例、線條與視覺特徵。

至少提供：

- 橫式 Logo
- 精簡 Icon Logo
- Favicon
- PWA Icon
- Maskable Icon

不要直接使用圖片裁切當作唯一 Logo 實作。

如無法精確重現圖片中的特殊字形，請以原創 SVG 或合適字型製作近似版本，並說明與參考圖的差異。

## 2.5 圓角與卡片

整體設計需柔和。

建議：

| 元件 | 規範 |
|---|---|
| 主要卡片 | 16–24px 圓角 |
| 主要按鈕 | 12–24px 或 Pill |
| 輸入框 | 12–16px |
| Modal / Drawer | 20–24px |
| 圖片 | 12–20px |
| 功能捷徑 | 16–20px |

以上是設計建議，請依照圖片的比例實際調整。

卡片使用：

- 白色或淡奶茶色
- 極淡陰影
- 少量邊框
- 適當留白

避免大量深色邊框與過度突出的陰影。

## 2.6 圖示

統一使用 Lucide React 或相容圖示庫。

圖示風格：

- 細線
- 圓潤
- 簡潔
- 一致線條粗細

不要混用多套風格差異很大的圖示。

---

# 3. 學生端首頁：依照圖片實作

這是整個專案最重要的 UI 畫面。

請按照圖片中的手機首頁進行設計。

## 3.1 Header

頂部包含：

左側：

- Flowie Logo

右側：

- 通知圖示

Header 應簡潔、乾淨。

使用奶茶米白背景。

不得在手機 Header 放入大量文字導覽。

## 3.2 Hero Banner

參考圖片中的 Hero 設計。

主視覺應包含：

- 女性瑜珈或皮拉提斯運動照片
- 自然採光
- 柔和米白背景
- 鼠尾草綠運動服或協調色調
- 輕盈舒適的氛圍

圖片可以使用具合法授權的素材或原創產生素材。

不得使用有浮水印或權利不明的圖片。

Hero 文案：

**找到自己的節奏**

副標題：

**從呼吸開始，與更好的自己相遇。**

主要 CTA：

**預約課程**

按鈕使用鼠尾草綠或較深的相容色階，呈現柔和圓角。

## 3.3 Hero 排版

手機端：

- 圖片為主要視覺。
- 文字與照片位置應避免重疊造成閱讀困難。
- 主標題明顯。
- 副標題較小。
- CTA 放在容易點擊的位置。

桌面端：

可以調整為較寬的 Hero，讓文字與圖片左右分欄，或使用精緻的大圖背景排版。

但必須保留圖片中的視覺氣質。

## 3.4 近期課程

Hero 下方建立：

**近期課程**

右側：

**查看全部**

課程資料由 Supabase API 取得。

每張卡片包含：

- 課程縮圖
- 課程名稱
- 老師
- 日期時間
- 分店或教室
- 預約按鈕

參考圖片中的橫向卡片。

左側為圖片。

中間為課程資訊。

右側為小型圓角預約按鈕。

不要改成傳統後台資料表格樣式。

## 3.5 功能捷徑

依照圖片中的圖示設計，提供：

- 預約課程
- 我的堂數
- 上課紀錄
- 收藏課程
- 個人帳戶

功能捷徑可以使用方形圓角卡片。

使用奶茶米白、鼠尾草綠及可可棕。

不同區塊之間應保有適當留白。

## 3.6 底部導覽列

手機端使用固定或黏附式底部導覽列。

依照圖片配置：

1. 首頁
2. 課程
3. 收藏
4. 紀錄
5. 我的

使用細線圖示。

當前頁面應以鼠尾草綠及柔和背景顯示選取狀態。

需支援：

- Safe Area
- 觸控點擊
- 當前路由狀態
- 鍵盤出現時合理布局
- 避免遮擋頁面內容

學生可以透過「我的」進入我的預約及我的堂數頁面。

所有底部導覽選項必須具有實際路由或功能，不得只是裝飾。

---

# 4. 其他學生端頁面設計

請延伸相同設計語言。

## 4.1 課程探索頁

使用：

- 頂部搜尋
- 分店篩選
- 課程分類
- 日期選擇
- 老師篩選
- 課程卡片

視覺應延續首頁的奶茶米白背景及白色圓角卡片。

## 4.2 課程詳情頁

包含：

- 課程圖片
- 課程名稱
- 課程介紹
- 老師
- 課程時長
- 難度
- 分店與教室
- 日期與時間
- 剩餘名額
- 消耗堂數
- 預約按鈕

手機端主要 CTA 可固定在畫面底部安全區域上方。

## 4.3 我的預約頁

使用 Tabs：

- 即將到來
- 已完成
- 已取消

使用相同的圓角課程卡片。

## 4.4 我的堂數頁

參考 Apple Wallet 的資訊卡片概念。

但使用 Flowie 的奶茶米白及鼠尾草綠設計。

顯示：

- 課程方案
- 剩餘堂數
- 到期日期
- 使用紀錄
- 堂數異動

## 4.5 上課紀錄

顯示：

- 日期
- 課程名稱
- 老師
- 分店
- 出勤狀態

可以使用時間軸或清楚的卡片列表。

---

# 5. 管理後台設計

管理後台名稱：

**Flowie Studio**

請保留與學生端相同的品牌視覺。

但管理後台應以操作效率為優先。

## 5.1 桌面布局

建議：

左側 Sidebar：

- Dashboard
- 行事曆
- 排課管理
- 分店管理
- 教室管理
- 老師管理
- 課程管理
- 學生管理
- 預約管理
- 堂數管理
- 出勤紀錄
- 統計報表
- 網站設定

右側主內容：

- 頁面標題
- 操作按鈕
- 搜尋及篩選
- 表格或卡片
- 詳情視窗

Sidebar 可使用奶茶米白或非常淡的鼠尾草綠。

主內容區域使用白色及奶茶米白。

不要使用常見的深藍色企業後台模板。

## 5.2 Dashboard

使用：

- 四至六張統計卡片
- 簡單圖表
- 近期課程
- 今日行程
- 待處理事項

指標包括：

- 今日課程數
- 今日預約人數
- 本週課程數
- 本月預約數
- 今日出席人數
- 教室使用率

所有數據由 Supabase 提供。

## 5.3 CRUD 頁面

管理頁面應提供：

- 新增
- 查詢
- 修改
- 停用
- 搜尋
- 篩選
- Pagination
- 操作成功提示
- 表單驗證

資料表格需有一致的欄位、狀態及操作按鈕設計。

手機端應將過寬的表格轉換為適合閱讀的卡片，或提供合理的水平捲動方案。

## 5.4 行事曆

使用 FullCalendar。

支援：

- 月
- 週
- 日
- 列表

使用柔和的品牌色系區分場次。

管理員可點擊場次查看詳情、預約名單及進行授權操作。

---

# 6. 前端與後端技術

## 6.1 Frontend

採用：

- React
- TypeScript
- Vite
- React Router
- Tailwind CSS
- shadcn/ui
- TanStack Query
- React Hook Form
- Zod
- FullCalendar
- Lucide React
- vite-plugin-pwa

請使用相容且穩定的套件版本。

## 6.2 Backend

採用：

- Node.js LTS
- Express
- TypeScript
- Supabase JavaScript SDK
- Zod
- RESTful API

後端分層：

Route → Controller → Service → Repository

請統一：

- API 格式
- Error Response
- Logging
- Auth Middleware
- RBAC
- Input Validation

## 6.3 Supabase

正式使用：

- PostgreSQL
- Supabase Auth
- Supabase Storage
- RLS
- SQL Migration
- PostgreSQL Function / RPC

不可使用 PocketBase 或 Prisma 取代本版正式資料庫。

---

# 7. Database-Driven：強制要求

這是 Flowie 的核心設計原則。

後續維護時，盡量透過 Supabase Table Editor 或 Flowie Studio 管理後台即可修改網站內容。

## 7.1 必須由 DB 提供的資料

- 品牌資訊
- Logo 與圖片路徑
- 首頁文案
- Banner
- 首頁區塊顯示及順序
- 公告
- 分店
- 教室
- 老師
- 課程
- 課程分類
- 課程時段
- 人數上限
- 學生方案
- 堂數
- 預約紀錄
- 出勤紀錄
- 預約規則

以上正式營運內容不應大量硬編碼在 React Component。

## 7.2 資料流

Supabase PostgreSQL

↓

Express API

↓

TanStack Query

↓

React Components

↓

動態顯示畫面

## 7.3 Config-Driven UI

請建立：

- site_settings
- homepage_sections
- banners
- announcements
- booking_settings

讓管理員可修改網站標題、首頁圖片、區塊順序及公告等內容。

不得從資料庫直接執行任意 JavaScript。

## 7.4 驗收

至少測試：

- DB 修改課程名稱，網站更新。
- DB 新增老師，排課選項更新。
- DB 修改教室容量，預約規則更新。
- DB 修改 Banner，首頁更新。
- DB 修改公告，首頁更新。
- DB 修改取消期限，後端套用新規則。

一般資料內容更新不需要重新 Build 前端。

---

# 8. 資料庫規劃

請採用合理的關聯式設計及正規化。

主要資料表至少包含：

- profiles
- studios
- studio_memberships
- branches
- rooms
- teachers
- teacher_branches
- teacher_courses
- teacher_availability
- teacher_time_off
- course_categories
- courses
- schedule_rules
- class_sessions
- bookings
- attendance
- course_packages
- student_packages
- credit_ledger
- site_settings
- homepage_sections
- banners
- booking_settings
- announcements
- audit_logs

請提供：

- Primary Key
- Foreign Key
- Index
- Unique Constraint
- Check Constraint
- RLS Policy
- SQL Migration
- Seed Data

使用者認證需正確關聯 Supabase Auth。

預留多品牌、多分店資料隔離能力。

不得以大量自由文字欄位取代正式關聯。

---

# 9. 核心管理功能

## 9.1 分店管理

新增、修改、查詢、停用分店。

## 9.2 教室管理

新增、修改、查詢、停用教室。

可設定容量與可使用時段。

## 9.3 老師管理

新增、修改、查詢、停用老師。

支援：

- 授課資格
- 所屬分店
- 可授課時間
- 請假
- 代課
- 授課紀錄

## 9.4 課程管理

新增、修改、查詢、停用課程。

可設定：

- 分類
- 介紹
- 圖片
- 時長
- 難度
- 消耗堂數
- 人數上限

## 9.5 排課管理

管理員在同一畫面選擇：

- 分店
- 教室
- 課程
- 老師
- 日期
- 開始時間
- 結束時間
- 人數上限
- 預約期限
- 單次或重複排課

必須檢查教室、老師撞期與老師請假。

支援單次排課、每週重複、修改及取消場次。

## 9.6 學生管理

支援：

- 學生基本資料
- 課程方案
- 剩餘堂數
- 預約紀錄
- 出勤紀錄
- 堂數異動

## 9.7 出勤管理

老師及管理員依權限可記錄：

- 已出席
- 缺席
- 未確認

必須對應實際課程場次。

## 9.8 報表

至少包含：

- 每日預約數
- 每週預約數
- 每月預約數
- 老師授課次數
- 教室使用率
- 課程預約率
- 學生出席率
- 取消率

---

# 10. 預約與堂數交易

這是資料正確性最高優先級的功能。

## 10.1 學生預約

學生完成：

選課程 → 選時段 → 確認預約。

後端必須檢查：

- 是否登入
- 場次是否有效
- 是否開放預約
- 是否已開始
- 是否額滿
- 是否重複預約
- 方案是否有效
- 堂數是否足夠

## 10.2 交易原子性

預約成功時：

- 建立 Booking
- 扣除堂數
- 建立 Credit Ledger
- 更新必要計數或餘額

以上必須在資料庫交易中完成。

使用 PostgreSQL Function / RPC、適當資料庫鎖定及 Unique Constraint。

不能以多個無原子性保證的獨立 API 呼叫假裝交易。

## 10.3 同時預約

當一堂課只剩一個名額，多個學生同時預約時，只能有一人成功。

必須建立並行測試。

## 10.4 取消預約

取消時必須：

- 驗證身份
- 驗證取消期限
- 更新狀態
- 依規則退還堂數
- 建立 Refund Ledger
- 防止重複退堂

## 10.5 權限

使用 Supabase Auth、RLS 及 Express RBAC。

學生不得任意修改自己的堂數。

老師不得任意查看其他品牌的學生資料。

管理員只能管理有權限的品牌及分店。

Superuser 或 Service Role Key 不得暴露於瀏覽器。

---

# 11. RWD：必要功能

本專案必須採用 Mobile-First。

至少驗證：

- 320px 手機
- 375px 手機
- 430px 手機
- 768px 平板
- 1280px 桌面
- 1440px 桌面

## 11.1 學生端

手機優先。

- 底部導覽
- 單欄卡片
- 易於觸控
- 表單適合手機
- 圖片保持合理比例
- Safe Area 支援

## 11.2 管理端

桌面優先，但手機仍需可操作。

- Sidebar
- 表格
- 搜尋
- 篩選
- 行事曆

手機端將複雜布局合理簡化。

## 11.3 RWD 驗收

不可有：

- 不合理水平捲動
- 文字與按鈕重疊
- Modal 超出畫面
- 表單無法輸入
- 行事曆無法操作
- 底部導覽遮住主要內容

請以 Playwright 或同級瀏覽器工具進行實際驗證。

---

# 12. PWA：必要功能

使用 vite-plugin-pwa。

必須建立：

- Web App Manifest
- Service Worker
- PWA Icons
- Maskable Icon
- Standalone Mode
- Offline Fallback
- Update Detection

## 12.1 安裝

支援適用裝置與瀏覽器的 PWA 安裝方式。

至少提供：

- Android Chrome 使用指引
- iOS Safari 加入主畫面指引
- 桌面瀏覽器安裝指引

## 12.2 離線策略

使用 Online-First。

離線時：

- 可顯示基本 APP Shell。
- 顯示網路中斷提示。
- 不可假裝預約成功。
- 不可離線扣堂數。
- 不可將舊名額視為即時名額。

## 12.3 快取安全

需避免敏感資料遭不當快取。

登出後不得仍可透過 PWA 快取查看其他使用者私人資訊。

---

# 13. Supabase 建置與資料維護

請提供完整 Supabase 設定。

包括：

- Project 建立
- SQL Migration
- Tables
- Foreign Keys
- Indexes
- RLS Policies
- Auth
- Storage Buckets
- Database Functions
- Seed Data
- Express Connection
- Environment Variables

提供本地開發及雲端部署說明。

必須建立：

`docs/SUPABASE_SETUP.md`

以及：

`docs/DATA_MAINTENANCE.md`

第二份文件需教我如何只透過資料庫或管理後台：

- 修改課程名稱
- 新增老師
- 新增教室
- 調整時段
- 更換 Banner
- 修改網站文案
- 修改預約設定
- 調整學生方案

正式環境的 Schema 變動必須經過 SQL Migration，而不是無記錄的人工異動。

---

# 14. Demo 資料

至少建立：

- 1 個品牌
- 2 個分店
- 4 間教室
- 4 位老師
- 6 種課程
- 20 位學生
- 未來 30 天課程
- 歷史課程
- 預約資料
- 出勤資料
- 課程方案
- 堂數交易
- Banner
- 網站設定

需要提供本機可登入的示範帳號：

- Super Admin
- Studio Admin
- Teacher
- Student

需使用有效的 Supabase Auth 帳號。

不可只建立 profiles 假資料而無法登入。

不得把正式 Secret 放入專案。

---

# 15. 專案目錄

請建立：

```text
flowie-studio/
│
├── frontend/
│   ├── public/
│   │   ├── icons/
│   │   └── favicon.svg
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   ├── features/
│   │   ├── hooks/
│   │   ├── layouts/
│   │   ├── pages/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── styles/
│   │   │   └── tokens.css
│   │   ├── types/
│   │   └── utils/
│   └── package.json
│
├── backend/
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── repositories/
│   │   ├── validators/
│   │   └── app.ts
│   ├── tests/
│   └── package.json
│
├── supabase/
│   ├── config.toml
│   ├── migrations/
│   └── seed.sql
│
├── docs/
│   ├── design/
│   │   ├── flowie-brand-reference.png
│   │   ├── DESIGN_SYSTEM.md
│   │   └── UI_ACCEPTANCE.md
│   ├── ARCHITECTURE.md
│   ├── DATABASE.md
│   ├── API.md
│   ├── SUPABASE_SETUP.md
│   ├── DATA_MAINTENANCE.md
│   ├── RWD_PWA.md
│   ├── TESTING.md
│   └── DEPLOYMENT.md
│
├── README.md
├── README_V1.md
├── CHANGELOG.md
├── .env.example
├── .gitignore
└── package.json
```

可以根據最佳實務做必要調整，但要保留前後端分離與清楚的功能模組。

---

# 16. README 版本規範

## README.md

作為目前正式安裝與操作文件。

## README_V1.md

完整保存本次 V1.0 Prompt，以及實際完成內容與驗收結果。

**必須保留本次 Flowie UI 參考圖片的設計要求，不得只留下色票摘要。**

## README_V2.md

未來新增功能時才建立。

## README_V3.md

未來第三版新增功能時才建立。

所有版本應：

- 保留舊版 Prompt。
- 記錄新版需求差異。
- 不任意覆蓋舊版。
- 不任意刪除正常功能。
- SQL Schema 修改使用 Migration。
- 修改後執行相關測試。

使用 CHANGELOG.md 記錄實際程式變更。

---

# 17. UI/UX 驗收標準

這部分與業務功能同樣重要。

完成後，請把學生端首頁與我提供的品牌圖片進行視覺對照。

確認：

- [ ] Logo 風格接近參考圖
- [ ] 奶茶米白背景正確
- [ ] 鼠尾草綠操作色正確
- [ ] 柔霧粉點綴正確
- [ ] 可可棕文字正確
- [ ] Hero 排版接近參考圖
- [ ] Hero 圖片風格接近參考圖
- [ ] 主要標題層次正確
- [ ] 預約按鈕風格一致
- [ ] 近期課程卡片接近參考圖
- [ ] 功能圖示風格一致
- [ ] 手機底部導覽風格一致
- [ ] 卡片圓角及留白一致
- [ ] 手機顯示正常
- [ ] 桌面排版自然延伸
- [ ] 沒有自行變成其他視覺風格

若有實際瀏覽器工具，請截取完成畫面與參考圖對照，修正明顯的排版、配色、字級和間距差異。

不可將參考圖片當作實際完成畫面的截圖。

---

# 18. 系統功能驗收

至少驗證：

- [ ] 登入及角色權限
- [ ] 分店 CRUD
- [ ] 教室 CRUD
- [ ] 老師 CRUD
- [ ] 課程 CRUD
- [ ] 排課
- [ ] 教室及老師撞期
- [ ] 月、週、日行事曆
- [ ] 學生預約
- [ ] 人數上限
- [ ] 堂數扣除
- [ ] 取消退堂
- [ ] 並行預約不超賣
- [ ] 學生出勤
- [ ] 老師授課紀錄
- [ ] 統計報表
- [ ] Supabase 動態資料更新
- [ ] RLS 權限隔離
- [ ] RWD
- [ ] PWA
- [ ] Frontend Build
- [ ] Backend Build
- [ ] SQL Migration
- [ ] Demo Seed
- [ ] API 整合
- [ ] 自動化測試

未實際驗證的項目不得標記為通過。

---

# 19. 開發執行順序

請依照下列階段實作。

**Phase 1：品牌設計與 UI 系統**

- 檢視品牌參考圖
- 建立 Design Tokens
- 建立 Logo
- 建立共用 UI Components
- 建立學生端首頁

**Phase 2：系統架構**

- React
- Express
- Supabase
- Authentication
- API Client
- Router
- RBAC

**Phase 3：資料庫**

- Tables
- Relations
- RLS
- Migration
- Seed
- RPC

**Phase 4：核心業務功能**

- 分店
- 教室
- 老師
- 課程
- 排課
- 預約
- 堂數
- 出勤
- 報表

**Phase 5：前後端整合**

所有頁面需串接真實 API。

不可長期保留硬編碼示範資料冒充正式資料。

**Phase 6：RWD / PWA**

完成手機、平板、桌面適配與 PWA 設定。

**Phase 7：測試與修正**

執行：

- Build
- Type Check
- API Tests
- Database Tests
- Booking Concurrency Tests
- RLS Tests
- RWD Tests
- PWA Tests
- UI Visual Comparison

**Phase 8：文件及交付**

建立：

- README.md
- README_V1.md
- CHANGELOG.md
- Design System Docs
- Database Docs
- API Docs
- Supabase Setup Docs
- Data Maintenance Docs
- Testing Docs

---

# 20. 最終交付

請提供：

## A. 完整專案 ZIP

檔名：

`flowie-studio-v1.0.zip`

## B. 真正執行的網站截圖

至少包括：

- 學生端手機首頁
- 課程探索
- 預約畫面
- 我的堂數
- 管理 Dashboard
- 排課行事曆

若執行環境不支援瀏覽器截圖，需誠實說明。

## C. UI 設計驗收

說明與原始 Flowie 品牌圖的符合情況及差異。

## D. Supabase 設定

完整教學如何建立資料庫、執行 SQL Migration、配置 Auth、RLS 及 Storage。

## E. 啟動步驟

提供完整 npm 指令、環境變數及 Demo 帳號。

## F. 功能測試報告

清楚列出：

- 通過
- 失敗
- 尚未測試

## G. 版本文件

確認 README_V1 已完整保存本次 Prompt 與設計基準。

---

# 21. 最終開發指令

現在請直接開發完整的 Flowie Studio V1.0。

**最重要的 UI 要求：**

請以上傳的 Flowie 品牌圖片為正式設計基準，忠實延伸其中的 Logo、奶茶米白、鼠尾草綠、柔霧粉、可可棕、留白、Hero、卡片、圓角及手機導覽設計。

不要自行發散成其他視覺風格。

**最重要的系統要求：**

必須使用 React + Express + Supabase，完成真正可執行的課程與教室預約管理系統。

學生端以 Mobile-First 設計。

管理端以高效率操作為優先，但保持 Flowie 品牌一致性。

所有課程、老師、教室、排課、網站內容與營運設定，盡量透過 Supabase 和管理後台維護。

預約及堂數操作必須具備資料庫交易安全性。

RWD 與 PWA 是必要功能，不是選配。

請實際建立程式碼、執行測試、修正錯誤，最後提供完整專案 ZIP。

**本版最高優先順序：設計圖還原度、實際功能完整性、資料安全性、Database-Driven 可維護性、RWD、PWA 與未來版本擴充能力。**
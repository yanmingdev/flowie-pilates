# API 與命名

根路徑 `/api/v1`，健康檢查 `/api/v1/health`，Swagger UI `/api/docs`。欄位與查詢參數使用 `snake_case`，例如 `studio_id`、`student_id`、`session_id`、`idempotency_key`、`starts_at`；資料庫 RPC 參數以 `p_` 開頭並由 Express 映射。HTTP JSON 和資料表相同意義的欄位名稱保持一致；舊 V1.0 的 camelCase 請求不可直接使用。

前端 Supabase SDK 負責註冊、登入、密碼重設及 token refresh；其餘業務經 Express。需登入的請求使用 `Authorization: Bearer <user-access-token>`；後端以 Supabase Auth 查驗 token，再用該使用者的 JWT 存取資料庫，RLS 與函式仍需獨立授權。

| 功能 | API | 說明 |
|---|---|---|
| 身分 | `GET /auth/me`, `POST /auth/join`, `PATCH /auth/profile` | 目前使用者、加入品牌、個人資料；回傳 `is_super_admin`。 |
| 品牌 | `GET/POST /studios`, `PATCH /studios/:id`, `POST /studios/:id/admins` | 品牌及平台管理。 |
| 基礎資料 | `/branches`, `/rooms`, `/teachers`, `/course-categories`, `/courses` | 品牌下基礎資料。老師公開名錄用 `/teachers/public`。 |
| 收藏 | `GET/POST /favorites` | 讀取或設定目前學生的課程收藏。 |
| 教室時段 | `/room-availability` | 維護教室每週可使用時間。 |
| 老師資格 | `/teacher-branches`, `/teacher-courses`, `/teacher-availability`, `/teacher-time-off` | 分店與課程資格、可授課時段、請假。 |
| 排課 | `GET/POST /sessions`, `GET /sessions/manage`, `PATCH /sessions/:id` | 場次與排課。 |
| 週期及取消 | `PATCH /sessions/:id/future`, `POST /sessions/:id/cancel-future`, `POST /sessions/:id/cancel` | 修改或取消後續場次、取消單場。 |
| 學生 | `GET/POST /students`, `GET /students/:id/history`, `PATCH /students/:id/status`, `PATCH /students/:id/profile` | 分頁、加入已註冊帳號、紀錄、狀態與品牌內資料。 |
| 預約與出勤 | `GET/POST /bookings`, `POST /bookings/:id/cancel`, `GET /sessions/:id/students`, `POST /attendance` | 預約、取消退堂與授權出勤。 |
| 堂數 | `/packages`, `/package-courses`, `GET/POST /student-packages`, `POST /student-packages/:id/adjust`, `GET /credit-ledger` | 方案、授予、調整與帳本。 |
| 網站 | `/site-settings`, `/homepage-sections`, `/banners`, `/booking-settings`, `/announcements` | 顯示內容與預約規則。 |
| 報表 | `GET /reports`, `GET /reports/metrics`, `GET /teaching-records` | 管理報表、授課紀錄；後者僅管理員或任課老師可讀。 |

一般資料與學生列表支援 `studio_id`、`page`、`limit`（每頁最多 100）；可搜尋欄位依資源而定。回傳 `{ "data": [...], "meta": { "page": 1, "limit": 20, "total": 42 } }`。部分關聯資料的管理搜尋僅針對當前頁。授課紀錄最多 1000 筆，達上限請縮小日期；預約清單及帳本最多 200 筆，學生方案資料亦受服務端最大列數限制。管理列表的選項會分頁載入，最多 10000 筆並在超限時顯示錯誤。不得直接以一般用戶修改預約、出勤、餘額和帳本。

## 預約範例

```http
POST /api/v1/bookings
Authorization: Bearer <user-access-token>
Content-Type: application/json

{"session_id":"<session-uuid>","idempotency_key":"<unique-request-id>"}
```

成功回傳 `{"data": { ... }}`。錯誤格式為 `{"error":{"code":"SESSION_FULL","message":"此場次已額滿。","request_id":"..."}}`。相同使用者、場次與請求鍵的重試回傳原預約；新的一次操作需用新鍵。常見錯誤包括 `UNAUTHENTICATED`、`FORBIDDEN`、`VALIDATION_ERROR`、`ALREADY_BOOKED`、`SESSION_FULL`、`NO_VALID_PACKAGE_OR_CREDITS` 和 `CANCELLATION_DEADLINE_PASSED`。完整欄位以後端路由及 `backend/src/validators/resources.ts` 的 Zod schema 為準。

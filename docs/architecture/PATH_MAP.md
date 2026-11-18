# 舊路徑與新路徑對照

舊路徑中的重複程式已移入 archive/previous-layout-reference.zip，不再存在現行 src。同一舊檔若拆出多個元件，逐一列出。原 URL／資料庫命名沒有因此改變。完整檔案索引另見 DIRECTORY_INDEX.md。

| 原位置／符號 | 新位置 |
|---|---|
| frontend/src/main.tsx | frontend/src/app/bootstrap.tsx |
| frontend/src/routes.tsx | frontend/src/app/router/AppRoutes.tsx |
| frontend/src/services/api.ts | frontend/src/shared/api/http-client.ts |
| frontend/src/services/supabase.ts | frontend/src/shared/auth/supabase-client.ts |
| frontend/src/services/favorites.ts | frontend/src/features/favorites/hooks/useFavorites.ts |
| frontend/src/components/FavoriteButton.tsx | frontend/src/features/favorites/components/FavoriteButton.tsx |
| frontend/src/components/ui/button.tsx | frontend/src/shared/ui/primitives/Button.tsx |
| frontend/src/components/ui/dialog.tsx | frontend/src/shared/ui/primitives/Dialog.tsx |
| frontend/src/lib/utils.ts | frontend/src/shared/utils/class-names.ts |
| frontend/src/pages/manage-config.ts | frontend/src/features/admin-management/config/resource-fields.ts |
| frontend/src/pages/Home.tsx | frontend/src/features/home/pages/Home.tsx |
| frontend/src/pages/Classes.tsx | frontend/src/features/classes/pages/Classes.tsx |
| frontend/src/pages/Favorites.tsx | frontend/src/features/favorites/pages/Favorites.tsx |
| frontend/src/pages/History.tsx | frontend/src/features/history/pages/History.tsx |
| frontend/src/pages/Announcements.tsx | frontend/src/features/announcements/pages/Announcements.tsx |
| frontend/src/pages/Teachers.tsx | frontend/src/features/teachers/pages/Teachers.tsx |
| frontend/src/pages/MyCalendar.tsx | frontend/src/features/member-calendar/pages/MyCalendar.tsx |
| frontend/src/pages/TeachingRecords.tsx | frontend/src/features/teaching/pages/TeachingRecords.tsx |
| frontend/src/pages/AdminHome.tsx | frontend/src/features/admin-dashboard/pages/AdminHome.tsx |
| frontend/tests/home.test.tsx | tests/frontend/home.test.tsx |
| frontend/tests/routes.test.tsx | tests/frontend/routes.test.tsx |
| frontend/src/pages/Account.tsx :: SignInPrompt | frontend/src/features/auth/components/SignInPrompt.tsx |
| frontend/src/pages/Account.tsx :: Bookings | frontend/src/features/bookings/pages/Bookings.tsx |
| frontend/src/pages/Account.tsx :: Credits | frontend/src/features/credits/pages/Credits.tsx |
| frontend/src/pages/Account.tsx :: Account | frontend/src/features/account/pages/Account.tsx |
| frontend/src/pages/Auth.tsx :: AuthPage | frontend/src/features/auth/pages/AuthPage.tsx |
| frontend/src/pages/Auth.tsx :: ResetPassword | frontend/src/features/auth/pages/ResetPassword.tsx |
| frontend/src/pages/Manage.tsx :: ManageForm | frontend/src/features/admin-management/components/ManageForm.tsx |
| frontend/src/pages/Manage.tsx :: CreditAdjust | frontend/src/features/admin-management/components/CreditAdjust.tsx |
| frontend/src/pages/Manage.tsx :: StudentHistory | frontend/src/features/admin-management/components/StudentHistory.tsx |
| frontend/src/pages/Manage.tsx :: Students | frontend/src/features/admin-management/components/Students.tsx |
| frontend/src/pages/Manage.tsx :: Manage | frontend/src/features/admin-management/pages/Manage.tsx |
| frontend/src/pages/Calendar.tsx :: StudentFeedback | frontend/src/features/scheduling/components/StudentFeedback.tsx |
| frontend/src/pages/Calendar.tsx :: SessionForm | frontend/src/features/scheduling/components/SessionForm.tsx |
| frontend/src/pages/Calendar.tsx :: SessionDetails | frontend/src/features/scheduling/components/SessionDetails.tsx |
| frontend/src/pages/Calendar.tsx :: Calendar | frontend/src/features/scheduling/pages/Calendar.tsx |
| frontend/src/components/Ui.tsx :: Empty | frontend/src/shared/ui/Empty.tsx |
| frontend/src/components/Ui.tsx :: ErrorNote | frontend/src/shared/ui/ErrorNote.tsx |
| frontend/src/components/Ui.tsx :: Modal | frontend/src/shared/ui/Modal.tsx |
| frontend/src/components/Ui.tsx :: Heading | frontend/src/shared/ui/Heading.tsx |
| frontend/src/components/Ui.tsx :: Loading | frontend/src/shared/ui/Loading.tsx |
| frontend/src/components/Ui.tsx :: ClassCard | frontend/src/features/classes/components/ClassCard.tsx |
| frontend/src/components/Layout.tsx :: Layout | frontend/src/app/layouts/MemberLayout.tsx |
| frontend/src/components/Layout.tsx :: AdminLayout | frontend/src/app/layouts/AdminLayout.tsx |
| frontend/src/services/types.ts :: Studio | frontend/src/shared/types/models.ts |
| frontend/src/services/types.ts :: Session | frontend/src/shared/types/models.ts |
| frontend/src/services/types.ts :: Me | frontend/src/shared/types/models.ts |
| frontend/src/services/types.ts :: dateTime | frontend/src/shared/utils/date-time.ts |
| frontend/src/services/types.ts :: shortTime | frontend/src/shared/utils/date-time.ts |
| frontend/src/services/types.ts :: range | frontend/src/shared/utils/date-time.ts |
| frontend/src/services/context.tsx :: AppProvider | frontend/src/shared/state/AppContext.tsx |
| frontend/src/services/context.tsx :: useApp | frontend/src/shared/state/AppContext.tsx |
| frontend/src/services/context.tsx :: useStudioQuery | frontend/src/shared/hooks/useStudioQuery.ts |
| backend/src/routes/index.ts | backend/src/app/router.ts + modules/*/*.routes.ts／controller.ts／service.ts |
| backend/src/controllers/resources.ts | backend/src/modules/catalog/ |
| backend/src/validators/resources.ts | backend/src/modules/catalog/catalog.schemas.ts |
| backend/src/repositories/database.ts | backend/src/infrastructure/database/rpc.ts |
| backend/src/middleware/* | backend/src/shared/middleware/ |
| backend/src/config/supabase.ts | backend/src/infrastructure/supabase/client.ts |
| backend/src/app.ts | backend/src/app/create-app.ts |
| backend/src/openapi.ts | backend/src/docs/openapi.ts |
| frontend/src/styles/main.css | frontend/src/styles/index.css + 分類樣式 |
| .env | config/env/.env.local |
| Flowie_V1_Supabase_SQL_和設定說明/*.sql | supabase/sql/*.sql |
| Flowie_V1_Supabase_SQL_和設定說明/*.md／xlsx | docs/database/ |
| scripts/test-v1-*.mjs | tests/database/ 或 tests/integration/ |
| legacy/v1_2/ | archive/legacy-v1_2-reference.zip |
| docs/screenshots/ | docs/history/screenshots/ |

## 本次 Express／SQL 更新

| 上版位置／方式 | 本版 |
|---|---|
| index.ts 直接 listen | index.ts → server.ts → createApp() |
| create-app.ts 匯出單例 app | createApp() 工廠建立獨立 Express application |
| controller 將整包 req 傳 service | toServiceContext() 只傳 DB 與最小使用者資訊 |
| supabase/bootstrap 與 v1_incremental | supabase/sql/ 統一保存 01～07 |
| 無正式 ER PNG | SQL 同層 Flowie_ER_Model.png／DOT／schema catalog |

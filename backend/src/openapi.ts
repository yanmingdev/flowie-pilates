import { resources } from './validators/resources.js';
const bearer = [{ bearerAuth: [] }];
const paths: Record<string, any> = {
  '/health': { get: { summary: '服務狀態', responses: { 200: { description: 'OK' } } } },
  '/studios': { get: { summary: '單一品牌設定（API 相容檢視）', responses: { 200: { description: '品牌資料或空陣列' } } } },
  '/auth/me': { get: { summary: '目前帳號與權限', security: bearer, responses: { 200: { description: '帳號資料' } } } },
  '/auth/profile': { patch: { summary: '更新自己的顯示名稱', security: bearer, responses: { 200: { description: '已更新' } } } },
  '/teachers/public': { get: { summary: '公開老師名稱與照片', responses: { 200: { description: '老師列表' } } } },
  '/sessions': { get: { summary: '公開場次與已預約人數', responses: { 200: { description: '場次列表' } } }, post: { summary: '管理員排課', security: bearer, responses: { 201: { description: '已排課' } } } },
  '/bookings': { get: { summary: '查詢授權預約', security: bearer, responses: { 200: { description: '預約清單' } } }, post: { summary: '原子預約及扣堂', security: bearer, responses: { 201: { description: '已預約' } } } },
  '/bookings/{id}/cancel': { post: { summary: '取消與退堂', security: bearer, responses: { 200: { description: '已取消' } } } },
  '/favorites': { get: { summary: '我的收藏', security: bearer, responses: { 200: { description: '收藏清單' } } }, post: { summary: '設定我的收藏', security: bearer, responses: { 200: { description: '已更新' } } } },
};
for (const name of Object.keys(resources)) {
  paths['/' + name] = {
    get: { summary: '查詢 ' + name, responses: { 200: { description: '分頁資料' } } },
    post: { summary: '管理員新增 ' + name, security: bearer, responses: { 201: { description: '已新增' } } },
  };
  paths['/' + name + '/{id}'] = { patch: { summary: '管理員更新 ' + name, security: bearer, responses: { 200: { description: '已更新' } } } };
}
export const openapi = {
  openapi: '3.0.3', info: { title: 'Flowie V1 API', version: '1.0.0' },
  servers: [{ url: '/api/v1' }], paths,
  components: { securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } } },
};

import type { Request } from 'express';
import type { ServiceContext } from '../types/service-context.js';
/** 將 HTTP 請求縮小為服務所需的資料庫與使用者資料，避免把 req/res 傳進商業服務。 */
export function toServiceContext(req: Request): ServiceContext {
  return { db: req.db, user: req.user ? { id: req.user.id, email: req.user.email } : undefined };
}

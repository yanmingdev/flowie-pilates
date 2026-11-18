import type { RequestHandler } from 'express';
import { randomUUID } from 'node:crypto';
/** 為每次 HTTP 請求建立追蹤 ID；不採用前端送來的身分或管理員旗標。 */
export const attachRequestId: RequestHandler = (req, _res, next) => {
  req.request_id = randomUUID();
  next();
};

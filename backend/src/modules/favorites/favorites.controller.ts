import { toServiceContext } from '../../shared/http/service-context.js';
import { type Request, type Response } from 'express';
import * as service from './favorites.service.js';
import { favoriteSchema } from './favorites.schemas.js';

/** 讀取清單（課程收藏）。負責輸入驗證與 HTTP 回應包裝，交易交由服務／RPC。 */ export async function list(
  req: Request,
  res: Response,
) {
  res.json({ data: await service.list(toServiceContext(req)) });
}

/** 更新收藏狀態（課程收藏）。負責輸入驗證與 HTTP 回應包裝，交易交由服務／RPC。 */ export async function save(
  req: Request,
  res: Response,
) {
  const v = favoriteSchema.parse(req.body);
  res.json({ data: await service.save(toServiceContext(req), v.course_id, v.is_favorite) });
}

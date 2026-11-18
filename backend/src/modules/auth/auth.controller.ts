import { toServiceContext } from '../../shared/http/service-context.js';
import { type Request, type Response } from 'express';
import * as service from './auth.service.js';
import { profileSchema } from './auth.schemas.js';

/** 讀取登入者 profile 與老師身分（帳號資料）。負責輸入驗證與 HTTP 回應包裝，交易交由服務／RPC。 */ export async function me(
  req: Request,
  res: Response,
) {
  res.json({ data: await service.me(toServiceContext(req)) });
}

/** 更新本人顯示名稱（帳號資料）。負責輸入驗證與 HTTP 回應包裝，交易交由服務／RPC。 */ export async function updateProfile(
  req: Request,
  res: Response,
) {
  const fields = profileSchema.parse(req.body);
  res.json({ data: await service.updateProfile(toServiceContext(req), fields.display_name) });
}

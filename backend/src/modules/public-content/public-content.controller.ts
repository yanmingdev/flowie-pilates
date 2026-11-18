import { toServiceContext } from '../../shared/http/service-context.js';
import { type Request, type Response } from 'express';
import * as service from './public-content.service.js';

/** 讀取單品牌相容檢視（公開品牌與內容）。負責輸入驗證與 HTTP 回應包裝，交易交由服務／RPC。 */ export async function studios(
  req: Request,
  res: Response,
) {
  res.json({ data: await service.studios(toServiceContext(req)) });
}

/** 讀取公開師資（公開品牌與內容）。負責輸入驗證與 HTTP 回應包裝，交易交由服務／RPC。 */ export async function teachers(
  req: Request,
  res: Response,
) {
  res.json({ data: await service.teachers(toServiceContext(req)) });
}

/** 讀取啟用的身體知識內容（公開品牌與內容）。負責輸入驗證與 HTTP 回應包裝，交易交由服務／RPC。 */ export async function knowledge(
  req: Request,
  res: Response,
) {
  res.json({ data: await service.knowledge(toServiceContext(req)) });
}

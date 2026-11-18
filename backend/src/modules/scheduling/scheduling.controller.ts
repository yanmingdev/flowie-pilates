import { toServiceContext } from '../../shared/http/service-context.js';
import { type Request, type Response } from 'express';
import * as service from './scheduling.service.js';
import { dateRange, uuid } from '../../shared/validation/common.schemas.js';
import { scheduleSchema } from './scheduling.schemas.js';

/** 讀取公開場次目錄（授課場次）。負責輸入驗證與 HTTP 回應包裝，交易交由服務／RPC。 */ export async function catalog(
  req: Request,
  res: Response,
) {
  const q = dateRange.parse(req.query);
  res.json({ data: await service.catalog(toServiceContext(req), q.from, q.to) });
}

/** 組合授權的管理場次與老師姓名（授課場次）。負責輸入驗證與 HTTP 回應包裝，交易交由服務／RPC。 */ export async function manage(
  req: Request,
  res: Response,
) {
  const q = dateRange.parse(req.query);
  res.json({ data: await service.manage(toServiceContext(req), q.from, q.to) });
}

/** 建立資料（授課場次）。負責輸入驗證與 HTTP 回應包裝，交易交由服務／RPC。 */ export async function create(
  req: Request,
  res: Response,
) {
  res
    .status(201)
    .json({
      data: await service.schedule(toServiceContext(req), scheduleSchema.parse(req.body), null),
    });
}

/** 更新白名單內容欄位（授課場次）。負責輸入驗證與 HTTP 回應包裝，交易交由服務／RPC。 */ export async function update(
  req: Request,
  res: Response,
) {
  res.json({
    data: await service.schedule(
      toServiceContext(req),
      scheduleSchema.parse(req.body),
      uuid.parse(req.params.id),
    ),
  });
}

/** 取消並由既有交易處理退堂（授課場次）。負責輸入驗證與 HTTP 回應包裝，交易交由服務／RPC。 */ export async function cancel(
  req: Request,
  res: Response,
) {
  res.json({ data: await service.cancel(toServiceContext(req), uuid.parse(req.params.id)) });
}

/** 讀取授權場次名單（授課場次）。負責輸入驗證與 HTTP 回應包裝，交易交由服務／RPC。 */ export async function students(
  req: Request,
  res: Response,
) {
  res.json({ data: await service.students(toServiceContext(req), uuid.parse(req.params.id)) });
}

/** 讀取授課紀錄（授課場次）。負責輸入驗證與 HTTP 回應包裝，交易交由服務／RPC。 */ export async function teaching(
  req: Request,
  res: Response,
) {
  const q = dateRange.parse(req.query);
  res.json({ data: await service.teaching(toServiceContext(req), q.from, q.to) });
}

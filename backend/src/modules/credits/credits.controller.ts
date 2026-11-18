import { toServiceContext } from '../../shared/http/service-context.js';
import { type Request, type Response } from 'express';
import * as service from './credits.service.js';
import { uuid } from '../../shared/validation/common.schemas.js';
import { issueSchema, adjustmentSchema } from './credits.schemas.js';

/** 讀取學生方案（方案及堂數）。負責輸入驗證與 HTTP 回應包裝，交易交由服務／RPC。 */ export async function packages(
  req: Request,
  res: Response,
) {
  res.json({
    data: await service.packages(
      toServiceContext(req),
      req.query.scope === 'mine' ? req.user!.id : undefined,
    ),
  });
}

/** 讀取堂數帳本（方案及堂數）。負責輸入驗證與 HTTP 回應包裝，交易交由服務／RPC。 */ export async function ledger(
  req: Request,
  res: Response,
) {
  res.json({
    data: await service.ledger(
      toServiceContext(req),
      req.query.scope === 'mine' ? req.user!.id : undefined,
    ),
  });
}

/** 發放學生方案（方案及堂數）。負責輸入驗證與 HTTP 回應包裝，交易交由服務／RPC。 */ export async function issue(
  req: Request,
  res: Response,
) {
  res
    .status(201)
    .json({ data: await service.issue(toServiceContext(req), issueSchema.parse(req.body)) });
}

/** 調整方案堂數並保留原因（方案及堂數）。負責輸入驗證與 HTTP 回應包裝，交易交由服務／RPC。 */ export async function adjust(
  req: Request,
  res: Response,
) {
  res.json({
    data: await service.adjust(
      toServiceContext(req),
      uuid.parse(req.params.id),
      adjustmentSchema.parse(req.body),
    ),
  });
}

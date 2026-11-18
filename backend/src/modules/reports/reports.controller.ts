import { toServiceContext } from '../../shared/http/service-context.js';
import { type Request, type Response } from 'express';
import * as service from './reports.service.js';
import { reportQuery } from './reports.schemas.js';

/** 讀取真實營運統計（營運報表）。負責輸入驗證與 HTTP 回應包裝，交易交由服務／RPC。 */ export async function report(
  req: Request,
  res: Response,
) {
  res.json({ data: await service.report(toServiceContext(req), reportQuery.parse(req.query)) });
}

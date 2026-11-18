import { toServiceContext } from '../../shared/http/service-context.js';
import { type Request, type Response } from 'express';
import * as service from './students.service.js';
import { uuid } from '../../shared/validation/common.schemas.js';
import { studentQuery, studentStatus } from './students.schemas.js';

/** 讀取清單（學生資料）。負責輸入驗證與 HTTP 回應包裝，交易交由服務／RPC。 */ export async function list(
  req: Request,
  res: Response,
) {
  res.json(await service.list(toServiceContext(req), studentQuery.parse(req.query)));
}

/** 組合學生的預約、帳本及方案紀錄（學生資料）。負責輸入驗證與 HTTP 回應包裝，交易交由服務／RPC。 */ export async function history(
  req: Request,
  res: Response,
) {
  res.json({ data: await service.history(toServiceContext(req), uuid.parse(req.params.id)) });
}

/** 變更學生啟用狀態（學生資料）。負責輸入驗證與 HTTP 回應包裝，交易交由服務／RPC。 */ export async function status(
  req: Request,
  res: Response,
) {
  const v = studentStatus.parse(req.body);
  res.json({
    data: await service.status(toServiceContext(req), uuid.parse(req.params.id), v.is_active),
  });
}

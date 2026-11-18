import { toServiceContext } from '../../shared/http/service-context.js';
import { type Request, type Response } from 'express';
import * as service from './bookings.service.js';
import { uuid } from '../../shared/validation/common.schemas.js';
import { bookingSchema, attendanceSchema, feedbackSchema } from './bookings.schemas.js';

/** 讀取清單（預約與出勤）。負責輸入驗證與 HTTP 回應包裝，交易交由服務／RPC。 */ export async function list(
  req: Request,
  res: Response,
) {
  res.json({ data: await service.list(toServiceContext(req), req.query.scope === 'mine') });
}

/** 建立資料（預約與出勤）。負責輸入驗證與 HTTP 回應包裝，交易交由服務／RPC。 */ export async function create(
  req: Request,
  res: Response,
) {
  const v = bookingSchema.parse(req.body);
  res
    .status(201)
    .json({ data: await service.create(toServiceContext(req), v.session_id, v.idempotency_key) });
}

/** 取消並由既有交易處理退堂（預約與出勤）。負責輸入驗證與 HTTP 回應包裝，交易交由服務／RPC。 */ export async function cancel(
  req: Request,
  res: Response,
) {
  res.json({ data: await service.cancel(toServiceContext(req), uuid.parse(req.params.id)) });
}

/** 更新授權預約的點名狀態（預約與出勤）。負責輸入驗證與 HTTP 回應包裝，交易交由服務／RPC。 */ export async function attendance(
  req: Request,
  res: Response,
) {
  const v = attendanceSchema.parse(req.body);
  res.json({ data: await service.attendance(toServiceContext(req), v.booking_id, v.status) });
}

/** 更新授課老師的課後建議（預約與出勤）。負責輸入驗證與 HTTP 回應包裝，交易交由服務／RPC。 */ export async function feedback(
  req: Request,
  res: Response,
) {
  const v = feedbackSchema.parse(req.body);
  res.json({
    data: await service.feedback(toServiceContext(req), uuid.parse(req.params.id), v.feedback),
  });
}

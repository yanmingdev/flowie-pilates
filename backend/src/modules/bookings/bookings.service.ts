import { type ServiceContext } from '../../shared/types/service-context.js';
import { rpc, rpcSingle } from '../../infrastructure/database/rpc.js';

/** 讀取清單（預約與出勤）。沿用既有 V1 資料契約，不另行建立交易規則。 呼叫 flowie_v1_bookings。 */ export async function list(
  ctx: ServiceContext,
  mine: boolean,
) {
  return rpc(ctx.db, 'flowie_v1_bookings', { p_student: mine ? ctx.user!.id : null });
}

/** 建立資料（預約與出勤）。沿用既有 V1 資料契約，不另行建立交易規則。 呼叫 flowie_v1_book。 */ export async function create(
  ctx: ServiceContext,
  session_id: string,
  key: string,
) {
  return rpcSingle(ctx.db, 'flowie_v1_book', { p_session: session_id, p_key: key });
}

/** 取消並由既有交易處理退堂（預約與出勤）。沿用既有 V1 資料契約，不另行建立交易規則。 呼叫 flowie_v1_cancel_booking。 */ export async function cancel(
  ctx: ServiceContext,
  id: string,
) {
  return rpcSingle(ctx.db, 'flowie_v1_cancel_booking', { p_booking: id });
}

/** 更新授權預約的點名狀態（預約與出勤）。沿用既有 V1 資料契約，不另行建立交易規則。 呼叫 flowie_v1_mark_attendance。 */ export async function attendance(
  ctx: ServiceContext,
  id: string,
  status: string,
) {
  return rpcSingle(ctx.db, 'flowie_v1_mark_attendance', { p_booking: id, p_status: status });
}

/** 更新授課老師的課後建議（預約與出勤）。沿用既有 V1 資料契約，不另行建立交易規則。 呼叫 flowie_v1_set_teacher_feedback。 */ export async function feedback(
  ctx: ServiceContext,
  id: string,
  feedback: string,
) {
  return rpcSingle(ctx.db, 'flowie_v1_set_teacher_feedback', {
    p_booking: id,
    p_feedback: feedback,
  });
}

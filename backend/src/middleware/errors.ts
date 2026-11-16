import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
const messages: Record<string, string> = {
  UNAUTHENTICATED: '請先登入。',
  FORBIDDEN: '您沒有執行此操作的權限。',
  FORBIDDEN_OR_NOT_FOUND: '找不到資料或您沒有權限。',
  SESSION_FULL: '此場次已額滿。',
  ALREADY_BOOKED: '您已預約此場次。',
  SESSION_UNAVAILABLE: '此場次無法預約。',
  BOOKING_NOT_OPEN: '此場次尚未開放預約。',
  BOOKING_CLOSED: '此場次已超過預約截止時間。',
  NO_VALID_PACKAGE_OR_CREDITS: '沒有適用且堂數足夠的有效方案。',
  CANCELLATION_DEADLINE_PASSED: '已超過取消期限。',
  BOOKING_NOT_ACTIVE: '此預約已取消或無法取消。',
  TEACHER_NOT_QUALIFIED: '老師未指派至分店或不具備授課資格。',
  OUTSIDE_TEACHER_AVAILABILITY: '場次不在老師可授課時間內。',
  TEACHER_TIME_OFF: '老師在該時段請假。',
  OUTSIDE_ROOM_AVAILABILITY: '課程不在教室可使用的時段內。',
  INVALID_ROOM_OR_CAPACITY: '教室、分店或人數上限不符合設定。',
  CAPACITY_BELOW_BOOKINGS: '人數上限不能小於已預約人數。',
  ROOM_CAPACITY_BELOW_BOOKINGS: '教室容量不能小於既有場次的預約人數。',
  TIME_OFF_CONFLICTS_WITH_SESSION: '請假時間與既有場次衝突。',
  BOOKED_SESSION_CHANGE_REQUIRES_CANCELLATION:
    '已有預約的場次不能直接更改課程或時間，請先取消場次並退堂。',
  SESSION_STARTED: '課程已開始，無法取消。',
  INVALID_INTERVAL: '請檢查日期和時間。',
  DUPLICATE_REQUEST: '請求已處理或識別碼重複。',
  INSUFFICIENT_CREDITS: '剩餘堂數不足。',
  FEATURE_UNAVAILABLE_V1: '目前 V1 尚未支援此操作，請洽管理員。',
  PROFILE_INCOMPLETE: '請先至「我的資料」填寫姓名，並確認帳號已啟用。',
  PROFILE_NOT_FOUND: '找不到帳號資料，請聯絡管理員檢查 Supabase 設定。',
  INVALID_IDEMPOTENCY_KEY: '操作識別碼不正確，請重新操作。',
  SETTINGS_NOT_FOUND: '尚未設定品牌資料及取消規則。',
  PACKAGE_UNAVAILABLE: '課程方案不存在或已停用。',
  MISSING_BOOKING_DEBIT: '此預約缺少原始扣堂紀錄，請聯絡管理員確認。',
  INVALID_ATTENDANCE: '出勤狀態不正確。',
  INVALID_ADJUSTMENT: '請填寫有效的調整堂數及原因。',
  MIGRATION_REQUIRED: '資料庫缺少 V1 增量函式；請依設定說明先審查並執行 05 SQL。',
};
export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: '請檢查輸入資料。',
        details: err.flatten(),
        request_id: req.request_id,
      },
    });
    return;
  }
  const raw = String(err?.message ?? 'INTERNAL_ERROR');
  const code =
    Object.keys(messages).find((k) => raw.includes(k)) ??
    (err?.code === 'PGRST202'
      ? 'MIGRATION_REQUIRED'
      : err?.code === '23P01'
      ? 'SCHEDULE_CONFLICT'
      : err?.code === '23505'
        ? 'DUPLICATE'
        : err?.code === '42501'
          ? 'FORBIDDEN'
          : 'INTERNAL_ERROR');
  const status =
    err?.status ||
    (code === 'INTERNAL_ERROR'
      ? 500
      : code === 'UNAUTHENTICATED'
        ? 401
        : code === 'FORBIDDEN'
          ? 403
          : 400);
  if (status >= 500) req.log?.error({ err, request_id: req.request_id }, 'request failed');
  res.status(status).json({
    error: {
      code,
      message:
        messages[code] ??
        (code === 'SCHEDULE_CONFLICT'
          ? '教室或老師在此時段已有課程。'
          : code === 'DUPLICATE'
            ? '資料已存在。'
            : '處理時發生錯誤。'),
      request_id: req.request_id,
    },
  });
};

import { type ServiceContext } from '../../shared/types/service-context.js';
import { rpc } from '../../infrastructure/database/rpc.js';
import * as repository from './students.repository.js';
import { packages, ledger } from '../credits/credits.service.js';
import { type StudentQuery } from './students.schemas.js';

/** 讀取清單（學生資料）。沿用既有 V1 資料契約，不另行建立交易規則。 */ export async function list(
  ctx: ServiceContext,
  q: StudentQuery,
) {
  return repository.list(ctx.db, q);
}

/** 組合學生的預約、帳本及方案紀錄（學生資料）。沿用既有 V1 資料契約，不另行建立交易規則。 呼叫 flowie_v1_bookings。 */ export async function history(
  ctx: ServiceContext,
  student: string,
) {
  const [bookings, entries, passes] = await Promise.all([
    rpc(ctx.db, 'flowie_v1_bookings', { p_student: student }),
    ledger(ctx, student),
    packages(ctx, student),
  ]);
  return { bookings, ledger: entries, packages: passes };
}

/** 變更學生啟用狀態（學生資料）。沿用既有 V1 資料契約，不另行建立交易規則。 呼叫 flowie_v1_set_student_active。 */ export async function status(
  ctx: ServiceContext,
  id: string,
  active: boolean,
) {
  await rpc(ctx.db, 'flowie_v1_set_student_active', { p_student: id, p_active: active });
  return { updated: true };
}

import { type ServiceContext } from '../../shared/types/service-context.js';
import { rpc, rpcSingle } from '../../infrastructure/database/rpc.js';
import * as repository from './scheduling.repository.js';
import * as accounts from '../auth/auth.repository.js';
import { type ScheduleInput } from './scheduling.schemas.js';

/** 讀取公開場次目錄（授課場次）。沿用既有 V1 資料契約，不另行建立交易規則。 呼叫 flowie_v1_session_catalog。 */ export async function catalog(
  ctx: ServiceContext,
  from: string,
  to: string,
) {
  return rpc(ctx.db, 'flowie_v1_session_catalog', { p_from: from, p_to: to });
}

/** 組合授權的管理場次與老師姓名（授課場次）。沿用既有 V1 資料契約，不另行建立交易規則。 */ export async function manage(
  ctx: ServiceContext,
  from: string,
  to: string,
) {
  const profile = await accounts.profile(ctx.db, ctx.user!.id);
  if (!profile?.is_active) throw Object.assign(new Error('FORBIDDEN'), { status: 403 });
  const teacher = await accounts.teacher(ctx.db, ctx.user!.id);
  if (!profile.is_admin && !teacher?.is_active)
    throw Object.assign(new Error('FORBIDDEN'), { status: 403 });
  const rows = await repository.listManaged(
    ctx.db,
    profile.is_admin ? undefined : ctx.user!.id,
    from,
    to,
  );
  const names = await repository.publicTeacherNames(ctx.db);
  if (profile.is_admin && rows.length) {
    for (const p of await repository.profileTeacherNames(ctx.db, [
      ...new Set(
        rows.map(/** 將每個項目轉換為本次清單需要的資料或元件。 */ (s: any) => s.teacher_id),
      ),
    ]))
      names.set(p.id, p.display_name);
  }
  return rows.map(
    /** 將每個項目轉換為本次清單需要的資料或元件。 */ (s: any) => ({
      ...s,
      branch_id: s.rooms?.branch_id,
      branches: s.rooms?.branches,
      teachers: { name: names.get(s.teacher_id) ?? null },
      cancellation_deadline: s.cancellation_deadline_override_at,
    }),
  );
}

/** 建立或修改單一／既有支援範圍的場次（授課場次）。沿用既有 V1 資料契約，不另行建立交易規則。 呼叫 flowie_v1_schedule。 */ export async function schedule(
  ctx: ServiceContext,
  v: ScheduleInput,
  session: string | null,
) {
  return rpc(ctx.db, 'flowie_v1_schedule', {
    p_session: session,
    p_room: v.room_id,
    p_course: v.course_id,
    p_teacher: v.teacher_id,
    p_starts: v.starts_at,
    p_ends: v.ends_at,
    p_capacity: v.capacity,
    p_opens: v.booking_opens_at,
    p_closes: v.booking_closes_at ?? null,
    p_deadline: v.cancellation_deadline,
    p_until: v.until_date ?? null,
  });
}

/** 取消並由既有交易處理退堂（授課場次）。沿用既有 V1 資料契約，不另行建立交易規則。 呼叫 flowie_v1_cancel_session。 */ export async function cancel(
  ctx: ServiceContext,
  id: string,
) {
  return rpcSingle(ctx.db, 'flowie_v1_cancel_session', { p_session: id });
}

/** 讀取授權場次名單（授課場次）。沿用既有 V1 資料契約，不另行建立交易規則。 呼叫 flowie_v1_session_students。 */ export async function students(
  ctx: ServiceContext,
  id: string,
) {
  return rpc(ctx.db, 'flowie_v1_session_students', { p_session: id });
}

/** 讀取授課紀錄（授課場次）。沿用既有 V1 資料契約，不另行建立交易規則。 呼叫 flowie_v1_teaching_records。 */ export async function teaching(
  ctx: ServiceContext,
  from: string,
  to: string,
) {
  return rpc(ctx.db, 'flowie_v1_teaching_records', { p_from: from, p_to: to });
}

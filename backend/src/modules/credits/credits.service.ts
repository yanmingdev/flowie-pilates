import { type ServiceContext } from '../../shared/types/service-context.js';
import { rpc, rpcSingle } from '../../infrastructure/database/rpc.js';
import * as repository from './credits.repository.js';
import { type IssueInput, type AdjustmentInput } from './credits.schemas.js';

/** 讀取學生方案（方案及堂數）。沿用既有 V1 資料契約，不另行建立交易規則。 呼叫 flowie_v1_packages。 */ export async function packages(
  ctx: ServiceContext,
  student?: string,
) {
  return rpc(ctx.db, 'flowie_v1_packages', { p_student: student ?? null });
}

/** 讀取堂數帳本（方案及堂數）。沿用既有 V1 資料契約，不另行建立交易規則。 */ export async function ledger(
  ctx: ServiceContext,
  student?: string,
) {
  return repository.ledger(ctx.db, student);
}

/** 發放學生方案（方案及堂數）。沿用既有 V1 資料契約，不另行建立交易規則。 呼叫 flowie_v1_issue_package。 */ export async function issue(
  ctx: ServiceContext,
  v: IssueInput,
) {
  return rpcSingle(ctx.db, 'flowie_v1_issue_package', {
    p_student: v.student_id,
    p_package: v.package_id,
    p_key: v.idempotency_key,
    p_starts: v.starts_at ?? null,
  });
}

/** 調整方案堂數並保留原因（方案及堂數）。沿用既有 V1 資料契約，不另行建立交易規則。 呼叫 flowie_v1_adjust_credits。 */ export async function adjust(
  ctx: ServiceContext,
  id: string,
  v: AdjustmentInput,
) {
  return rpcSingle(ctx.db, 'flowie_v1_adjust_credits', {
    p_package: id,
    p_delta: v.delta,
    p_note: v.note,
    p_key: v.idempotency_key,
  });
}

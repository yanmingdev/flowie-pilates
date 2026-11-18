import { type ServiceContext } from '../../shared/types/service-context.js';
import { rpc } from '../../infrastructure/database/rpc.js';
import { type ReportQuery } from './reports.schemas.js';

/** 讀取真實營運統計（營運報表）。沿用既有 V1 資料契約，不另行建立交易規則。 呼叫 flowie_v1_report。 */ export async function report(
  ctx: ServiceContext,
  q: ReportQuery,
) {
  return rpc(ctx.db, 'flowie_v1_report', {
    p_from: q.from,
    p_to: q.to,
    p_branch: q.branch_id ?? null,
    p_status: q.status ?? null,
  });
}

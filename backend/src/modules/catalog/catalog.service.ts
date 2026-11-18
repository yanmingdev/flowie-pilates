import { type ServiceContext } from '../../shared/types/service-context.js';
import * as repository from './catalog.repository.js';
import { resources } from './catalog.schemas.js';

/** 讀取清單（後台內容資源）。沿用既有 V1 資料契約，不另行建立交易規則。 */ export async function list(
  ctx: ServiceContext,
  name: string,
  page: number,
  limit: number,
  q?: string,
) {
  const result = await repository.list(ctx.db, name, page, limit, q);
  let rows = result.rows;
  if (name === 'teachers') {
    const names = await repository.teacherNames(
      ctx.db,
      rows.map(/** 將每個項目轉換為本次清單需要的資料或元件。 */ (r: any) => r.id),
      !!ctx.user,
    );
    rows = rows.map(
      /** 將每個項目轉換為本次清單需要的資料或元件。 */ (row: any) => ({
        ...row,
        name: names.get(row.id) ?? null,
      }),
    );
  }
  return { data: rows, meta: { page, limit, total: result.total } };
}

/** 建立資料（後台內容資源）。沿用既有 V1 資料契約，不另行建立交易規則。 */ export async function create(
  ctx: ServiceContext,
  name: string,
  fields: Record<string, unknown>,
) {
  return repository.create(ctx.db, name, fields);
}

/** 更新白名單內容欄位（後台內容資源）。沿用既有 V1 資料契約，不另行建立交易規則。 */ export async function update(
  ctx: ServiceContext,
  name: string,
  id: string | number,
  fields: Record<string, unknown>,
) {
  const c = resources[name];
  if (c.primary in fields && String(fields[c.primary]) !== String(id))
    throw Object.assign(new Error('INVALID_PRIMARY_KEY'), { status: 400 });
  return repository.update(ctx.db, name, id, fields);
}

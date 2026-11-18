import { type ServiceContext } from '../../shared/types/service-context.js';

import * as repository from './favorites.repository.js';

/** 讀取清單（課程收藏）。沿用既有 V1 資料契約，不另行建立交易規則。 */ export async function list(
  ctx: ServiceContext,
) {
  return repository.list(ctx.db, ctx.user!.id);
}

/** 更新收藏狀態（課程收藏）。沿用既有 V1 資料契約，不另行建立交易規則。 */ export async function save(
  ctx: ServiceContext,
  course_id: string,
  is_favorite: boolean,
) {
  await repository.save(ctx.db, ctx.user!.id, course_id, is_favorite);
  return { is_favorite };
}

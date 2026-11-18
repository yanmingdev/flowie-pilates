import { type ServiceContext } from '../../shared/types/service-context.js';
import { rpc } from '../../infrastructure/database/rpc.js';
import * as repository from './public-content.repository.js';

/** 讀取單品牌相容檢視（公開品牌與內容）。沿用既有 V1 資料契約，不另行建立交易規則。 */ export async function studios(
  ctx: ServiceContext,
) {
  const value = await repository.brand(ctx.db);
  return value
    ? [
        {
          id: 'flowie',
          slug: 'flowie',
          name: value.brand_name,
          description: value.brand_tagline,
          logo_url: value.logo_url,
        },
      ]
    : [];
}

/** 讀取公開師資（公開品牌與內容）。沿用既有 V1 資料契約，不另行建立交易規則。 呼叫 flowie_public_teachers。 */ export async function teachers(
  ctx: ServiceContext,
) {
  const data = (await rpc(ctx.db, 'flowie_public_teachers', {})) as Array<{
    teacher_id: string;
    display_name: string;
    photo_url: string | null;
  }>;
  return data.map(
    /** 將每個項目轉換為本次清單需要的資料或元件。 */ (t) => ({
      id: t.teacher_id,
      name: t.display_name,
      photo_url: t.photo_url,
    }),
  );
}

/** 讀取啟用的身體知識內容（公開品牌與內容）。沿用既有 V1 資料契約，不另行建立交易規則。 */ export async function knowledge(
  ctx: ServiceContext,
) {
  return repository.knowledge(ctx.db);
}

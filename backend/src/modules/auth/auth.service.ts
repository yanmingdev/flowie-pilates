import { type ServiceContext } from '../../shared/types/service-context.js';

import * as repository from './auth.repository.js';

/** 讀取登入者 profile 與老師身分（帳號資料）。沿用既有 V1 資料契約，不另行建立交易規則。 */ export async function me(
  ctx: ServiceContext,
) {
  const [profile, teacher] = await Promise.all([
    repository.profile(ctx.db, ctx.user!.id),
    repository.teacher(ctx.db, ctx.user!.id),
  ]);
  if (!profile) throw Object.assign(new Error('PROFILE_NOT_FOUND'), { status: 404 });
  return {
    user: { id: ctx.user!.id, email: ctx.user!.email ?? '' },
    profile,
    is_teacher: !!teacher?.is_active && profile.is_active,
  };
}

/** 更新本人顯示名稱（帳號資料）。沿用既有 V1 資料契約，不另行建立交易規則。 */ export async function updateProfile(
  ctx: ServiceContext,
  display_name: string,
) {
  return repository.updateProfile(ctx.db, ctx.user!.id, display_name);
}

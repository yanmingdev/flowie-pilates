import { type SupabaseClient } from '@supabase/supabase-js';
import { resources } from './catalog.schemas.js';

/** 讀取清單（後台內容資源）。僅負責資料存取，錯誤交由上層處理。 */ export async function list(
  db: SupabaseClient,
  name: string,
  page: number,
  limit: number,
  q?: string,
) {
  const config = resources[name];
  let request = db
    .from(config.table)
    .select('*', { count: 'exact' })
    .order(config.order)
    .range((page - 1) * limit, page * limit - 1);
  if (q && config.search)
    request = request.ilike(config.search, `%${q.replace(/[%_\\]/g, '\\$&')}%`);
  const { data, count, error } = await request;
  if (error) throw error;
  return { rows: data ?? [], total: count ?? 0 };
}

/** 組合公開姓名及授權可讀的老師姓名（後台內容資源）。僅負責資料存取，錯誤交由上層處理。 呼叫 flowie_public_teachers。 */ export async function teacherNames(
  db: SupabaseClient,
  ids: string[],
  authenticated: boolean,
) {
  const result = await db.rpc('flowie_public_teachers');
  if (result.error) throw result.error;
  const names = new Map(
    (result.data ?? []).map(
      /** 將每個項目轉換為本次清單需要的資料或元件。 */ (x: any) => [x.teacher_id, x.display_name],
    ),
  );
  if (authenticated && ids.length) {
    const profiles = await db.from('profiles').select('id,display_name').in('id', ids);
    if (profiles.error) throw profiles.error;
    for (const p of profiles.data ?? []) names.set(p.id, p.display_name);
  }
  return names;
}

/** 建立資料（後台內容資源）。僅負責資料存取，錯誤交由上層處理。 */ export async function create(
  db: SupabaseClient,
  name: string,
  fields: Record<string, unknown>,
) {
  const { data, error } = await db.from(resources[name].table).insert(fields).select().single();
  if (error) throw error;
  return data;
}

/** 更新白名單內容欄位（後台內容資源）。僅負責資料存取，錯誤交由上層處理。 */ export async function update(
  db: SupabaseClient,
  name: string,
  id: string | number,
  fields: Record<string, unknown>,
) {
  const c = resources[name];
  const { data, error } = await db
    .from(c.table)
    .update(fields)
    .eq(c.primary, id)
    .select()
    .maybeSingle();
  if (error) throw error;
  if (!data) throw Object.assign(new Error('FORBIDDEN_OR_NOT_FOUND'), { status: 404 });
  return data;
}

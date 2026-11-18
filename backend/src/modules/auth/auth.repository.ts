import { type SupabaseClient } from '@supabase/supabase-js';

/** 依 UID 讀取 profile（帳號資料）。僅負責資料存取，錯誤交由上層處理。 */ export async function profile(
  db: SupabaseClient,
  id: string,
) {
  const { data, error } = await db
    .from('profiles')
    .select('id,display_name,is_admin,is_active')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** 依 UID 讀取老師紀錄（帳號資料）。僅負責資料存取，錯誤交由上層處理。 */ export async function teacher(
  db: SupabaseClient,
  id: string,
) {
  const { data, error } = await db
    .from('teachers')
    .select('id,is_active')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** 更新本人顯示名稱（帳號資料）。僅負責資料存取，錯誤交由上層處理。 */ export async function updateProfile(
  db: SupabaseClient,
  id: string,
  display_name: string,
) {
  const { data, error } = await db
    .from('profiles')
    .update({ display_name })
    .eq('id', id)
    .select('id,display_name,is_admin,is_active')
    .single();
  if (error) throw error;
  return data;
}

import { type SupabaseClient } from '@supabase/supabase-js';

/** 讀取唯一品牌設定（公開品牌與內容）。僅負責資料存取，錯誤交由上層處理。 */ export async function brand(
  db: SupabaseClient,
) {
  const { data, error } = await db
    .from('site_settings')
    .select('brand_name,brand_tagline,logo_url')
    .eq('id', 1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** 讀取啟用的身體知識內容（公開品牌與內容）。僅負責資料存取，錯誤交由上層處理。 */ export async function knowledge(
  db: SupabaseClient,
) {
  const { data, error } = await db
    .from('knowledge_articles')
    .select('id,title,body_area,summary,image_url,sort_order')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

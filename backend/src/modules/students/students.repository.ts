import { type SupabaseClient } from '@supabase/supabase-js';
import { type StudentQuery } from './students.schemas.js';

/** 讀取清單（學生資料）。僅負責資料存取，錯誤交由上層處理。 */ export async function list(
  db: SupabaseClient,
  q: StudentQuery,
) {
  let request = db
    .from('profiles')
    .select('id,display_name,is_active', { count: 'exact' })
    .eq('is_admin', false)
    .order('created_at', { ascending: false })
    .range((q.page - 1) * q.limit, q.page * q.limit - 1);
  if (q.q) request = request.ilike('display_name', '%' + q.q.replace(/[%_\\]/g, '\\$&') + '%');
  const { data, count, error } = await request;
  if (error) throw error;
  return {
    data: (data ?? []).map(
      /** 將每個項目轉換為本次清單需要的資料或元件。 */ (p: any) => ({
        student_id: p.id,
        display_name: p.display_name,
        is_active: p.is_active,
      }),
    ),
    meta: { page: q.page, limit: q.limit, total: count ?? 0 },
  };
}

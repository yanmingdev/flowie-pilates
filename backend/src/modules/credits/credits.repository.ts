import { type SupabaseClient } from '@supabase/supabase-js';

/** 讀取堂數帳本（方案及堂數）。僅負責資料存取，錯誤交由上層處理。 */ export async function ledger(
  db: SupabaseClient,
  student?: string,
) {
  let request = db
    .from('credit_ledger')
    .select('*,student_packages!inner(student_id)')
    .order('created_at', { ascending: false })
    .limit(200);
  if (student) request = request.eq('student_packages.student_id', student);
  const { data, error } = await request;
  if (error) throw error;
  return data ?? [];
}

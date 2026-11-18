import { type SupabaseClient } from '@supabase/supabase-js';
import { rpc } from '../../infrastructure/database/rpc.js';

/** 查詢指定時段及老師範圍內的場次（授課場次）。僅負責資料存取，錯誤交由上層處理。 */ export async function listManaged(
  db: SupabaseClient,
  teacherId: string | undefined,
  from: string,
  to: string,
) {
  let query = db
    .from('class_sessions')
    .select('*,courses(name),rooms(name,branch_id,branches(name))')
    .gte('starts_at', from)
    .lt('starts_at', to)
    .order('starts_at')
    .limit(1000);
  if (teacherId) query = query.eq('teacher_id', teacherId);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

/** 建立公開老師 UID 與姓名對照（授課場次）。僅負責資料存取，錯誤交由上層處理。 呼叫 flowie_public_teachers。 */ export async function publicTeacherNames(
  db: SupabaseClient,
) {
  const teachers = (await rpc(db, 'flowie_public_teachers', {})) as any[];
  return new Map(
    teachers.map(
      /** 將每個項目轉換為本次清單需要的資料或元件。 */ (t) => [t.teacher_id, t.display_name],
    ),
  );
}

/** 讀取授權可見的老師 profile 姓名（授課場次）。僅負責資料存取，錯誤交由上層處理。 */ export async function profileTeacherNames(
  db: SupabaseClient,
  ids: string[],
) {
  const { data, error } = await db.from('profiles').select('id,display_name').in('id', ids);
  if (error) throw error;
  return data ?? [];
}

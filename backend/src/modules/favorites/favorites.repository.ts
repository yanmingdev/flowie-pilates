import { type SupabaseClient } from '@supabase/supabase-js';

/** 讀取清單（課程收藏）。僅負責資料存取，錯誤交由上層處理。 */ export async function list(
  db: SupabaseClient,
  id: string,
) {
  const { data, error } = await db
    .from('course_favorites')
    .select(
      'course_id,created_at,courses(id,name,image_url,description,difficulty,default_duration_minutes,credit_cost,is_active)',
    )
    .eq('student_id', id)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? [])
    .map(
      /** 將每個項目轉換為本次清單需要的資料或元件。 */ (f: any) =>
        f.courses && {
          id: f.course_id,
          course_id: f.course_id,
          course_name: f.courses.name,
          ...f.courses,
          created_at: f.created_at,
        },
    )
    .filter(Boolean);
}

/** 更新收藏狀態（課程收藏）。僅負責資料存取，錯誤交由上層處理。 */ export async function save(
  db: SupabaseClient,
  id: string,
  course_id: string,
  saved: boolean,
) {
  if (saved) {
    const { error } = await db.from('course_favorites').insert({ student_id: id, course_id });
    if (error && error.code !== '23505') throw error;
  } else {
    const { error } = await db
      .from('course_favorites')
      .delete()
      .eq('student_id', id)
      .eq('course_id', course_id);
    if (error) throw error;
  }
}

export type Studio = {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logo_url?: string | null;
  is_active?: boolean;
};
export type Session = {
  id: string;
  studio_id: string;
  branch_id: string;
  branch_name: string;
  room_id: string;
  room_name: string;
  course_id: string;
  course_name: string;
  course_image?: string;
  course_description: string | null;
  duration_minutes: number;
  difficulty: string;
  category_id: string;
  teacher_id: string;
  teacher_name: string;
  teacher_photo?: string;
  starts_at: string;
  ends_at: string;
  capacity: number;
  booked_count: number;
  credit_cost: number;
  booking_opens_at: string;
  booking_closes_at: string | null;
  cancellation_deadline: string | null;
  status: string;
};
export type Me = {
  user: { id: string; email: string };
  profile: { id: string; display_name: string | null; is_admin: boolean; is_active: boolean };
  is_teacher: boolean;
};
export const dateTime = (v: string) =>
  new Intl.DateTimeFormat('zh-TW', {
    timeZone: 'Asia/Taipei',
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(v));
export const shortTime = (v: string) =>
  new Intl.DateTimeFormat('zh-TW', {
    timeZone: 'Asia/Taipei',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(v));
export const range = (daysBack = 0, daysForward = 45) => ({
  from: new Date(Date.now() - daysBack * 86400000).toISOString(),
  to: new Date(Date.now() + daysForward * 86400000).toISOString(),
});

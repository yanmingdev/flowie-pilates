import { z } from 'zod';
import { uuid } from '../validators/resources.js';
export const sessionInput = z
  .object({
    studio_id: uuid,
    branch_id: uuid,
    room_id: uuid,
    course_id: uuid,
    teacher_id: uuid,
    starts_at: z.string().datetime({ offset: true }),
    ends_at: z.string().datetime({ offset: true }),
    capacity: z.number().int().positive(),
    booking_opens_at: z.string().datetime({ offset: true }).nullable(),
    booking_closes_at: z.string().datetime({ offset: true }).nullable().optional(),
    cancellation_deadline: z.string().datetime({ offset: true }).nullable(),
    until_date: z.string().date().nullable().optional(),
  })
  .strict()
  .superRefine((v, ctx) => {
    if (
      v.booking_closes_at &&
      (new Date(v.booking_closes_at) > new Date(v.starts_at) ||
        (v.booking_opens_at && new Date(v.booking_closes_at) < new Date(v.booking_opens_at)))
    )
      ctx.addIssue({ code: 'custom', path: ['booking_closes_at'], message: '預約截止時間須介於開放預約及上課開始之間。' });
  });
export function scheduleArgs(v: z.infer<typeof sessionInput>) {
  return {
    p_studio: v.studio_id,
    p_branch: v.branch_id,
    p_room: v.room_id,
    p_course: v.course_id,
    p_teacher: v.teacher_id,
    p_starts: v.starts_at,
    p_ends: v.ends_at,
    p_capacity: v.capacity,
    p_opens: v.booking_opens_at,
    p_closes: v.booking_closes_at ?? null,
    p_cancel_deadline: v.cancellation_deadline,
    p_repeat_until: v.until_date ?? null,
  };
}
export function updateArgs(id: string, v: z.infer<typeof sessionInput>) {
  const { p_studio: _studio, p_repeat_until: _until, ...rest } = scheduleArgs(v);
  return { p_session: id, ...rest };
}

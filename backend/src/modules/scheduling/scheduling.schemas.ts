import { z } from 'zod';
import { uuid } from '../../shared/validation/common.schemas.js';
export const scheduleSchema = z
  .object({
    studio_id: z.string().optional(),
    branch_id: uuid.optional(),
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
  .strict();
export type ScheduleInput = z.infer<typeof scheduleSchema>;

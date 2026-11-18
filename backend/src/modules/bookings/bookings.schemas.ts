import { z } from 'zod';
import { idempotent, uuid } from '../../shared/validation/common.schemas.js';
export const bookingSchema = idempotent.extend({ session_id: uuid }).strict();
export const attendanceSchema = z
  .object({ booking_id: uuid, status: z.enum(['present', 'absent', 'unconfirmed']) })
  .strict();
export const feedbackSchema = z.object({ feedback: z.string().trim().min(1).max(2000) }).strict();

import { z } from 'zod';
import { idempotent, uuid } from '../../shared/validation/common.schemas.js';
export const issueSchema = idempotent
  .extend({
    studio_id: z.string().optional(),
    student_id: uuid,
    package_id: uuid,
    starts_at: z.string().datetime({ offset: true }).optional(),
  })
  .strict();
export const adjustmentSchema = idempotent
  .extend({
    delta: z
      .number()
      .int()
      .refine(/** 人工調整堂數不可為零，避免產生無意義的帳本異動。 */ (x) => x !== 0),
    note: z.string().trim().min(1).max(500),
  })
  .strict();
export type IssueInput = z.infer<typeof issueSchema>;
export type AdjustmentInput = z.infer<typeof adjustmentSchema>;

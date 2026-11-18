import { z } from 'zod';
import { dateRange, uuid } from '../../shared/validation/common.schemas.js';
export const reportQuery = dateRange.extend({
  branch_id: uuid.optional(),
  status: z.enum(['scheduled', 'cancelled', 'completed']).optional(),
});
export type ReportQuery = z.infer<typeof reportQuery>;

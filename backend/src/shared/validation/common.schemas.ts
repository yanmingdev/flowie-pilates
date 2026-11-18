import { z } from 'zod';
export const uuid = z.string().uuid();
export const dateRange = z.object({
  from: z.string().datetime({ offset: true }),
  to: z.string().datetime({ offset: true }),
});
export const idempotent = z.object({ idempotency_key: z.string().min(8).max(120) });

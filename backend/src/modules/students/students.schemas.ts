import { z } from 'zod';
export const studentQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().max(100).optional(),
});
export const studentStatus = z
  .object({ studio_id: z.string().optional(), is_active: z.boolean() })
  .strict();
export type StudentQuery = z.infer<typeof studentQuery>;

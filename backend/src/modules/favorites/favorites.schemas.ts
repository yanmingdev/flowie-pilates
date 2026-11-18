import { z } from 'zod';
import { uuid } from '../../shared/validation/common.schemas.js';
export const favoriteSchema = z
  .object({ course_id: uuid, is_favorite: z.boolean(), studio_id: z.string().optional() })
  .strict();

import dotenv from 'dotenv';
import { z } from 'zod';
import path from 'node:path';
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });
dotenv.config();
const schema = z.object({
  PORT: z.coerce.number().int().positive().default(3001),
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
});
export const env = schema.parse(process.env);

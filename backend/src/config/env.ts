import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

// This resolves to the project root in both src/config and dist/config.
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
dotenv.config({ path: path.join(projectRoot, '.env') });

function isPrivilegedKey(key: string): boolean {
  if (key.startsWith('sb_secret_')) return true;
  const parts = key.split('.');
  if (parts.length !== 3) return false;
  try {
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    return payload.role === 'service_role' || payload.role === 'supabase_admin';
  } catch {
    return false;
  }
}

const schema = z.object({
  PORT: z.coerce.number().int().positive().default(3001),
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),
  SUPABASE_URL: z.string().url().refine((value) => !value.includes('YOUR_PROJECT'), '請填入實際的 Supabase 專案網址'),
  SUPABASE_ANON_KEY: z.string().min(1).refine((value) => !value.includes('YOUR_PUBLISHABLE_OR_ANON_KEY') && !isPrivilegedKey(value), '請填入 publishable key 或 anon key，不可使用 secret／service_role key'),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  const fields = [...new Set(parsed.error.issues.map((issue) => issue.path.join('.')))];
  throw new Error(
    `Flowie 設定不完整或無效：${fields.join('、')}。請檢查專案根目錄的 .env（可參考 .env.example）；key 請使用 Supabase publishable 或 anon key。`,
  );
}
export const env = parsed.data;

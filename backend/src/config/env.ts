import { resolveProjectEnvironment, isPrivilegedKey } from '../../../config/environment/loader.mjs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

// This resolves to the project root in both src/config and dist/config.
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const values = resolveProjectEnvironment(projectRoot);

const schema = z.object({
  PORT: z.coerce.number().int().positive().default(3001),
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),
  SUPABASE_URL: z
    .string()
    .url()
    .refine(
      /** 拒絕尚未填寫的環境占位值或特權 key；錯誤訊息只指出欄位、不列出值。 */ (value) =>
        !value.includes('YOUR_PROJECT'),
      '請填入實際的 Supabase 專案網址',
    ),
  SUPABASE_ANON_KEY: z
    .string()
    .min(1)
    .refine(
      /** 拒絕尚未填寫的環境占位值或特權 key；錯誤訊息只指出欄位、不列出值。 */ (value) =>
        !value.includes('YOUR_PUBLISHABLE_OR_ANON_KEY') && !isPrivilegedKey(value),
      '請填入 publishable key 或 anon key，不可使用 secret／service_role key',
    ),
});

const parsed = schema.safeParse(values);
if (!parsed.success) {
  const fields = [
    ...new Set(
      parsed.error.issues.map(
        /** 將每個項目轉換為本次清單需要的資料或元件。 */ (issue) => issue.path.join('.'),
      ),
    ),
  ];
  throw new Error(
    `Flowie 設定不完整或無效：${fields.join('、')}。請檢查config/env 的環境檔（或相容根目錄 .env；請參考 config/env/*.example）；key 請使用 Supabase publishable 或 anon key。`,
  );
}
export const env = parsed.data;

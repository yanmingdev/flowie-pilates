import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';

/** 辨識 Supabase secret 或具特權的 JWT；本機解析只用於防止誤用，不作身分驗證。 */ export function isPrivilegedKey(
  key,
) {
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

/** 按模式與優先序載入分類環境檔；系統變數最高，無分類檔時才相容根目錄 .env。 */ export function resolveProjectEnvironment(
  projectRoot,
  mode = process.env.FLOWIE_ENV || process.env.NODE_ENV || 'development',
  environment = process.env,
) {
  if (!['development', 'test', 'production'].includes(mode))
    throw new Error('FLOWIE_ENV 只允許 development、test、production。');
  const base = path.join(projectRoot, 'config', 'env');
  const candidates = [
    ...(mode !== 'test' ? [path.join(base, '.env.local')] : []),
    path.join(base, `.env.${mode}`),
    path.join(base, `.env.${mode}.local`),
  ];
  const selected = candidates.filter(
    /** 依目前條件保留符合的項目，不修改原始清單。 */ (file) => existsSync(file),
  );
  const legacy = path.join(projectRoot, '.env');
  const files = selected.length ? selected : existsSync(legacy) ? [legacy] : [];
  let values = {};
  for (const file of files) values = { ...values, ...dotenv.parse(readFileSync(file)) };
  return {
    ...values,
    ...Object.fromEntries(
      Object.entries(environment).filter(
        /** 依目前條件保留符合的項目，不修改原始清單。 */ ([, value]) => value !== undefined,
      ),
    ),
  };
}

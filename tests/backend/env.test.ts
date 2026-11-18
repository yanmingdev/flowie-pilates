import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
let fixtureRoot: string;
let entry: string;

/** 由指定目錄啟動環境設定 fixture，確認路徑不依賴工作目錄。 */ function runFrom(cwd: string) {
  const cleanEnv = { ...process.env };
  for (const name of [
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'PORT',
    'FRONTEND_URL',
    'NODE_OPTIONS',
    'FLOWIE_ENV',
    'NODE_ENV',
  ]) {
    delete cleanEnv[name];
  }
  return spawnSync(process.execPath, ['--import', 'tsx', entry], {
    cwd,
    env: { ...cleanEnv, FLOWIE_ENV: 'development' },
    encoding: 'utf8',
  });
}

beforeAll(
  /** 建立本組測試需要的隔離 fixture。 */ () => {
    // Keeping the fixture under the project lets Node resolve the normal dependencies.
    fixtureRoot = mkdtempSync(path.join(projectRoot, '.flowie-config-test-'));
    const dir = path.join(fixtureRoot, 'backend', 'src', 'config');
    mkdirSync(dir, { recursive: true });
    entry = path.join(dir, 'env.ts');
    copyFileSync(path.join(projectRoot, 'backend', 'src', 'config', 'env.ts'), entry);
    const shared = path.join(fixtureRoot, 'config', 'environment');
    mkdirSync(shared, { recursive: true });
    copyFileSync(
      path.join(projectRoot, 'config/environment/loader.mjs'),
      path.join(shared, 'loader.mjs'),
    );
  },
);
afterAll(
  /** 清除本組測試建立的 fixture 或資源。 */ () =>
    rmSync(fixtureRoot, { recursive: true, force: true }),
);

describe(
  'project environment configuration',
  /** 組織同一功能的測試案例，不接觸正式資料。 */ () => {
    it(
      'explains which values are missing without exposing a Zod error',
      /** 驗證目前測試案例的預期行為與錯誤邊界。 */ () => {
        const result = runFrom(fixtureRoot);
        expect(result.status).not.toBe(0);
        expect(result.stderr).toContain('Flowie 設定不完整或無效');
        expect(result.stderr).toContain('SUPABASE_URL');
        expect(result.stderr).toContain('SUPABASE_ANON_KEY');
        expect(result.stderr).not.toContain('ZodError');
      },
    );
    it(
      'loads the project-root file from either the project or backend directory',
      /** 驗證目前測試案例的預期行為與錯誤邊界。 */ () => {
        writeFileSync(
          path.join(fixtureRoot, '.env'),
          'SUPABASE_URL=http://127.0.0.1:54321\nSUPABASE_ANON_KEY=local-test-anon-key\n',
        );
        expect(runFrom(fixtureRoot).status).toBe(0);
        expect(runFrom(path.join(fixtureRoot, 'backend')).status).toBe(0);
      },
    );
    it(
      'prefers the canonical environment folder over the legacy root file',
      /** 驗證目前測試案例的預期行為與錯誤邊界。 */ () => {
        const dir = path.join(fixtureRoot, 'config', 'env');
        mkdirSync(dir, { recursive: true });
        writeFileSync(
          path.join(fixtureRoot, '.env'),
          'SUPABASE_URL=not-a-url\nSUPABASE_ANON_KEY=legacy\n',
        );
        writeFileSync(
          path.join(dir, '.env.local'),
          'SUPABASE_URL=http://127.0.0.1:54321\nSUPABASE_ANON_KEY=canonical-public-test-key\n',
        );
        expect(runFrom(fixtureRoot).status).toBe(0);
        rmSync(dir, { recursive: true, force: true });
      },
    );
    it(
      'rejects privileged keys without printing them',
      /** 驗證目前測試案例的預期行為與錯誤邊界。 */ () => {
        const secret = 'sb_secret_test_key_do_not_use';
        writeFileSync(
          path.join(fixtureRoot, '.env'),
          `SUPABASE_URL=http://127.0.0.1:54321\nSUPABASE_ANON_KEY=${secret}\n`,
        );
        const result = runFrom(fixtureRoot);
        expect(result.status).not.toBe(0);
        expect(result.stderr).toContain('SUPABASE_ANON_KEY');
        expect(result.stderr).not.toContain(secret);
      },
    );
  },
);

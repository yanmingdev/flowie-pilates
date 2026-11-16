import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
let fixtureRoot: string;
let entry: string;

function runFrom(cwd: string) {
  const cleanEnv = { ...process.env };
  for (const name of ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'PORT', 'FRONTEND_URL', 'NODE_OPTIONS']) {
    delete cleanEnv[name];
  }
  return spawnSync(process.execPath, ['--import', 'tsx', entry], {
    cwd,
    env: cleanEnv,
    encoding: 'utf8',
  });
}

beforeAll(() => {
  // Keeping the fixture under the project lets Node resolve the normal dependencies.
  fixtureRoot = mkdtempSync(path.join(projectRoot, '.flowie-config-test-'));
  const dir = path.join(fixtureRoot, 'backend', 'src', 'config');
  mkdirSync(dir, { recursive: true });
  entry = path.join(dir, 'env.ts');
  copyFileSync(path.join(projectRoot, 'backend', 'src', 'config', 'env.ts'), entry);
});
afterAll(() => rmSync(fixtureRoot, { recursive: true, force: true }));

describe('project environment configuration', () => {
  it('explains which values are missing without exposing a Zod error', () => {
    const result = runFrom(fixtureRoot);
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('Flowie 設定不完整或無效');
    expect(result.stderr).toContain('SUPABASE_URL');
    expect(result.stderr).toContain('SUPABASE_ANON_KEY');
    expect(result.stderr).not.toContain('ZodError');
  });
  it('loads the project-root file from either the project or backend directory', () => {
    writeFileSync(path.join(fixtureRoot, '.env'), 'SUPABASE_URL=http://127.0.0.1:54321\nSUPABASE_ANON_KEY=local-test-anon-key\n');
    expect(runFrom(fixtureRoot).status).toBe(0);
    expect(runFrom(path.join(fixtureRoot, 'backend')).status).toBe(0);
  });
  it('rejects privileged keys without printing them', () => {
    const secret = 'sb_secret_test_key_do_not_use';
    writeFileSync(path.join(fixtureRoot, '.env'), `SUPABASE_URL=http://127.0.0.1:54321\nSUPABASE_ANON_KEY=${secret}\n`);
    const result = runFrom(fixtureRoot);
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('SUPABASE_ANON_KEY');
    expect(result.stderr).not.toContain(secret);
  });
});

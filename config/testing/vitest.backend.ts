import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
export default defineConfig({
  root: fileURLToPath(new URL('../../backend', import.meta.url)),
  test: {
    include: ['../tests/backend/**/*.test.ts'],
    poolOptions: { forks: { singleFork: true } },
  },
});

import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
export default defineConfig({
  root: fileURLToPath(new URL('../../frontend', import.meta.url)),
  plugins: [react()],
  test: {
    include: ['../tests/frontend/**/*.test.tsx'],
    environment: 'jsdom',
    poolOptions: { forks: { singleFork: true } },
  },
});

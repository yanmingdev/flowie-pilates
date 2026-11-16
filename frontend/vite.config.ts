import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const frontendRoot = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(frontendRoot, '..');

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

export default defineConfig(({ mode }) => {
  // Only these two public values are shared from the backend configuration.
  const rootEnv = loadEnv(mode, projectRoot, ['SUPABASE_URL', 'SUPABASE_ANON_KEY']);
  const frontendEnv = loadEnv(mode, frontendRoot, 'VITE_');
  const supabaseUrl = process.env.VITE_SUPABASE_URL || rootEnv.SUPABASE_URL || frontendEnv.VITE_SUPABASE_URL || '';
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || rootEnv.SUPABASE_ANON_KEY || frontendEnv.VITE_SUPABASE_ANON_KEY || '';
  if (isPrivilegedKey(supabaseKey)) {
    throw new Error('Flowie 設定錯誤：前端只能使用 Supabase publishable 或 anon key，不可使用 secret／service_role key。');
  }
  return {
    define: {
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(supabaseUrl),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(supabaseKey),
    },
    build: {
      rollupOptions: {
        output: { manualChunks: { 'supabase-client': ['@supabase/supabase-js'] } },
      },
    },
    plugins: [
      react(),
      VitePWA({
        registerType: 'prompt',
        includeAssets: ['favicon.svg', 'icons/*.png'],
        manifest: {
          name: 'Flowie',
          short_name: 'Flowie',
          description: '找到屬於自己的節奏。',
          start_url: '/',
          scope: '/',
          display: 'standalone',
          theme_color: '#849A86',
          background_color: '#F7F3EE',
          icons: [
            { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
            {
              src: '/icons/maskable-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          navigateFallback: '/index.html',
          navigateFallbackDenylist: [/^\/api\//],
          globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
          globIgnores: ['images/**'],
          runtimeCaching: [],
        },
      }),
    ],
  };
});

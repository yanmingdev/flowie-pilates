import { defineConfig, loadEnv } from 'vite';
import { resolveProjectEnvironment, isPrivilegedKey } from '../environment/loader.mjs';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const frontendRoot = path.join(projectRoot, 'frontend');

export default defineConfig(
  /** 依模式組裝 Vite、公開環境設定與 PWA，避免將私密設定傳給瀏覽器。 */ ({ mode }) => {
    // Only these two public values are shared from the backend configuration.
    const rootEnv = resolveProjectEnvironment(
      projectRoot,
      process.env.FLOWIE_ENV || (['production', 'test'].includes(mode) ? mode : 'development'),
    );
    const frontendEnv = loadEnv(mode, frontendRoot, 'VITE_');
    const supabaseUrl =
      process.env.VITE_SUPABASE_URL || rootEnv.SUPABASE_URL || frontendEnv.VITE_SUPABASE_URL || '';
    const supabaseKey =
      process.env.VITE_SUPABASE_ANON_KEY ||
      rootEnv.SUPABASE_ANON_KEY ||
      frontendEnv.VITE_SUPABASE_ANON_KEY ||
      '';
    if (isPrivilegedKey(supabaseKey)) {
      throw new Error(
        'Flowie 設定錯誤：前端只能使用 Supabase publishable 或 anon key，不可使用 secret／service_role key。',
      );
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
          includeAssets: ['assets/images/brand/favicon.svg', 'assets/icons/pwa/*.png'],
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
              { src: '/assets/icons/pwa/icon-192.png', sizes: '192x192', type: 'image/png' },
              { src: '/assets/icons/pwa/icon-512.png', sizes: '512x512', type: 'image/png' },
              {
                src: '/assets/icons/pwa/maskable-512.png',
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
            globIgnores: ['images/**', 'assets/images/**'],
            runtimeCaching: [],
          },
        }),
      ],
    };
  },
);

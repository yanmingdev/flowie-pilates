export const publicAssets = {
  brand: {
    logo: '/assets/images/brand/logo.svg',
    lightLogo: '/assets/images/brand/logo-light.svg',
  },
  home: { hero: '/assets/images/home/flowie-hero.png' },
  courses: { defaultImage: '/assets/images/courses/flowie-course.png' },
} as const;

const legacyAssetUrls: Record<string, string> = {
  '/logo.svg': '/assets/images/brand/logo.svg',
  '/logo-light.svg': '/assets/images/brand/logo-light.svg',
  '/favicon.svg': '/assets/images/brand/favicon.svg',
  '/images/flowie-hero.png': '/assets/images/home/flowie-hero.png',
  '/images/flowie-course.png': '/assets/images/courses/flowie-course.png',
  '/images/knowledge-bridge.svg': '/assets/images/knowledge/knowledge-bridge.png',
  '/images/knowledge-cat-cow.svg': '/assets/images/knowledge/knowledge-cat-cow.png',
  '/images/knowledge-side-leg.svg': '/assets/images/knowledge/knowledge-side-leg.png',
  '/icons/icon-192.png': '/assets/icons/pwa/icon-192.png',
  '/icons/icon-512.png': '/assets/icons/pwa/icon-512.png',
  '/icons/maskable-512.png': '/assets/icons/pwa/maskable-512.png',
};

/** 將既有資料庫圖片網址轉成分類後公開路徑；未知及外部網址保持原樣。 */ export function resolvePublicAssetUrl(
  value: string | null | undefined,
): string | undefined {
  return value ? legacyAssetUrls[value] || value : undefined;
}

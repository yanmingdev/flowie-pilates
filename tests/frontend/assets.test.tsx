import { describe, expect, it } from 'vitest';
import { resolvePublicAssetUrl } from '../../frontend/src/shared/config/assets';
describe(
  'public image compatibility',
  /** 組織同一功能的測試案例，不接觸正式資料。 */ () => {
    it(
      'maps legacy content images to classified PNG assets',
      /** 驗證目前測試案例的預期行為與錯誤邊界。 */ () => {
        expect(resolvePublicAssetUrl('/images/flowie-hero.png')).toBe(
          '/assets/images/home/flowie-hero.png',
        );
        expect(resolvePublicAssetUrl('/images/knowledge-bridge.svg')).toBe(
          '/assets/images/knowledge/knowledge-bridge.png',
        );
      },
    );
    it(
      'preserves external URLs and missing values',
      /** 驗證目前測試案例的預期行為與錯誤邊界。 */ () => {
        expect(resolvePublicAssetUrl('https://example.test/image.png')).toBe(
          'https://example.test/image.png',
        );
        expect(resolvePublicAssetUrl(null)).toBeUndefined();
      },
    );
  },
);

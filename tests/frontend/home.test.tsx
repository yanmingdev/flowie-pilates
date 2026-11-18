import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Home } from '../../frontend/src/features/home/pages/Home';
const fixtures = vi.hoisted(
  /** 為隔離測試建立 fixture、接收本機服務結果或核對斷言；不接觸正式資料。 */ () => ({
    brand: { id: 'flowie', name: 'Flowie 芙洛', slug: 'flowie' } as any,
    loading: false,
    error: null as Error | null,
    retry: vi.fn(),
  }),
);
vi.mock(
  '../../frontend/src/shared/state/AppContext',
  /** 提供此測試專用的模組替身，避免連線至正式環境。 */ () => ({
    useApp: /** 取得全站登入與品牌狀態；缺少 Provider 時立即回報組裝錯誤。 */ () => ({
      studio: fixtures.brand,
      brandLoading: fixtures.loading,
      brandError: fixtures.error,
      retryBrand: fixtures.retry,
    }),
  }),
);
vi.mock(
  '../../frontend/src/shared/hooks/useStudioQuery',
  /** 提供此測試專用的模組替身，避免連線至正式環境。 */ () => ({
    useStudioQuery: /** 依目前品牌與條件建立查詢；品牌未就緒時不發送請求。 */ (
      resource: string,
    ) => ({
      data: !fixtures.brand
        ? undefined
        : resource === 'homepage-sections'
          ? [
              {
                section_type: 'hero',
                title: '找到自己的節奏',
                subtitle: '一起練習',
                image_url: null,
                link_url: '/classes',
                sort_order: 1,
                is_active: true,
              },
              {
                section_type: 'courses',
                title: '近期課程',
                subtitle: '一起練習',
                sort_order: 2,
                is_active: true,
              },
              {
                section_type: 'teachers',
                title: '認識老師',
                subtitle: '',
                sort_order: 3,
                is_active: true,
              },
              {
                section_type: 'announcements',
                title: '最新消息',
                subtitle: '',
                sort_order: 4,
                is_active: true,
              },
            ]
          : resource === 'announcements'
            ? [{ id: 'notice', title: '歡迎來到 Flowie', content: '示範公告', is_active: true }]
            : [],
      isError: false,
      isLoading: false,
    }),
  }),
);
vi.mock(
  '../../frontend/src/shared/api/http-client',
  /** 提供此測試專用的模組替身，避免連線至正式環境。 */ () => ({
    qs: /** 移除未定義／空字串條件後編碼 query string。 */ (x: Record<string, string>) =>
      new URLSearchParams(x).toString(),

    api: /** 呼叫共用 HTTP client 並取出既有 data 包裝。 */ async (url: string) =>
      url.startsWith('/teachers/public')
        ? [{ id: 'teacher', name: '示範老師', photo_url: null }]
        : [
            {
              id: 'session',
              course_id: 'course',
              course_name: '初晨墊上皮拉提斯',
              teacher_name: '示範老師',
              teacher_id: 'teacher',
              branch_name: '南港館',
              room_name: '晨光教室',
              starts_at: '2026-12-01T02:00:00Z',
              ends_at: '2026-12-01T03:00:00Z',
              capacity: 8,
              booked_count: 0,
              credit_cost: 1,
            },
          ],
  }),
);
vi.mock(
  '../../frontend/src/features/favorites/components/FavoriteButton',
  /** 提供此測試專用的模組替身，避免連線至正式環境。 */ () => ({
    FavoriteButton: /** 呈現單一課程的收藏操作；維持現有角色與互動規則。 */ () => null,
  }),
);

/** 以測試專用 Provider 與路由掛載元件，避免使用正式登入狀態。 */ function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}
beforeEach(
  /** 重設每個案例的初始狀態，避免測試互相影響。 */ () => {
    fixtures.brand = { id: 'flowie', name: 'Flowie 芙洛', slug: 'flowie' };
    fixtures.loading = false;
    fixtures.error = null;
    fixtures.retry.mockClear();
  },
);
afterEach(/** 清理案例產生的 DOM、狀態或 mock。 */ () => cleanup());
describe(
  'V1 homepage states',
  /** 組織同一功能的測試案例，不接觸正式資料。 */ () => {
    it(
      'displays sections, teacher, class and announcement from the API data',
      /** 驗證目前測試案例的預期行為與錯誤邊界。 */ async () => {
        mount();
        expect(screen.getByText('找到自己的節奏')).toBeTruthy();
        expect(await screen.findByText('初晨墊上皮拉提斯')).toBeTruthy();
        expect((await screen.findAllByText('示範老師')).length).toBeGreaterThan(0);
        expect(screen.getByText('歡迎來到 Flowie')).toBeTruthy();
        expect(screen.queryByText('正在連線 Flowie')).toBeNull();
      },
    );
    it(
      'shows loading only while brand query is loading',
      /** 驗證目前測試案例的預期行為與錯誤邊界。 */ () => {
        fixtures.brand = null;
        fixtures.loading = true;
        mount();
        expect(screen.getByText('正在連線 Flowie')).toBeTruthy();
      },
    );
    it(
      'shows an actionable connection error instead of endless loading',
      /** 驗證目前測試案例的預期行為與錯誤邊界。 */ () => {
        fixtures.brand = null;
        fixtures.error = new Error('offline');
        mount();
        expect(screen.getByText(/無法連線至 Flowie/)).toBeTruthy();
        expect(screen.queryByText('正在連線 Flowie')).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: '重新載入' }));
        expect(fixtures.retry).toHaveBeenCalledOnce();
      },
    );
    it(
      'distinguishes empty brand data from a loading state',
      /** 驗證目前測試案例的預期行為與錯誤邊界。 */ () => {
        fixtures.brand = null;
        mount();
        expect(screen.getByText('尚未設定品牌資料')).toBeTruthy();
        expect(screen.queryByText('正在連線 Flowie')).toBeNull();
      },
    );
  },
);

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
const auth = vi.hoisted(
  /** 為隔離測試建立 fixture、接收本機服務結果或核對斷言；不接觸正式資料。 */ () => ({
    unsubscribe: vi.fn(),
  }),
);
vi.mock(
  '../../frontend/src/shared/auth/supabase-client',
  /** 提供此測試專用的模組替身，避免連線至正式環境。 */ () => ({
    supabase: {
      auth: {
        getSession: /** 回傳此測試指定的未登入狀態，不連線 Supabase。 */ async () => ({
          data: { session: null },
        }),
        onAuthStateChange: /** 提供可追蹤 unsubscribe 的 Auth 訂閱替身，驗證卸載清理。 */ () => ({
          data: { subscription: { unsubscribe: auth.unsubscribe } },
        }),
      },
    },
  }),
);
vi.mock(
  '../../frontend/src/shared/api/http-client',
  /** 提供此測試專用的模組替身，避免連線至正式環境。 */ () => ({
    api: /** 呼叫共用 HTTP client 並取出既有 data 包裝。 */ async () => [],
    qs: /** 移除未定義／空字串條件後編碼 query string。 */ () => '',
  }),
);
import { AppProvider, useApp } from '../../frontend/src/shared/state/AppContext';
/** 顯示 Provider 的認證載入狀態，讓生命週期測試等待初始化完成。 */ function Consumer() {
  return <span>{useApp().authLoading ? 'loading' : 'ready'}</span>;
}
afterEach(
  /** 清理案例產生的 DOM、狀態或 mock。 */ () => {
    cleanup();
    vi.restoreAllMocks();
    auth.unsubscribe.mockClear();
  },
);
describe(
  'application provider lifecycle',
  /** 組織同一功能的測試案例，不接觸正式資料。 */ () => {
    it(
      'unsubscribes Auth and removes online/offline listeners when unmounted',
      /** 驗證目前測試案例的預期行為與錯誤邊界。 */ async () => {
        const add = vi.spyOn(window, 'addEventListener'),
          remove = vi.spyOn(window, 'removeEventListener');
        const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
        const view = render(
          <QueryClientProvider client={client}>
            <AppProvider>
              <Consumer />
            </AppProvider>
          </QueryClientProvider>,
        );
        await screen.findByText('ready');
        const handlers = add.mock.calls.filter(
          /** 依目前條件保留符合的項目，不修改原始清單。 */ ([event]) =>
            event === 'online' || event === 'offline',
        );
        view.unmount();
        expect(auth.unsubscribe).toHaveBeenCalledOnce();
        expect(handlers.length).toBeGreaterThanOrEqual(2);
        for (const [event, handler] of handlers)
          expect(remove).toHaveBeenCalledWith(event, handler);
        client.clear();
      },
    );
  },
);

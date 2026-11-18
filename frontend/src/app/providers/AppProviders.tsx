import { useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { AppProvider } from '../../shared/state/AppContext';

/** 組裝瀏覽器路由、查詢快取與全站狀態；每個應用實例持有自己的 QueryClient。 */
export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    /** 保持原查詢策略；React 重新渲染時沿用同一個快取實例。 */ () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: true },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppProvider>{children}</AppProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

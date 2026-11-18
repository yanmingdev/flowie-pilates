import { useQuery } from '@tanstack/react-query';
import { api, qs } from '../api/http-client';
import { useApp } from '../state/AppContext';

/** 依目前品牌與條件建立查詢；品牌未就緒時不發送請求。 */ export function useStudioQuery<T>(
  resource: string,
  enabled = true,
  params: Record<string, string> = {},
) {
  const { studio } = useApp();
  return useQuery({
    queryKey: [resource, studio?.id, params],

    queryFn: /** 載入目前查詢需要的資料；查詢狀態與錯誤交由 React Query 管理。 */ () =>
      api<T>(`/${resource}?${qs(params)}`),
    enabled: !!studio && enabled,
    staleTime: 30000,
  });
}

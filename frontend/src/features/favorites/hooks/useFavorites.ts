import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, post, qs } from '../../../shared/api/http-client';
import { useApp } from '../../../shared/state/AppContext';
export type Favorite = {
  id: string;
  course_id: string;
  course_name: string;
  image_url: string | null;
  description: string | null;
  difficulty: string;
  default_duration_minutes: number;
  credit_cost: number;
  is_active: boolean;
  created_at: string;
};

/** 處理此介面的狀態更新或回傳結果，保留所屬元件既有操作流程。 */ export function useFavorites() {
  const { studio, user } = useApp();
  const qc = useQueryClient();
  const key = ['favorites', studio?.id, user?.id];
  const query = useQuery({
    queryKey: key,

    queryFn: /** 載入目前查詢需要的資料；查詢狀態與錯誤交由 React Query 管理。 */ () =>
      api<Favorite[]>(`/favorites?${qs({ studio_id: studio!.id })}`),
    enabled: !!studio && !!user,
  });
  const mutation = useMutation({
    mutationFn: /** 送出這次表單或交易請求；成功後才進行快取更新。 */ async (v: {
      course_id: string;
      is_favorite: boolean;
    }) => {
      if (!studio || !user) throw new Error('請先登入並選擇品牌。');
      return post('/favorites', { studio_id: studio.id, ...v });
    },

    onSuccess: /** 操作成功後刷新相關查詢或關閉表單，避免顯示過期資料。 */ () =>
      qc.invalidateQueries({ queryKey: key }),
  });
  return { query, mutation };
}

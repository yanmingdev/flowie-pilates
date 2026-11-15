import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, post, qs } from './api';
import { useApp } from './context';
export type Favorite = {
  id: string;
  course_id: string;
  course_name: string;
  image_url: string | null;
  description: string | null;
  difficulty: string;
  duration_minutes: number;
  credit_cost: number;
  is_active: boolean;
  created_at: string;
};
export function useFavorites() {
  const { studio, user, me, refreshMe } = useApp();
  const qc = useQueryClient();
  const key = ['favorites', studio?.id, user?.id];
  const query = useQuery({
    queryKey: key,
    queryFn: () => api<Favorite[]>(`/favorites?${qs({ studio_id: studio!.id })}`),
    enabled: !!studio && !!user,
  });
  const mutation = useMutation({
    mutationFn: async (v: { course_id: string; is_favorite: boolean }) => {
      if (!studio || !user) throw new Error('請先登入並選擇品牌。');
      if (
        v.is_favorite &&
        !me?.memberships.some(
          (m) => m.studio_id === studio.id && m.role === 'student' && m.is_active,
        )
      ) {
        await post('/auth/join', { studio_id: studio.id });
        refreshMe();
      }
      return post('/favorites', { studio_id: studio.id, ...v });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });
  return { query, mutation };
}

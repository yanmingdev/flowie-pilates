import { Heart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../services/context';
import { useFavorites } from '../services/favorites';
export function FavoriteButton({ courseId }: { courseId: string }) {
  const { user } = useApp();
  const navigate = useNavigate();
  const { query, mutation } = useFavorites();
  const active = query.data?.some((f) => f.course_id === courseId) ?? false;
  return (
    <div className="favorite-control">
      <button
        type="button"
        className={`favorite-button ${active ? 'active' : ''}`}
        aria-label={active ? '移除收藏' : '收藏課程'}
        aria-pressed={active}
        disabled={mutation.isPending || (!!user && query.isLoading)}
        onClick={() => {
          if (!user) {
            navigate('/login');
            return;
          }
          mutation.mutate({ course_id: courseId, is_favorite: !active });
        }}
      >
        <Heart size={19} fill={active ? 'currentColor' : 'none'} />
      </button>
      {mutation.isError && <small role="alert">收藏更新失敗，請重試。</small>}
    </div>
  );
}

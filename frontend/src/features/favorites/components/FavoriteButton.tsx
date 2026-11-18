import { Heart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../../shared/state/AppContext';
import { useFavorites } from '../hooks/useFavorites';

/** 呈現單一課程的收藏操作；維持現有角色與互動規則。 */ export function FavoriteButton({
  courseId,
}: {
  courseId: string;
}) {
  const { user } = useApp();
  const navigate = useNavigate();
  const { query, mutation } = useFavorites();
  const active =
    query.data?.some(/** 檢查是否至少有一筆項目符合目前條件。 */ (f) => f.course_id === courseId) ??
    false;
  return (
    <div className="favorite-control">
      <button
        type="button"
        className={`favorite-button ${active ? 'active' : ''}`}
        aria-label={active ? '移除收藏' : '收藏課程'}
        aria-pressed={active}
        disabled={mutation.isPending || (!!user && query.isLoading)}
        onClick={
          /** 處理目前按鈕操作，依元件狀態執行對應動作。 */ () => {
            if (!user) {
              navigate('/login');
              return;
            }
            mutation.mutate({ course_id: courseId, is_favorite: !active });
          }
        }
      >
        <Heart size={19} fill={active ? 'currentColor' : 'none'} />
      </button>
      {mutation.isError && <small role="alert">收藏更新失敗，請重試。</small>}
    </div>
  );
}

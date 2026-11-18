import { resolvePublicAssetUrl } from '../../../shared/config/assets';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useApp } from '../../../shared/state/AppContext';
import { useFavorites } from '../hooks/useFavorites';
import { api, qs } from '../../../shared/api/http-client';
import { range } from '../../../shared/utils/date-time';
import { type Session } from '../../../shared/types/models';
import { FavoriteButton } from '../components/FavoriteButton';
import { Empty } from '../../../shared/ui/Empty';
import { ErrorNote } from '../../../shared/ui/ErrorNote';

/** 呈現本人的收藏課程；維持現有角色與互動規則。 */ export function Favorites() {
  const { studio, user } = useApp();
  const { query } = useFavorites();
  const dates = range(0, 90);
  const sessions = useQuery({
    queryKey: ['sessions', studio?.id, 'favorites'],

    queryFn: /** 載入目前查詢需要的資料；查詢狀態與錯誤交由 React Query 管理。 */ () =>
      api<Session[]>(`/sessions?${qs({ studio_id: studio!.id, ...dates })}`),
    enabled: !!studio && !!user,
  });
  if (!user)
    return (
      <main className="page narrow">
        <Empty title="登入後查看收藏" />
        <Link className="button" to="/login">
          登入 / 註冊
        </Link>
      </main>
    );
  return (
    <main className="page narrow">
      <div className="page-intro">
        <span className="eyebrow">SAVED FOR YOU</span>
        <h1>收藏課程</h1>
        <p>把喜歡的練習留在這裡。</p>
      </div>
      {query.isError && (
        <ErrorNote
          error={query.error}
          retry={
            /** 重新載入本區塊查詢，提供連線失敗後的重試入口。 */ () => {
              void query.refetch();
            }
          }
        />
      )}
      {sessions.isError && (
        <ErrorNote
          error={sessions.error}
          retry={
            /** 重新載入本區塊查詢，提供連線失敗後的重試入口。 */ () => {
              void sessions.refetch();
            }
          }
        />
      )}
      {query.data?.length ? (
        <div className="list-stack">
          {query.data.map(
            /** 將每個項目轉換為本次清單需要的資料或元件。 */ (f) => {
              const next = sessions.data?.find(
                /** 找出符合目前識別碼或條件的第一筆資料。 */ (s) => s.course_id === f.course_id,
              );
              return (
                <article className="favorite-row" key={f.id}>
                  {f.image_url && <img src={resolvePublicAssetUrl(f.image_url)} alt="" />}
                  <div>
                    <h3>{f.course_name}</h3>
                    <p>
                      {f.difficulty} · {f.default_duration_minutes} 分鐘 · {f.credit_cost} 堂
                    </p>
                    <p>{!f.is_active ? '課程目前已停用' : next ? '近期有開課' : '近期尚無場次'}</p>
                    {next && (
                      <Link
                        className="text-link"
                        to={`/classes?session=${encodeURIComponent(next.id)}`}
                      >
                        查看場次 →
                      </Link>
                    )}
                  </div>
                  <FavoriteButton courseId={f.course_id} />
                </article>
              );
            },
          )}
        </div>
      ) : (
        !query.isLoading &&
        !query.isError && (
          <Empty title="還沒有收藏課程" description="在課程頁點選愛心，就能把喜歡的課程存下來。" />
        )
      )}
    </main>
  );
}

import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useApp } from '../services/context';
import { useFavorites } from '../services/favorites';
import { api, qs } from '../services/api';
import { range, type Session } from '../services/types';
import { FavoriteButton } from '../components/FavoriteButton';
import { Empty, ErrorNote } from '../components/Ui';
export function Favorites() {
  const { studio, user } = useApp();
  const { query } = useFavorites();
  const dates = range(0, 90);
  const sessions = useQuery({
    queryKey: ['sessions', studio?.id, 'favorites'],
    queryFn: () => api<Session[]>(`/sessions?${qs({ studio_id: studio!.id, ...dates })}`),
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
      {query.isError && <ErrorNote error={query.error} retry={() => { void query.refetch(); }} />}
      {sessions.isError && <ErrorNote error={sessions.error} retry={() => { void sessions.refetch(); }} />}
      {query.data?.length ? (
        <div className="list-stack">
          {query.data.map((f) => {
            const next = sessions.data?.find((s) => s.course_id === f.course_id);
            return (
              <article className="favorite-row" key={f.id}>
                {f.image_url && <img src={f.image_url} alt="" />}
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
          })}
        </div>
      ) : (
        !query.isLoading && !query.isError && (
          <Empty title="還沒有收藏課程" description="在課程頁點選愛心，就能把喜歡的課程存下來。" />
        )
      )}
    </main>
  );
}

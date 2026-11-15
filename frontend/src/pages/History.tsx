import { Link } from 'react-router-dom';
import { useApp, useStudioQuery } from '../services/context';
import { dateTime } from '../services/types';
import { Empty, ErrorNote } from '../components/Ui';
export function History() {
  const { user } = useApp();
  const query = useStudioQuery<any[]>('bookings', !!user, { scope: 'mine' });
  if (!user)
    return (
      <main className="page narrow">
        <Empty title="登入後查看上課紀錄" />
        <Link className="button" to="/login">
          登入 / 註冊
        </Link>
      </main>
    );
  const records = (query.data || [])
    .filter(
      (b) =>
        b.status !== 'cancelled' &&
        b.class_sessions?.starts_at &&
        new Date(b.class_sessions.starts_at) <= new Date(),
    )
    .sort(
      (a, b) =>
        new Date(b.class_sessions.starts_at).getTime() -
        new Date(a.class_sessions.starts_at).getTime(),
    );
  return (
    <main className="page narrow">
      <div className="page-intro">
        <span className="eyebrow">YOUR JOURNEY</span>
        <h1>上課紀錄</h1>
        <p>每一步練習，都是屬於你的累積。</p>
      </div>
      {query.isError && <ErrorNote error={query.error} />}
      {records.length ? (
        <div className="list-stack">
          {records.map((b) => (
            <article className="booking-card" key={b.id}>
              <div>
                <h3>{b.class_sessions.courses?.name}</h3>
                <p>
                  {dateTime(b.class_sessions.starts_at)} · {b.class_sessions.teachers?.name}
                </p>
                <p>
                  {b.class_sessions.branches?.name} · {b.class_sessions.rooms?.name}
                </p>
                <small>
                  出勤：
                  {
                    (
                      { present: '已出席', absent: '缺席', unconfirmed: '未確認' } as Record<
                        string,
                        string
                      >
                    )[b.attendance?.status || 'unconfirmed']
                  }
                </small>
              </div>
            </article>
          ))}
        </div>
      ) : (
        !query.isLoading && <Empty title="尚無上課紀錄" description="完成的課程會出現在這裡。" />
      )}
      <p className="helper">顯示最近最多 200 筆預約中的歷史課程。</p>
    </main>
  );
}

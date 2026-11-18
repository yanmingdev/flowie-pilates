import { Link } from 'react-router-dom';
import { useApp } from '../../../shared/state/AppContext';
import { useStudioQuery } from '../../../shared/hooks/useStudioQuery';
import { dateTime } from '../../../shared/utils/date-time';
import { Empty } from '../../../shared/ui/Empty';
import { ErrorNote } from '../../../shared/ui/ErrorNote';

/** 呈現本人的上課紀錄與老師建議；維持現有角色與互動規則。 */ export function History() {
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
      /** 依目前條件保留符合的項目，不修改原始清單。 */ (b) =>
        b.status !== 'cancelled' &&
        b.class_sessions?.starts_at &&
        new Date(b.class_sessions.starts_at) <= new Date(),
    )
    .sort(
      /** 依既有比較規則決定清單順序。 */ (a, b) =>
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
      {records.length ? (
        <div className="list-stack">
          {records.map(
            /** 將每個項目轉換為本次清單需要的資料或元件。 */ (b) => (
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
                      )[b.attendance_status || 'unconfirmed']
                    }
                  </small>
                  <div className="teacher-feedback">
                    <strong>老師的課後建議</strong>
                    <p>{b.teacher_feedback || '老師尚未留下建議。'}</p>
                  </div>
                </div>
              </article>
            ),
          )}
        </div>
      ) : (
        !query.isLoading &&
        !query.isError && <Empty title="尚無上課紀錄" description="完成的課程會出現在這裡。" />
      )}
    </main>
  );
}

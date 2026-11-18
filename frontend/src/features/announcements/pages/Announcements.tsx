import { useStudioQuery } from '../../../shared/hooks/useStudioQuery';
import { Empty } from '../../../shared/ui/Empty';
import { ErrorNote } from '../../../shared/ui/ErrorNote';

/** 呈現有效公告；維持現有角色與互動規則。 */ export function Announcements() {
  const query = useStudioQuery<any[]>('announcements');
  const rows = (query.data || []).filter(
    /** 依目前條件保留符合的項目，不修改原始清單。 */ (a) =>
      a.is_active &&
      (!a.starts_at || new Date(a.starts_at) <= new Date()) &&
      (!a.ends_at || new Date(a.ends_at) > new Date()),
  );
  return (
    <main className="page narrow">
      <div className="page-intro">
        <span className="eyebrow">FLOWIE NOTES</span>
        <h1>最新消息</h1>
        <p>工作室的公告與提醒。</p>
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
      {rows.length ? (
        <div className="announcement-list">
          {rows.map(
            /** 將每個項目轉換為本次清單需要的資料或元件。 */ (a) => (
              <article key={a.id}>
                <span>NEWS</span>
                <div>
                  <strong>{a.title}</strong>
                  <p>{a.content}</p>
                </div>
              </article>
            ),
          )}
        </div>
      ) : (
        !query.isLoading && !query.isError && <Empty title="目前沒有新消息" />
      )}
    </main>
  );
}

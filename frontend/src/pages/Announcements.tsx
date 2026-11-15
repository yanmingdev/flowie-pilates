import { useStudioQuery } from '../services/context';
import { Empty, ErrorNote } from '../components/Ui';
export function Announcements() {
  const query = useStudioQuery<any[]>('announcements');
  const rows = (query.data || []).filter(
    (a) =>
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
      {query.isError && <ErrorNote error={query.error} />}
      {rows.length ? (
        <div className="announcement-list">
          {rows.map((a) => (
            <article key={a.id}>
              <span>NEWS</span>
              <div>
                <strong>{a.title}</strong>
                <p>{a.content}</p>
              </div>
            </article>
          ))}
        </div>
      ) : (
        !query.isLoading && <Empty title="目前沒有新消息" />
      )}
    </main>
  );
}

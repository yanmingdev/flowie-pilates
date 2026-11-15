import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, qs } from '../services/api';
import { useApp } from '../services/context';
import { dateTime } from '../services/types';
import { Empty, ErrorNote } from '../components/Ui';
type RecordRow = {
  session_id: string;
  branch_name: string;
  room_name: string;
  course_name: string;
  teacher_name: string;
  starts_at: string;
  ends_at: string;
  status: string;
  duration_minutes: number;
  booking_count: number;
  attendance_count: number;
};
export function TeachingRecords() {
  const { studio } = useApp();
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Taipei' }).format(new Date());
  const [from, setFrom] = useState(today.slice(0, 8) + '01');
  const [to, setTo] = useState(new Date(Date.now() + 86400000).toISOString().slice(0, 10));
  const [filter, setFilter] = useState('');
  const records = useQuery({
    queryKey: ['teaching-records', studio?.id, from, to],
    queryFn: () =>
      api<RecordRow[]>(
        `/teaching-records?${qs({ studio_id: studio!.id, from: new Date(`${from}T00:00:00+08:00`).toISOString(), to: new Date(`${to}T00:00:00+08:00`).toISOString() })}`,
      ),
    enabled: !!studio && !!from && !!to && from < to,
  });
  const visible = (records.data || []).filter((r) =>
    [r.branch_name, r.room_name, r.course_name, r.teacher_name, r.status].some((v) =>
      v.toLowerCase().includes(filter.toLowerCase()),
    ),
  );
  const minutes = visible
    .filter((r) => r.status !== 'cancelled')
    .reduce((n, r) => n + Number(r.duration_minutes), 0);
  return (
    <>
      <div className="admin-heading">
        <div>
          <h1>授課紀錄</h1>
          <p>管理員可查看品牌場次，老師只看得到自己的場次。</p>
        </div>
      </div>
      <section className="panel">
        <div className="filter-grid">
          <label>
            開始日期
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <label>
            結束日期（不含當日）
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </label>
          <label>
            搜尋分店、教室、課程、老師或狀態
            <input value={filter} onChange={(e) => setFilter(e.target.value)} />
          </label>
        </div>
        {from >= to && <p>結束日期必須晚於開始日期。</p>}
        {records.isError && <ErrorNote error={records.error} />}
        <p>
          顯示 {visible.length} 場；未取消場次合計 {Number((minutes / 60).toFixed(2))} 小時。
        </p>
        {records.data?.length === 1000 && (
          <p className="helper">最多顯示 1000 筆；請縮小日期區間以檢視完整紀錄。</p>
        )}
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>時間</th>
                <th>課程</th>
                <th>分店／教室</th>
                <th>老師</th>
                <th>時長</th>
                <th>報名／出席</th>
                <th>狀態</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => (
                <tr key={r.session_id}>
                  <td>
                    {dateTime(r.starts_at)} — {dateTime(r.ends_at)}
                  </td>
                  <td>{r.course_name}</td>
                  <td>
                    {r.branch_name}／{r.room_name}
                  </td>
                  <td>{r.teacher_name}</td>
                  <td>{r.duration_minutes} 分鐘</td>
                  <td>
                    {r.booking_count}／{r.attendance_count}
                  </td>
                  <td>{r.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!visible.length && !records.isLoading && <Empty title="此區間沒有符合的授課紀錄" />}
      </section>
    </>
  );
}

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ArrowUpRight, CalendarDays, Users, CheckCircle2, Activity } from 'lucide-react';
import { api, qs } from '../services/api';
import { useApp } from '../services/context';
import { dateTime } from '../services/types';
import { Empty, ErrorNote } from '../components/Ui';
function boundaries() {
  const now = new Date();
  const local = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Taipei' }));
  const day = `${local.getFullYear()}-${String(local.getMonth() + 1).padStart(2, '0')}-${String(local.getDate()).padStart(2, '0')}`;
  const today = new Date(`${day}T00:00:00+08:00`);
  const tomorrow = new Date(+today + 86400000);
  const week = new Date(+today - (local.getDay() || 7) * 86400000 + 86400000);
  const month = new Date(`${day.slice(0, 7)}-01T00:00:00+08:00`);
  return {
    today: today.toISOString(),
    tomorrow: tomorrow.toISOString(),
    week: week.toISOString(),
    weekEnd: new Date(+week + 7 * 86400000).toISOString(),
    month: month.toISOString(),
    monthEnd: new Date(
      Date.UTC(local.getFullYear(), local.getMonth() + 1, 1) - 8 * 3600000,
    ).toISOString(),
  };
}
export function AdminHome() {
  const { studio, me } = useApp();
  const isAdmin =
    me?.is_super_admin ||
    me?.memberships.some((m) => m.studio_id === studio?.id && m.role === 'admin' && m.is_active);
  const b = boundaries();
  const [fromDate, setFromDate] = useState(
    new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Taipei' }).format(new Date(b.today)),
  );
  const [toDate, setToDate] = useState(
    new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Taipei' }).format(new Date(b.tomorrow)),
  );
  const [branch, setBranch] = useState('');
  const [status, setStatus] = useState('');
  const branches = useQuery({
    queryKey: ['branches', studio?.id],
    queryFn: () => api<any[]>(`/branches?studio_id=${studio!.id}`),
    enabled: !!studio && !!isAdmin,
  });
  const custom = useQuery({
    queryKey: ['report-custom', studio?.id, fromDate, toDate, branch, status],
    queryFn: () =>
      api<any>(
        `/reports?${qs({ studio_id: studio!.id, from: new Date(`${fromDate}T00:00:00+08:00`).toISOString(), to: new Date(`${toDate}T00:00:00+08:00`).toISOString(), branch_id: branch, status })}`,
      ),
    enabled: !!studio && !!isAdmin && !!fromDate && !!toDate,
  });
  const metrics = useQuery({
    queryKey: ['report-metrics', studio?.id, fromDate, toDate, branch, status],
    queryFn: () =>
      api<any>(
        `/reports/metrics?${qs({ studio_id: studio!.id, from: new Date(`${fromDate}T00:00:00+08:00`).toISOString(), to: new Date(`${toDate}T00:00:00+08:00`).toISOString(), branch_id: branch, status })}`,
      ),
    enabled: !!studio && !!isAdmin && !!fromDate && !!toDate && fromDate < toDate,
  });
  const get = (from: string, to: string) =>
    api<any>(`/reports?${qs({ studio_id: studio!.id, from, to })}`);
  const today = useQuery({
    queryKey: ['report', studio?.id, 'today'],
    queryFn: () => get(b.today, b.tomorrow),
    enabled: !!studio && !!isAdmin,
  });
  const week = useQuery({
    queryKey: ['report', studio?.id, 'week'],
    queryFn: () => get(b.week, b.weekEnd),
    enabled: !!studio && !!isAdmin,
  });
  const month = useQuery({
    queryKey: ['report', studio?.id, 'month'],
    queryFn: () => get(b.month, b.monthEnd),
    enabled: !!studio && !!isAdmin,
  });
  const sessions = useQuery({
    queryKey: ['admin-recent', studio?.id],
    queryFn: () =>
      api<any[]>(
        `/sessions/manage?${qs({ studio_id: studio!.id, from: b.today, to: new Date(Date.now() + 14 * 86400000).toISOString() })}`,
      ),
    enabled: !!studio,
  });
  if (!isAdmin)
    return (
      <div>
        <div className="admin-heading">
          <div>
            <span className="eyebrow">TEACHER WORKSPACE</span>
            <h1>老師工作區</h1>
            <p>查看你的授課行事曆與學生名單。</p>
          </div>
        </div>
        <Link to="/admin/calendar" className="button">
          查看行事曆 <ArrowUpRight size={17} />
        </Link>
      </div>
    );
  const stats = [
    { label: '今日課程', value: today.data?.session_count, Icon: CalendarDays },
    { label: '今日預約', value: today.data?.booking_count, Icon: Users },
    { label: '今日出席', value: today.data?.attendance_count, Icon: CheckCircle2 },
    { label: '本週預約', value: week.data?.booking_count, Icon: Activity },
    { label: '本月預約', value: month.data?.booking_count, Icon: Users },
    { label: '今日取消', value: today.data?.cancellation_count, Icon: CalendarDays },
  ];
  const rates: Array<{ label: string; value: number | null }> = [
    { label: '課程預約率', value: metrics.data?.booking_rate ?? null },
    { label: '學生出席率', value: metrics.data?.attendance_rate ?? null },
    { label: '預約取消率', value: metrics.data?.cancellation_rate ?? null },
    { label: '教室使用率', value: metrics.data?.room_utilization_rate ?? null },
  ];
  return (
    <>
      <div className="admin-heading">
        <div>
          <span className="eyebrow">YOUR STUDIO AT A GLANCE</span>
          <h1>早安，{me?.profile?.full_name || 'Flowie'}。</h1>
          <p>今天，也讓美好的事慢慢發生。</p>
        </div>
        <Link className="button" to="/admin/calendar">
          查看行事曆 <ArrowUpRight size={17} />
        </Link>
      </div>
      {today.isError && <ErrorNote error={today.error} />}
      <div className="stats-grid">
        {stats.map(({ label, value, Icon }) => (
          <div className="stat-card" key={label}>
            <div>
              <span>{label}</span>
              <Icon size={18} />
            </div>
            <strong>{value ?? '—'}</strong>
            <small>由資料庫統計</small>
          </div>
        ))}
      </div>
      <section className="panel">
        <div className="section-heading compact">
          <div>
            <span className="eyebrow">YOUR REPORT</span>
            <h2>區間報表</h2>
          </div>
        </div>
        <div className="filter-grid">
          <label>
            開始日期
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          </label>
          <label>
            結束日期（不含當日）
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </label>
          <label>
            分店
            <select value={branch} onChange={(e) => setBranch(e.target.value)}>
              <option value="">全部分店</option>
              {branches.data?.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            場次狀態
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">全部狀態</option>
              <option value="scheduled">已排課</option>
              <option value="completed">已完成</option>
              <option value="cancelled">已取消</option>
            </select>
          </label>
        </div>
        {custom.isError && <ErrorNote error={custom.error} />}
        <div className="summary-row">
          <span>場次／有效預約／已出席／取消預約</span>
          <strong>
            {custom.data
              ? `${custom.data.session_count} / ${custom.data.booking_count} / ${custom.data.attendance_count} / ${custom.data.cancellation_count}`
              : '—'}
          </strong>
        </div>
        <p className="helper">
          取消數依取消時間，其餘依課程開始時間計算；待確認出勤{' '}
          {custom.data?.unconfirmed_attendance_count ?? '—'} 筆。
        </p>
      </section>
      <section className="panel">
        <h3>今日教室使用情況</h3>
        {Object.entries(
          (sessions.data || [])
            .filter(
              (s) => s.starts_at >= b.today && s.starts_at < b.tomorrow && s.status !== 'cancelled',
            )
            .reduce((acc: Record<string, number>, s) => {
              const key = `${s.branches?.name || '分店'} · ${s.rooms?.name || '教室'}`;
              acc[key] = (acc[key] || 0) + 1;
              return acc;
            }, {}),
        ).map(([name, count]) => (
          <div className="summary-row" key={name}>
            <span>{name}</span>
            <strong>{String(count)} 堂</strong>
          </div>
        ))}
        {!(sessions.data || []).some(
          (s) => s.starts_at >= b.today && s.starts_at < b.tomorrow && s.status !== 'cancelled',
        ) && <p className="helper">今日尚無教室場次。</p>}
      </section>
      <section className="panel">
        <div className="section-heading compact">
          <div>
            <span className="eyebrow">STUDIO INSIGHTS</span>
            <h2>區間營運指標</h2>
          </div>
          <Link to="/admin/teaching" className="text-link">
            查看授課紀錄 →
          </Link>
        </div>
        {metrics.isError && <ErrorNote error={metrics.error} />}
        <div className="stats-grid">
          {[
            ['老師授課場次', metrics.data?.teacher_session_count, '場'],
            ['課程預約率', metrics.data?.booking_rate, '%'],
            ['學生出席率', metrics.data?.attendance_rate, '%'],
            ['預約取消率', metrics.data?.cancellation_rate, '%'],
            ['教室使用率', metrics.data?.room_utilization_rate, '%'],
          ].map(([label, value, unit]) => (
            <div className="stat-card" key={String(label)}>
              <span>{label}</span>
              <strong>{value == null ? '—' : `${value}${unit}`}</strong>
            </div>
          ))}
        </div>
        <div className="rate-chart" aria-label="營運比率圖表">
          {rates.map(({ label, value }) => (
            <div className="rate-chart-row" key={label}>
              <span>{label}</span>
              <div className="rate-chart-track" aria-hidden="true">
                <div style={{ width: `${Math.min(100, Math.max(0, Number(value ?? 0)))}%` }} />
              </div>
              <strong>{value == null ? '—' : `${value}%`}</strong>
            </div>
          ))}
        </div>
        <p className="helper">
          預約率＝有效預約／場次名額；出席率＝已出席／已標記出席或缺席；取消率＝取消／全部預約。教室使用率＝排課時長／教室可使用時長，需先設定所有教室時段。資料依上方區間篩選。
        </p>
      </section>
      <section className="panel recent-panel">
        <div className="section-heading compact">
          <div>
            <span className="eyebrow">COMING UP</span>
            <h2>近期課程</h2>
          </div>
          <Link className="text-link" to="/admin/calendar">
            查看全部 →
          </Link>
        </div>
        {sessions.data?.length ? (
          sessions.data.slice(0, 7).map((s) => (
            <div className="recent-row" key={s.id}>
              <div className="recent-date">{new Date(s.starts_at).getDate()}</div>
              <div>
                <strong>{s.courses?.name || '課程'}</strong>
                <p>
                  {s.branches?.name} · {s.rooms?.name} · {s.teachers?.name}
                </p>
              </div>
              <span>{dateTime(s.starts_at)}</span>
            </div>
          ))
        ) : (
          <Empty title="近期尚無課程" />
        )}
      </section>
    </>
  );
}

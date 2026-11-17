import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp, useStudioQuery } from '../services/context';
import { dateTime } from '../services/types';
import { Empty, ErrorNote, Loading } from '../components/Ui';
const dayKey = (date: string) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(date));
const taipeiToday = () => dayKey(new Date().toISOString());
export function MyCalendar() {
  const { user } = useApp();
  const [today] = useState(taipeiToday);
  const [month, setMonth] = useState(() => today.slice(0, 7));
  const [selected, setSelected] = useState(today);
  const query = useStudioQuery<any[]>('bookings', !!user, { scope: 'mine' });
  const bookings = useMemo(() => (query.data || []).filter((b) => b.status === 'confirmed' && b.class_sessions?.starts_at), [query.data]);
  const counts = useMemo(() => { const result = new Map<string, number>(); bookings.forEach((b) => { const key = dayKey(b.class_sessions.starts_at); result.set(key, (result.get(key) || 0) + 1); }); return result; }, [bookings]);
  const [year, monthNumber] = month.split('-').map(Number);
  const first = new Date(Date.UTC(year, monthNumber - 1, 1));
  const offset = first.getUTCDay();
  const days = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const cells = Array.from({ length: Math.ceil((offset + days) / 7) * 7 }, (_, i) => i - offset + 1);
  function shift(by: number) { const next = new Date(Date.UTC(year, monthNumber - 1 + by, 1)); const value = `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, '0')}`; setMonth(value); setSelected(`${value}-01`); }
  if (!user) return <main className="page narrow"><Empty title="登入後查看個人行事曆" /><Link className="button" to="/login">登入 / 註冊</Link></main>;
  return <main className="page narrow">
    <div className="page-intro"><span className="eyebrow">YOUR CALENDAR</span><h1>行事曆</h1><p>有預約課程的日期會顯示標記。</p></div>
    {query.isError && <ErrorNote error={query.error} retry={() => { void query.refetch(); }} />}
    {query.isLoading ? <Loading /> : <section className="panel my-calendar" aria-label="我的預約月曆">
      <div className="calendar-month"><button type="button" aria-label="上個月" onClick={() => shift(-1)}>‹</button><h2>{year} 年 {monthNumber} 月</h2><button type="button" aria-label="下個月" onClick={() => shift(1)}>›</button></div>
      <div className="calendar-days">{['日','一','二','三','四','五','六'].map((d) => <strong key={d}>{d}</strong>)}
        {cells.map((d, i) => { const key = `${month}-${String(d).padStart(2,'0')}`; const count = counts.get(key) || 0; return d < 1 || d > days ? <span key={i} aria-hidden="true" /> : <button key={i} type="button" className={`${key === selected ? 'selected ' : ''}${key === today ? 'today' : ''}`} onClick={() => setSelected(key)} aria-label={`${key}，${count} 堂預約`} aria-pressed={key === selected}><span>{d}</span>{count > 0 && <i aria-hidden="true" />}</button>; })}</div>
      <div className="calendar-agenda"><h3>{selected} 的課程</h3>{bookings.filter((b) => dayKey(b.class_sessions.starts_at) === selected).map((b) => <article key={b.id}><strong>{b.class_sessions.courses?.name || '課程'}</strong><p>{dateTime(b.class_sessions.starts_at)} · {b.class_sessions.teachers?.name || '老師'} · {b.class_sessions.branches?.name || ''}</p></article>)}{!counts.get(selected) && <p>這天沒有預約課程。</p>}<Link className="text-link" to="/classes">探索課程 →</Link></div>
    </section>}
  </main>;
}

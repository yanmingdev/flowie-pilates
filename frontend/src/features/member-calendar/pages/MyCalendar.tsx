import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../../../shared/state/AppContext';
import { useStudioQuery } from '../../../shared/hooks/useStudioQuery';
import { dateTime } from '../../../shared/utils/date-time';
import { Empty } from '../../../shared/ui/Empty';
import { ErrorNote } from '../../../shared/ui/ErrorNote';
import { Loading } from '../../../shared/ui/Loading';
const dayKey = /** 把時間轉成台灣時區的年月日鍵值，供月曆日期歸組。 */ (date: string) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(date));
const taipeiToday = /** 取得台灣時區的今天，避免跨日時採用瀏覽器所在地日期。 */ () =>
  dayKey(new Date().toISOString());

/** 呈現會員月曆與當日預約；維持現有角色與互動規則。 */ export function MyCalendar() {
  const { user } = useApp();
  const [today] = useState(taipeiToday);
  const [month, setMonth] = useState(
    /** 建立此元件的初始狀態，避免每次重新渲染重建。 */ () => today.slice(0, 7),
  );
  const [selected, setSelected] = useState(today);
  const query = useStudioQuery<any[]>('bookings', !!user, { scope: 'mine' });
  const bookings = useMemo(
    /** 依相依值計算可重用的衍生資料，避免重複計算。 */ () =>
      (query.data || []).filter(
        /** 依目前條件保留符合的項目，不修改原始清單。 */ (b) =>
          b.status === 'confirmed' && b.class_sessions?.starts_at,
      ),
    [query.data],
  );
  const counts = useMemo(
    /** 依相依值計算可重用的衍生資料，避免重複計算。 */ () => {
      const result = new Map<string, number>();
      bookings.forEach(
        /** 依台灣日期歸組預約或產生月曆格子，保留日期及場次關聯。 */ (b) => {
          const key = dayKey(b.class_sessions.starts_at);
          result.set(key, (result.get(key) || 0) + 1);
        },
      );
      return result;
    },
    [bookings],
  );
  const [year, monthNumber] = month.split('-').map(Number);
  const first = new Date(Date.UTC(year, monthNumber - 1, 1));
  const offset = first.getUTCDay();
  const days = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const cells = Array.from(
    {
      length: Math.ceil((offset + days) / 7) * 7,
    },
    /** 依台灣日期歸組預約或產生月曆格子，保留日期及場次關聯。 */ (_, i) => i - offset + 1,
  );

  /** 切換顯示月份並重設目前選取日期。 */ function shift(by: number) {
    const next = new Date(Date.UTC(year, monthNumber - 1 + by, 1));
    const value = `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, '0')}`;
    setMonth(value);
    setSelected(`${value}-01`);
  }
  if (!user)
    return (
      <main className="page narrow">
        <Empty title="登入後查看個人行事曆" />
        <Link className="button" to="/login">
          登入 / 註冊
        </Link>
      </main>
    );
  return (
    <main className="page narrow">
      <div className="page-intro">
        <span className="eyebrow">YOUR CALENDAR</span>
        <h1>行事曆</h1>
        <p>有預約課程的日期會顯示標記。</p>
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
      {query.isLoading ? (
        <Loading />
      ) : (
        <section className="panel my-calendar" aria-label="我的預約月曆">
          <div className="calendar-month">
            <button
              type="button"
              aria-label="上個月"
              onClick={/** 處理目前按鈕操作，依元件狀態執行對應動作。 */ () => shift(-1)}
            >
              ‹
            </button>
            <h2>
              {year} 年 {monthNumber} 月
            </h2>
            <button
              type="button"
              aria-label="下個月"
              onClick={/** 處理目前按鈕操作，依元件狀態執行對應動作。 */ () => shift(1)}
            >
              ›
            </button>
          </div>
          <div className="calendar-days">
            {['日', '一', '二', '三', '四', '五', '六'].map(
              /** 將每個項目轉換為本次清單需要的資料或元件。 */ (d) => (
                <strong key={d}>{d}</strong>
              ),
            )}
            {cells.map(
              /** 將每個項目轉換為本次清單需要的資料或元件。 */ (d, i) => {
                const key = `${month}-${String(d).padStart(2, '0')}`;
                const count = counts.get(key) || 0;
                return d < 1 || d > days ? (
                  <span key={i} aria-hidden="true" />
                ) : (
                  <button
                    key={i}
                    type="button"
                    className={`${key === selected ? 'selected ' : ''}${key === today ? 'today' : ''}`}
                    onClick={
                      /** 處理目前按鈕操作，依元件狀態執行對應動作。 */ () => setSelected(key)
                    }
                    aria-label={`${key}，${count} 堂預約`}
                    aria-pressed={key === selected}
                  >
                    <span>{d}</span>
                    {count > 0 && <i aria-hidden="true" />}
                  </button>
                );
              },
            )}
          </div>
          <div className="calendar-agenda">
            <h3>{selected} 的課程</h3>
            {bookings
              .filter(
                /** 依目前條件保留符合的項目，不修改原始清單。 */ (b) =>
                  dayKey(b.class_sessions.starts_at) === selected,
              )
              .map(
                /** 將每個項目轉換為本次清單需要的資料或元件。 */ (b) => (
                  <article key={b.id}>
                    <strong>{b.class_sessions.courses?.name || '課程'}</strong>
                    <p>
                      {dateTime(b.class_sessions.starts_at)} ·{' '}
                      {b.class_sessions.teachers?.name || '老師'} ·{' '}
                      {b.class_sessions.branches?.name || ''}
                    </p>
                  </article>
                ),
              )}
            {!counts.get(selected) && <p>這天沒有預約課程。</p>}
            <Link className="text-link" to="/classes">
              探索課程 →
            </Link>
          </div>
        </section>
      )}
    </main>
  );
}

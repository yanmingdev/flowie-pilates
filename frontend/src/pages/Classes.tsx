import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { api, post, qs } from '../services/api';
import { useApp, useStudioQuery } from '../services/context';
import { dateTime, range, shortTime, type Session } from '../services/types';
import { ClassCard, Empty, ErrorNote, Heading, Loading, Modal } from '../components/Ui';
export function Classes() {
  const { studio, user, me, online } = useApp();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const qc = useQueryClient();
  const [branch, setBranch] = useState('');
  const [category, setCategory] = useState('');
  const [teacher, setTeacher] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [seatsOnly, setSeatsOnly] = useState(false);
  const [selected, setSelected] = useState<Session | null>(null);
  const [booked, setBooked] = useState<any>(null);
  const key = useRef('');
  const branches = useStudioQuery<any[]>('branches');
  const categories = useStudioQuery<any[]>('course-categories');
  const bookingSettings = useStudioQuery<any[]>('site-settings');
  const dates = range(0, 90);
  const sessions = useQuery({
    queryKey: ['sessions', studio?.id, 'explore'],
    queryFn: () => api<Session[]>(`/sessions?${qs({ studio_id: studio!.id, ...dates })}`),
    enabled: !!studio,
    refetchOnWindowFocus: true,
  });
  const teachers = useMemo(
    () =>
      Array.from(
        new Map((sessions.data || []).map((s) => [s.teacher_id, s.teacher_name])).entries(),
      ),
    [sessions.data],
  );
  const filtered = (sessions.data || []).filter(
    (s) =>
      (!search ||
        `${s.course_name} ${s.teacher_name}`.toLowerCase().includes(search.toLowerCase())) &&
      (!branch || s.branch_id === branch) &&
      (!category || s.category_id === category) &&
      (!teacher || s.teacher_id === teacher) &&
      (!date ||
        new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Taipei' }).format(
          new Date(s.starts_at),
        ) === date) &&
      (!time ||
        (() => {
          const h = Number(
            new Intl.DateTimeFormat('en-GB', {
              timeZone: 'Asia/Taipei',
              hour: '2-digit',
              hourCycle: 'h23',
            }).format(new Date(s.starts_at)),
          );
          return time === 'morning' ? h < 12 : time === 'afternoon' ? h >= 12 && h < 18 : h >= 18;
        })()) &&
      (!seatsOnly || s.capacity > Number(s.booked_count)),
  );
  const booking = useMutation({
    mutationFn: async (s: Session) => {
      if (!user) throw new Error('請先登入後再預約。');
      if (!online) throw new Error('目前離線，請連線後再預約。');
      if (!me?.profile.is_active || !me.profile.display_name) throw new Error('請先至「我的資料」填寫姓名，並確認帳號已啟用。');
      return post('/bookings', { session_id: s.id, idempotency_key: key.current });
    },
    onSuccess: (result) => {
      setBooked(result);
      qc.invalidateQueries({ queryKey: ['sessions'] });
      qc.invalidateQueries({ queryKey: ['student-packages'] });
      qc.invalidateQueries({ queryKey: ['bookings'] });
    },
  });
  const choose = (s: Session) => {
    key.current = crypto.randomUUID();
    setBooked(null);
    booking.reset();
    setSelected(s);
  };
  const requestedSession = params.get('session');
  useEffect(() => {
    if (!requestedSession || !sessions.data) return;
    const match = sessions.data.find((s) => s.id === requestedSession);
    if (match) {
      key.current = crypto.randomUUID();
      setBooked(null);
      setSelected(match);
    }
    const next = new URLSearchParams(params);
    next.delete('session');
    setParams(next, { replace: true });
  }, [requestedSession, sessions.data, params, setParams]);
  return (
    <main className="page">
      <div className="page-intro">
        <span className="eyebrow">FIND YOUR PRACTICE</span>
        <h1>為自己，留一段時間。</h1>
        <p>選擇適合今天的你，一起找到流動的節奏。</p>
      </div>
      <div className="steps">
        <div className="step active">
          <span>01</span> 選擇條件
        </div>
        <div className="step">
          <span>02</span> 選擇場次
        </div>
        <div className="step">
          <span>03</span> 確認預約
        </div>
      </div>
      <section className="filter-panel">
        <div className="filter-title">
          探索課程 <small>找到適合你的練習</small>
        </div>
        <div className="filter-grid">
          <label>
            搜尋課程或老師
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="輸入課程或老師名稱"
            />
          </label>
          <label>
            分店
            <select value={branch} onChange={(e) => setBranch(e.target.value)}>
              <option value="">全部分店</option>
              {branches.data?.map((b) => (
                <option value={b.id} key={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            課程類型
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">全部課程</option>
              {categories.data?.map((c) => (
                <option value={c.id} key={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            老師
            <select value={teacher} onChange={(e) => setTeacher(e.target.value)}>
              <option value="">全部老師</option>
              {teachers.map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <label>
            日期
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
          <label>
            時段
            <select value={time} onChange={(e) => setTime(e.target.value)}>
              <option value="">全部時段</option>
              <option value="morning">上午</option>
              <option value="afternoon">下午</option>
              <option value="evening">晚上</option>
            </select>
          </label>
          <label className="check-label">
            <input
              type="checkbox"
              checked={seatsOnly}
              onChange={(e) => setSeatsOnly(e.target.checked)}
            />
            只顯示有名額
          </label>
        </div>
      </section>
      <section className="content-section">
        <Heading
          eyebrow="UPCOMING CLASSES"
          title="近期課程"
          description={`共 ${filtered.length} 個場次`}
        />
        {sessions.isLoading ? (
          <Loading />
        ) : sessions.isError ? (
          <ErrorNote error={sessions.error} retry={() => { void sessions.refetch(); }} />
        ) : filtered.length ? (
          <div className="cards-grid">
            {filtered.map((s) => (
              <ClassCard key={s.id} session={s} onSelect={choose} />
            ))}
          </div>
        ) : (
          <Empty title="找不到符合的課程" description="試著調整日期或篩選條件。" />
        )}
      </section>
      {selected && (
        <Modal title={booked ? '預約成功' : '確認預約'} onClose={() => setSelected(null)}>
          {booked ? (
            <div className="booking-success">
              <CheckCircle2 size={42} />
              <h3>已為你保留這段時間。</h3>
              <p>
                {selected.course_name} · {dateTime(selected.starts_at)}
              </p>
              <p>
                {selected.branch_name} · {selected.room_name} · {selected.teacher_name} ·{' '}
                {selected.credit_cost} 堂
              </p>
              <p>狀態：已確認 · 預約編號：{booked.id}</p>
              <p>取消期限：{dateTime(booked.cancellation_deadline_at)}</p>
              <button className="button" onClick={() => navigate('/bookings')}>
                查看我的預約
              </button>
            </div>
          ) : (
            <>
              <div className="modal-course">
                <span className="eyebrow">YOUR NEXT FLOW</span>
                <h3>{selected.course_name}</h3>
                {selected.course_image && (
                  <img className="detail-image" src={selected.course_image} alt="" />
                )}
                {selected.course_description && <p>{selected.course_description}</p>}
                <p>
                  {selected.duration_minutes} 分鐘 · {selected.difficulty}
                </p>
                <p>
                  {dateTime(selected.starts_at)} — {shortTime(selected.ends_at)}
                </p>
                <p>
                  {selected.branch_name}・{selected.room_name}・{selected.teacher_name}
                </p>
              </div>
              <div className="summary-row">
                <span>消耗堂數</span>
                <strong>{selected.credit_cost} 堂</strong>
              </div>
              <div className="summary-row">
                <span>剩餘名額</span>
                <strong>{Math.max(0, selected.capacity - Number(selected.booked_count))} 位</strong>
              </div>
              <div className="summary-row">
                <span>預約截止</span>
                <strong>{dateTime(selected.booking_closes_at || selected.starts_at)}</strong>
              </div>
              <div className="summary-row">
                <span>取消期限</span>
                <strong>
                  {selected.cancellation_deadline
                    ? dateTime(selected.cancellation_deadline)
                    : bookingSettings.data
                      ? dateTime(
                          new Date(
                            new Date(selected.starts_at).getTime() -
                              Number(bookingSettings.data[0]?.cancellation_hours ?? 12) * 3600000,
                          ).toISOString(),
                        )
                      : '載入中'}
                </strong>
              </div>
              <p className="helper">名額、堂數與取消期限將於送出時重新確認。</p>
              {booking.isError && <ErrorNote error={booking.error} />}
              <button
                className="button button-full"
                disabled={
                  booking.isPending || !online || selected.capacity <= Number(selected.booked_count) ||
                  new Date(selected.booking_closes_at || selected.starts_at).getTime() <= Date.now()
                }
                onClick={() => (user ? booking.mutate(selected) : navigate('/login'))}
              >
                {new Date(selected.booking_closes_at || selected.starts_at).getTime() <= Date.now()
                  ? '已截止預約'
                  : !user
                    ? '登入後預約'
                    : booking.isPending
                      ? '預約處理中…'
                      : '確認預約'}{' '}
                <ArrowRight size={17} />
              </button>
            </>
          )}
        </Modal>
      )}
    </main>
  );
}

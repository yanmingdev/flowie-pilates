import { useMemo, useState } from 'react';
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import zhTw from '@fullcalendar/core/locales/zh-tw';
import { Plus } from 'lucide-react';
import { api, apiAll, patch, post, qs } from '../services/api';
import { useApp } from '../services/context';
import { dateTime } from '../services/types';
import { Empty, ErrorNote, Modal } from '../components/Ui';
function localInput(v: string | Date) {
  const d = new Date(v);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}
function SessionForm({
  session,
  start,
  onClose,
}: {
  session: any;
  start?: string;
  onClose: () => void;
}) {
  const { studio } = useApp();
  const qc = useQueryClient();
  const names = ['branches', 'rooms', 'courses', 'teachers', 'teacher-branches', 'teacher-courses'];
  const data = useQueries({
    queries: names.map((n) => ({
      queryKey: [n, studio?.id],
      queryFn: () => apiAll<any>(n, studio!.id),
      enabled: !!studio,
    })),
  });
  const get = (name: string) => data[names.indexOf(name)]?.data || [];
  const [applyFuture, setApplyFuture] = useState(false);
  const [f, setF] = useState(() => ({
    branch_id: session?.branch_id || '',
    room_id: session?.room_id || '',
    course_id: session?.course_id || '',
    teacher_id: session?.teacher_id || '',
    starts_at: session ? localInput(session.starts_at) : start ? localInput(start) : '',
    ends_at: session
      ? localInput(session.ends_at)
      : start
        ? localInput(new Date(+new Date(start) + 3600000))
        : '',
    capacity: session?.capacity || 8,
    booking_opens_at: session?.booking_opens_at ? localInput(session.booking_opens_at) : '',
    booking_closes_at: session?.booking_closes_at ? localInput(session.booking_closes_at) : '',
    deadline: session?.cancellation_deadline ? localInput(session.cancellation_deadline) : '',
    until_date: '',
  }));
  const filteredRooms = get('rooms').filter((r: any) => r.branch_id === f.branch_id && r.is_active);
  const teacherIds = get('teacher-branches')
    .filter((r: any) => r.branch_id === f.branch_id)
    .map((r: any) => r.teacher_id);
  const qualified = get('teacher-courses')
    .filter((r: any) => r.course_id === f.course_id)
    .map((r: any) => r.teacher_id);
  const teachers = get('teachers').filter(
    (t: any) => teacherIds.includes(t.id) && qualified.includes(t.id) && t.is_active,
  );
  const mutation = useMutation({
    mutationFn: () => {
      const body = {
        studio_id: studio!.id,
        branch_id: f.branch_id,
        room_id: f.room_id,
        course_id: f.course_id,
        teacher_id: f.teacher_id,
        starts_at: new Date(f.starts_at).toISOString(),
        ends_at: new Date(f.ends_at).toISOString(),
        capacity: Number(f.capacity),
        booking_opens_at: f.booking_opens_at ? new Date(f.booking_opens_at).toISOString() : null,
        booking_closes_at: f.booking_closes_at ? new Date(f.booking_closes_at).toISOString() : null,
        cancellation_deadline: f.deadline ? new Date(f.deadline).toISOString() : null,
        until_date: f.until_date || null,
      };
      return session
        ? patch(`/sessions/${session.id}${applyFuture ? '/future' : ''}`, body)
        : post('/sessions', body);
    },
    onSuccess: () => {
      qc.invalidateQueries();
      onClose();
    },
  });
  return (
    <form
      className="form-stack"
      onSubmit={(e) => {
        e.preventDefault();
        mutation.mutate();
      }}
    >
      <div className="form-two">
        <label>
          分店
          <select
            required
            value={f.branch_id}
            onChange={(e) => setF({ ...f, branch_id: e.target.value, room_id: '', teacher_id: '' })}
          >
            <option value="">請選擇</option>
            {get('branches')
              .filter((x: any) => x.is_active)
              .map((x: any) => (
                <option key={x.id} value={x.id}>
                  {x.name}
                </option>
              ))}
          </select>
        </label>
        <label>
          教室
          <select
            required
            value={f.room_id}
            onChange={(e) => setF({ ...f, room_id: e.target.value })}
          >
            <option value="">請選擇</option>
            {filteredRooms.map((x: any) => (
              <option key={x.id} value={x.id}>
                {x.name}（{x.capacity} 人）
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="form-two">
        <label>
          課程
          <select
            required
            value={f.course_id}
            onChange={(e) => setF({ ...f, course_id: e.target.value, teacher_id: '' })}
          >
            <option value="">請選擇</option>
            {get('courses')
              .filter((x: any) => x.is_active)
              .map((x: any) => (
                <option key={x.id} value={x.id}>
                  {x.name}
                </option>
              ))}
          </select>
        </label>
        <label>
          老師
          <select
            required
            value={f.teacher_id}
            onChange={(e) => setF({ ...f, teacher_id: e.target.value })}
          >
            <option value="">請選擇符合資格的老師</option>
            {teachers.map((x: any) => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="helper">老師需先在資料管理中設定分店、課程資格與可授課時間。</p>
      <div className="form-two">
        <label>
          開始時間
          <input
            required
            type="datetime-local"
            value={f.starts_at}
            onChange={(e) => setF({ ...f, starts_at: e.target.value })}
          />
        </label>
        <label>
          結束時間
          <input
            required
            type="datetime-local"
            value={f.ends_at}
            onChange={(e) => setF({ ...f, ends_at: e.target.value })}
          />
        </label>
      </div>
      <div className="form-two">
        <label>
          人數上限
          <input
            required
            min="1"
            type="number"
            value={f.capacity}
            onChange={(e) => setF({ ...f, capacity: Number(e.target.value) })}
          />
        </label>
        <label>
          預約開放時間
          <input
            type="datetime-local"
            value={f.booking_opens_at}
            onChange={(e) => setF({ ...f, booking_opens_at: e.target.value })}
          />
        </label>
      </div>
      <label>
        預約截止時間（留空則開課時截止）
        <input
          type="datetime-local"
          value={f.booking_closes_at}
          onChange={(e) => setF({ ...f, booking_closes_at: e.target.value })}
        />
      </label>
      <label>
        本場次取消期限（選填）
        <input
          type="datetime-local"
          value={f.deadline}
          onChange={(e) => setF({ ...f, deadline: e.target.value })}
        />
      </label>
      {session?.schedule_rule_id && (
        <label className="check-label">
          <input
            type="checkbox"
            checked={applyFuture}
            onChange={(e) => setApplyFuture(e.target.checked)}
          />
          同時修改此規則的未來場次
        </label>
      )}
      {!session && (
        <label>
          每週重複至（留空為單次）
          <input
            type="date"
            value={f.until_date}
            onChange={(e) => setF({ ...f, until_date: e.target.value })}
          />
        </label>
      )}
      {f.starts_at && (
        <div className="summary-row">
          <span>場次預覽</span>
          <strong>
            {dateTime(new Date(f.starts_at).toISOString())}
            {f.until_date ? ` · 每週至 ${f.until_date}` : ''}
          </strong>
        </div>
      )}
      {mutation.isError && <ErrorNote error={mutation.error} />}
      <button className="button button-full" disabled={mutation.isPending}>
        {mutation.isPending ? '儲存中…' : '儲存場次'}
      </button>
    </form>
  );
}
function SessionDetails({
  session,
  isAdmin,
  onEdit,
  onClose,
}: {
  session: any;
  isAdmin: boolean;
  onEdit: () => void;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [confirm, setConfirm] = useState(false);
  const roster = useQuery({
    queryKey: ['roster', session.id],
    queryFn: () => api<any[]>(`/sessions/${session.id}/students`),
  });
  const mark = useMutation({
    mutationFn: ({ booking_id, status }: { booking_id: string; status: string }) =>
      post('/attendance', { booking_id, status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['roster', session.id] }),
  });
  const cancel = useMutation({
    mutationFn: (future: boolean) =>
      post(`/sessions/${session.id}/${future ? 'cancel-future' : 'cancel'}`),
    onSuccess: () => {
      qc.invalidateQueries();
      onClose();
    },
  });
  return (
    <>
      <div className="modal-course">
        <span className="eyebrow">CLASS DETAILS</span>
        <h3>{session.courses?.name}</h3>
        <p>
          {dateTime(session.starts_at)} · {session.branches?.name} · {session.rooms?.name}
        </p>
        <p>
          老師 {session.teachers?.name} · 人數上限 {session.capacity} · {session.status}
        </p>
      </div>
      <h3>學生名單與出勤</h3>
      {roster.isError && <ErrorNote error={roster.error} />}{' '}
      {roster.data?.length ? (
        roster.data.map((s) => (
          <div className="roster-row" key={s.booking_id}>
            <span>{s.student_name || '未填姓名'}</span>
            <select
              aria-label={`${s.student_name}的出勤`}
              disabled={mark.isPending}
              value={s.attendance_status}
              onChange={(e) => mark.mutate({ booking_id: s.booking_id, status: e.target.value })}
            >
              <option value="unconfirmed">未確認</option>
              <option value="present">已出席</option>
              <option value="absent">缺席</option>
            </select>
          </div>
        ))
      ) : (
        <Empty title="目前沒有學生預約" />
      )}
      {mark.isError && <ErrorNote error={mark.error} />}{' '}
      {cancel.isError && <ErrorNote error={cancel.error} />}{' '}
      {isAdmin && session.status === 'scheduled' && (
        <div className="button-row">
          <button className="button secondary" onClick={onEdit}>
            修改場次
          </button>
          {confirm ? (
            <button
              className="button danger"
              disabled={cancel.isPending}
              onClick={() => cancel.mutate(false)}
            >
              確認取消本場並退堂
            </button>
          ) : (
            <button className="button secondary" onClick={() => setConfirm(true)}>
              取消場次
            </button>
          )}
          {confirm && session.schedule_rule_id && (
            <button
              className="button danger"
              disabled={cancel.isPending}
              onClick={() => cancel.mutate(true)}
            >
              取消此後場次並退堂
            </button>
          )}
        </div>
      )}
    </>
  );
}
export function Calendar() {
  const { studio, me } = useApp();
  const admin = !!(
    me?.is_super_admin ||
    me?.memberships.some((m) => m.studio_id === studio?.id && m.role === 'admin' && m.is_active)
  );
  const [dates, setDates] = useState({
    from: new Date(Date.now() - 30 * 86400000).toISOString(),
    to: new Date(Date.now() + 60 * 86400000).toISOString(),
  });
  const [branch, setBranch] = useState('');
  const [room, setRoom] = useState('');
  const [teacher, setTeacher] = useState('');
  const [course, setCourse] = useState('');
  const [status, setStatus] = useState('');
  const [dialog, setDialog] = useState<'create' | 'details' | 'edit' | null>(null);
  const [selected, setSelected] = useState<any>(null);
  const [start, setStart] = useState<string>();
  const sessions = useQuery({
    queryKey: ['admin-sessions', studio?.id, dates],
    queryFn: () => api<any[]>(`/sessions/manage?${qs({ studio_id: studio!.id, ...dates })}`),
    enabled: !!studio,
  });
  const rows = useMemo(
    () =>
      (sessions.data || []).filter(
        (s) =>
          (!branch || s.branch_id === branch) &&
          (!room || s.room_id === room) &&
          (!teacher || s.teacher_id === teacher) &&
          (!course || s.course_id === course) &&
          (!status || s.status === status),
      ),
    [sessions.data, branch, room, teacher, course, status],
  );
  const unique = (key: string, nested: string) =>
    Array.from(
      new Map((sessions.data || []).map((s: any) => [s[key], s[nested]?.name || s[key]])).entries(),
    );
  return (
    <>
      <div className="admin-heading">
        <div>
          <span className="eyebrow">SCHEDULE &amp; SPACE</span>
          <h1>課程行事曆</h1>
          <p>一目了然，安排每一次練習。</p>
        </div>
        {admin && (
          <button
            className="button"
            onClick={() => {
              setStart(undefined);
              setSelected(null);
              setDialog('create');
            }}
          >
            <Plus size={17} />
            新增場次
          </button>
        )}
      </div>
      <div className="panel calendar-panel">
        <div className="calendar-filters">
          {[
            ['分店', branch, setBranch, unique('branch_id', 'branches')],
            ['教室', room, setRoom, unique('room_id', 'rooms')],
            ['老師', teacher, setTeacher, unique('teacher_id', 'teachers')],
            ['課程', course, setCourse, unique('course_id', 'courses')],
            [
              '狀態',
              status,
              setStatus,
              [
                ['scheduled', '已排課'],
                ['cancelled', '已取消'],
                ['completed', '已完成'],
              ],
            ],
          ].map(([label, value, setter, opts]: any) => (
            <label key={label}>
              {label}
              <select value={value} onChange={(e) => setter(e.target.value)}>
                <option value="">全部</option>
                {opts.map(([id, name]: [string, string]) => (
                  <option key={id} value={id}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
        {sessions.isError && <ErrorNote error={sessions.error} />}
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
          locale={zhTw}
          initialView={
            window.matchMedia('(max-width: 700px)').matches ? 'listWeek' : 'dayGridMonth'
          }
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek',
          }}
          height="auto"
          nowIndicator
          events={rows.map((s) => ({
            id: s.id,
            title: `${s.courses?.name || '課程'} · ${s.rooms?.name || ''}`,
            start: s.starts_at,
            end: s.ends_at,
            color:
              s.status === 'cancelled'
                ? '#a9a5a0'
                : s.status === 'completed'
                  ? '#b49c92'
                  : '#849A86',
          }))}
          datesSet={(arg) => {
            const next = { from: arg.start.toISOString(), to: arg.end.toISOString() };
            setDates((old) => (old.from === next.from && old.to === next.to ? old : next));
          }}
          dateClick={(arg) => {
            if (admin) {
              setStart(arg.dateStr);
              setSelected(null);
              setDialog('create');
            }
          }}
          eventClick={(arg) => {
            setSelected(rows.find((s) => s.id === arg.event.id));
            setDialog('details');
          }}
        />
      </div>
      {dialog && (
        <Modal
          title={dialog === 'details' ? '場次詳情' : dialog === 'edit' ? '修改場次' : '新增場次'}
          onClose={() => setDialog(null)}
        >
          {dialog === 'details' && selected ? (
            <SessionDetails
              session={selected}
              isAdmin={admin}
              onEdit={() => setDialog('edit')}
              onClose={() => setDialog(null)}
            />
          ) : (
            <SessionForm
              session={dialog === 'edit' ? selected : null}
              start={start}
              onClose={() => setDialog(null)}
            />
          )}
        </Modal>
      )}
    </>
  );
}

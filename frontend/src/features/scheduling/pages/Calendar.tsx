import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import luxonPlugin from '@fullcalendar/luxon3';
import zhTw from '@fullcalendar/core/locales/zh-tw';
import { Plus } from 'lucide-react';
import { api, qs } from '../../../shared/api/http-client';
import { useApp } from '../../../shared/state/AppContext';
import { ErrorNote } from '../../../shared/ui/ErrorNote';
import { Modal } from '../../../shared/ui/Modal';
import { SessionDetails } from '../components/SessionDetails';
import { SessionForm } from '../components/SessionForm';

/** 呈現排課行事曆、場次明細與點名入口；維持現有角色與互動規則。 */ export function Calendar() {
  const { studio, me } = useApp();
  const admin = !!me?.profile.is_admin && !!me.profile.is_active;
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

    queryFn: /** 載入目前查詢需要的資料；查詢狀態與錯誤交由 React Query 管理。 */ () =>
      api<any[]>(`/sessions/manage?${qs({ studio_id: studio!.id, ...dates })}`),
    enabled: !!studio,
  });
  const rows = useMemo(
    /** 依相依值計算可重用的衍生資料，避免重複計算。 */ () =>
      (sessions.data || []).filter(
        /** 依目前條件保留符合的項目，不修改原始清單。 */ (s) =>
          (!branch || s.branch_id === branch) &&
          (!room || s.room_id === room) &&
          (!teacher || s.teacher_id === teacher) &&
          (!course || s.course_id === course) &&
          (!status || s.status === status),
      ),
    [sessions.data, branch, room, teacher, course, status],
  );
  const unique = /** 去除重複的篩選選項並保留顯示名稱。 */ (key: string, nested: string) =>
    Array.from(
      new Map(
        (sessions.data || []).map(
          /** 將每個項目轉換為本次清單需要的資料或元件。 */ (s: any) => [
            s[key],
            s[nested]?.name || s[key],
          ],
        ),
      ).entries(),
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
            onClick={
              /** 處理目前按鈕操作，依元件狀態執行對應動作。 */ () => {
                setStart(undefined);
                setSelected(null);
                setDialog('create');
              }
            }
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
          ].map(
            /** 將每個項目轉換為本次清單需要的資料或元件。 */ ([
              label,
              value,
              setter,
              opts,
            ]: any) => (
              <label key={label}>
                {label}
                <select
                  value={value}
                  onChange={/** 同步輸入值與對應的表單狀態。 */ (e) => setter(e.target.value)}
                >
                  <option value="">全部</option>
                  {opts.map(
                    /** 將每個項目轉換為本次清單需要的資料或元件。 */ ([id, name]: [
                      string,
                      string,
                    ]) => (
                      <option key={id} value={id}>
                        {name}
                      </option>
                    ),
                  )}
                </select>
              </label>
            ),
          )}
        </div>
        {sessions.isError && <ErrorNote error={sessions.error} />}
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin, luxonPlugin]}
          timeZone="Asia/Taipei"
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
          events={rows.map(
            /** 將每個項目轉換為本次清單需要的資料或元件。 */ (s) => ({
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
            }),
          )}
          datesSet={
            /** 更新 FullCalendar 可見日期範圍；起迄相同時不重設查詢狀態。 */ (arg) => {
              const next = { from: arg.start.toISOString(), to: arg.end.toISOString() };
              setDates(
                /** 以目前值更新狀態，保留同一次更新需要的其他欄位。 */ (old) =>
                  old.from === next.from && old.to === next.to ? old : next,
              );
            }
          }
          dateClick={
            /** 由管理員點選日期開啟新增排課表單；老師不取得排課權限。 */ (arg) => {
              if (admin) {
                setStart(arg.dateStr);
                setSelected(null);
                setDialog('create');
              }
            }
          }
          eventClick={
            /** 依行事曆事件 ID 選取場次並顯示授課名單。 */ (arg) => {
              setSelected(
                rows.find(
                  /** 找出符合目前識別碼或條件的第一筆資料。 */ (s) => s.id === arg.event.id,
                ),
              );
              setDialog('details');
            }
          }
        />
      </div>
      {dialog && (
        <Modal
          title={dialog === 'details' ? '場次詳情' : dialog === 'edit' ? '修改場次' : '新增場次'}
          onClose={/** 關閉目前介面並清理選取狀態。 */ () => setDialog(null)}
        >
          {dialog === 'details' && selected ? (
            <SessionDetails
              session={selected}
              isAdmin={admin}
              onEdit={/** 由場次明細切換至編輯表單，保留目前選取場次。 */ () => setDialog('edit')}
              onClose={/** 關閉目前介面並清理選取狀態。 */ () => setDialog(null)}
            />
          ) : (
            <SessionForm
              session={dialog === 'edit' ? selected : null}
              start={start}
              onClose={/** 關閉目前介面並清理選取狀態。 */ () => setDialog(null)}
            />
          )}
        </Modal>
      )}
    </>
  );
}

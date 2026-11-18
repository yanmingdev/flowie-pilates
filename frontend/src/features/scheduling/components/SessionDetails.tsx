import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, post } from '../../../shared/api/http-client';
import { dateTime } from '../../../shared/utils/date-time';
import { Empty } from '../../../shared/ui/Empty';
import { ErrorNote } from '../../../shared/ui/ErrorNote';
import { StudentFeedback } from './StudentFeedback';

/** 呈現授課名單、出勤與場次取消操作；維持現有角色與互動規則。 */ export function SessionDetails({
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

    queryFn: /** 載入目前查詢需要的資料；查詢狀態與錯誤交由 React Query 管理。 */ () =>
      api<any[]>(`/sessions/${session.id}/students`),
  });
  const mark = useMutation({
    mutationFn: /** 送出這次表單或交易請求；成功後才進行快取更新。 */ ({
      booking_id,
      status,
    }: {
      booking_id: string;
      status: string;
    }) => post('/attendance', { booking_id, status }),

    onSuccess: /** 操作成功後刷新相關查詢或關閉表單，避免顯示過期資料。 */ () =>
      qc.invalidateQueries({ queryKey: ['roster', session.id] }),
  });
  const cancel = useMutation({
    mutationFn: /** 送出這次表單或交易請求；成功後才進行快取更新。 */ (future: boolean) =>
      post(`/sessions/${session.id}/${future ? 'cancel-future' : 'cancel'}`),

    onSuccess: /** 操作成功後刷新相關查詢或關閉表單，避免顯示過期資料。 */ () => {
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
        roster.data.map(
          /** 將每個項目轉換為本次清單需要的資料或元件。 */ (s) => (
            <div className="roster-row" key={s.booking_id}>
              <span>{s.student_name || '未填姓名'}</span>
              <select
                aria-label={`${s.student_name}的出勤`}
                disabled={mark.isPending}
                value={s.attendance_status}
                onChange={
                  /** 同步輸入值與對應的表單狀態。 */ (e) =>
                    mark.mutate({ booking_id: s.booking_id, status: e.target.value })
                }
              >
                <option value="unconfirmed">未確認</option>
                <option value="present">已出席</option>
                <option value="absent">缺席</option>
              </select>
              <StudentFeedback key={s.booking_id} student={s} sessionId={session.id} />
            </div>
          ),
        )
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
              onClick={/** 處理目前按鈕操作，依元件狀態執行對應動作。 */ () => cancel.mutate(false)}
            >
              確認取消本場並退堂
            </button>
          ) : (
            <button
              className="button secondary"
              onClick={/** 處理目前按鈕操作，依元件狀態執行對應動作。 */ () => setConfirm(true)}
            >
              取消場次
            </button>
          )}
          {confirm && session.series_id && (
            <span className="helper">批次取消尚未開放，請逐場取消。</span>
          )}
        </div>
      )}
    </>
  );
}

import { taipeiToIso } from '../../../shared/utils/date-time';
import { toTaipeiDateTimeInput as localInput } from '../../../shared/utils/date-time';
import { useState } from 'react';
import { useMutation, useQueries, useQueryClient } from '@tanstack/react-query';
import { apiAll, patch, post } from '../../../shared/api/http-client';
import { useApp } from '../../../shared/state/AppContext';
import { dateTime } from '../../../shared/utils/date-time';
import { ErrorNote } from '../../../shared/ui/ErrorNote';

/** 呈現排課輸入、台灣時區轉換與表單送出；維持現有角色與互動規則。 */ export function SessionForm({
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
  const names = ['branches', 'rooms', 'courses', 'teachers'];
  const data = useQueries({
    queries: names.map(
      /** 將每個項目轉換為本次清單需要的資料或元件。 */ (n) => ({
        queryKey: [n, studio?.id],

        queryFn: /** 載入目前查詢需要的資料；查詢狀態與錯誤交由 React Query 管理。 */ () =>
          apiAll<any>(n, studio!.id),
        enabled: !!studio,
      }),
    ),
  });
  const get = /** 從已載入查詢中取出指定資源的選單資料。 */ (name: string) =>
    data[names.indexOf(name)]?.data || [];
  const [f, setF] = useState(
    /** 建立此元件的初始狀態，避免每次重新渲染重建。 */ () => ({
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
    }),
  );
  const filteredRooms = get('rooms').filter(
    /** 依目前條件保留符合的項目，不修改原始清單。 */ (r: any) =>
      r.branch_id === f.branch_id && r.is_active,
  );
  const teachers = get('teachers').filter(
    /** 依目前條件保留符合的項目，不修改原始清單。 */ (t: any) => t.is_active,
  );
  const mutation = useMutation({
    mutationFn: /** 送出這次表單或交易請求；成功後才進行快取更新。 */ () => {
      const body = {
        studio_id: studio!.id,
        branch_id: f.branch_id,
        room_id: f.room_id,
        course_id: f.course_id,
        teacher_id: f.teacher_id,
        starts_at: taipeiToIso(f.starts_at),
        ends_at: taipeiToIso(f.ends_at),
        capacity: Number(f.capacity),
        booking_opens_at: f.booking_opens_at ? taipeiToIso(f.booking_opens_at) : null,
        booking_closes_at: f.booking_closes_at ? taipeiToIso(f.booking_closes_at) : null,
        cancellation_deadline: f.deadline ? taipeiToIso(f.deadline) : null,
        until_date: f.until_date || null,
      };
      return session ? patch(`/sessions/${session.id}`, body) : post('/sessions', body);
    },

    onSuccess: /** 操作成功後刷新相關查詢或關閉表單，避免顯示過期資料。 */ () => {
      qc.invalidateQueries();
      onClose();
    },
  });
  return (
    <form
      className="form-stack"
      onSubmit={
        /** 處理表單送出及非同步結果，保留現有驗證與錯誤提示。 */ (e) => {
          e.preventDefault();
          mutation.mutate();
        }
      }
    >
      <div className="form-two">
        <label>
          分店
          <select
            required
            value={f.branch_id}
            onChange={
              /** 同步輸入值與對應的表單狀態。 */ (e) =>
                setF({ ...f, branch_id: e.target.value, room_id: '', teacher_id: '' })
            }
          >
            <option value="">請選擇</option>
            {get('branches')
              .filter(/** 依目前條件保留符合的項目，不修改原始清單。 */ (x: any) => x.is_active)
              .map(
                /** 將每個項目轉換為本次清單需要的資料或元件。 */ (x: any) => (
                  <option key={x.id} value={x.id}>
                    {x.name}
                  </option>
                ),
              )}
          </select>
        </label>
        <label>
          教室
          <select
            required
            value={f.room_id}
            onChange={
              /** 同步輸入值與對應的表單狀態。 */ (e) => setF({ ...f, room_id: e.target.value })
            }
          >
            <option value="">請選擇</option>
            {filteredRooms.map(
              /** 將每個項目轉換為本次清單需要的資料或元件。 */ (x: any) => (
                <option key={x.id} value={x.id}>
                  {x.name}（{x.capacity} 人）
                </option>
              ),
            )}
          </select>
        </label>
      </div>
      <div className="form-two">
        <label>
          課程
          <select
            required
            value={f.course_id}
            onChange={
              /** 同步輸入值與對應的表單狀態。 */ (e) =>
                setF({ ...f, course_id: e.target.value, teacher_id: '' })
            }
          >
            <option value="">請選擇</option>
            {get('courses')
              .filter(/** 依目前條件保留符合的項目，不修改原始清單。 */ (x: any) => x.is_active)
              .map(
                /** 將每個項目轉換為本次清單需要的資料或元件。 */ (x: any) => (
                  <option key={x.id} value={x.id}>
                    {x.name}
                  </option>
                ),
              )}
          </select>
        </label>
        <label>
          老師
          <select
            required
            value={f.teacher_id}
            onChange={
              /** 同步輸入值與對應的表單狀態。 */ (e) => setF({ ...f, teacher_id: e.target.value })
            }
          >
            <option value="">請選擇老師</option>
            {teachers.map(
              /** 將每個項目轉換為本次清單需要的資料或元件。 */ (x: any) => (
                <option key={x.id} value={x.id}>
                  {x.name}
                </option>
              ),
            )}
          </select>
        </label>
      </div>
      <p className="helper">V1 尚未設定老師的分店、課程資格及可授課時間，請由管理員人工確認。</p>
      <div className="form-two">
        <label>
          開始時間
          <input
            required
            type="datetime-local"
            value={f.starts_at}
            onChange={
              /** 同步輸入值與對應的表單狀態。 */ (e) => setF({ ...f, starts_at: e.target.value })
            }
          />
        </label>
        <label>
          結束時間
          <input
            required
            type="datetime-local"
            value={f.ends_at}
            onChange={
              /** 同步輸入值與對應的表單狀態。 */ (e) => setF({ ...f, ends_at: e.target.value })
            }
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
            onChange={
              /** 同步輸入值與對應的表單狀態。 */ (e) =>
                setF({ ...f, capacity: Number(e.target.value) })
            }
          />
        </label>
        <label>
          預約開放時間
          <input
            type="datetime-local"
            value={f.booking_opens_at}
            onChange={
              /** 同步輸入值與對應的表單狀態。 */ (e) =>
                setF({ ...f, booking_opens_at: e.target.value })
            }
          />
        </label>
      </div>
      <label>
        預約截止時間（留空則開課時截止）
        <input
          type="datetime-local"
          value={f.booking_closes_at}
          onChange={
            /** 同步輸入值與對應的表單狀態。 */ (e) =>
              setF({ ...f, booking_closes_at: e.target.value })
          }
        />
      </label>
      <label>
        本場次取消期限（選填）
        <input
          type="datetime-local"
          value={f.deadline}
          onChange={
            /** 同步輸入值與對應的表單狀態。 */ (e) => setF({ ...f, deadline: e.target.value })
          }
        />
      </label>
      {session?.series_id && (
        <p className="helper">此場次屬於週期課程，批次修改尚未開放，請逐場修改。</p>
      )}
      {!session && (
        <label>
          每週重複至（留空為單次）
          <input
            type="date"
            value={f.until_date}
            onChange={
              /** 同步輸入值與對應的表單狀態。 */ (e) => setF({ ...f, until_date: e.target.value })
            }
          />
        </label>
      )}
      {f.starts_at && (
        <div className="summary-row">
          <span>場次預覽</span>
          <strong>
            {dateTime(taipeiToIso(f.starts_at))}
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

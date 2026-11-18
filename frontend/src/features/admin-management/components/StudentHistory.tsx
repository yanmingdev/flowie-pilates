import { useQuery } from '@tanstack/react-query';
import { api } from '../../../shared/api/http-client';
import { useApp } from '../../../shared/state/AppContext';
import { ErrorNote } from '../../../shared/ui/ErrorNote';

/** 呈現學生歷史預約、方案與帳本；維持現有角色與互動規則。 */ export function StudentHistory({
  student,
}: {
  student: any;
}) {
  const { studio } = useApp();
  const result = useQuery({
    queryKey: ['student-history', studio?.id, student.student_id],

    queryFn: /** 載入目前查詢需要的資料；查詢狀態與錯誤交由 React Query 管理。 */ () =>
      api<any>(`/students/${student.student_id}/history?studio_id=${studio!.id}`),
    enabled: !!studio,
  });
  return (
    <div>
      <p className="helper">
        {student.display_name || student.student_id} 的預約、出勤與堂數紀錄。
      </p>
      {result.isError && <ErrorNote error={result.error} />}
      <h3>預約與出勤</h3>
      {result.data?.bookings?.length ? (
        result.data.bookings.map(
          /** 將每個項目轉換為本次清單需要的資料或元件。 */ (b: any) => (
            <div className="ledger-row" key={b.id}>
              <div>
                <strong>{b.class_sessions?.courses?.name}</strong>
                <p>
                  {new Date(b.class_sessions?.starts_at).toLocaleString('zh-TW', {
                    timeZone: 'Asia/Taipei',
                  })}{' '}
                  · {b.status}
                </p>
              </div>
              <span>{b.attendance_status || '未確認'}</span>
            </div>
          ),
        )
      ) : (
        <p className="helper">尚無預約紀錄。</p>
      )}
      <h3>堂數紀錄</h3>
      {result.data?.ledger?.length ? (
        result.data.ledger.map(
          /** 將每個項目轉換為本次清單需要的資料或元件。 */ (l: any) => (
            <div className="ledger-row" key={l.id}>
              <div>
                <strong>{l.entry_type}</strong>
                <p>
                  {new Date(l.created_at).toLocaleDateString('zh-TW', { timeZone: 'Asia/Taipei' })}{' '}
                  · {l.note || ''}
                </p>
              </div>
              <strong>
                {l.delta > 0 ? '+' : ''}
                {l.delta}
              </strong>
            </div>
          ),
        )
      ) : (
        <p className="helper">尚無堂數紀錄。</p>
      )}
    </div>
  );
}

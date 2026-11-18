import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { patch } from '../../../shared/api/http-client';
import { ErrorNote } from '../../../shared/ui/ErrorNote';

/** 呈現老師課後建議表單；維持現有角色與互動規則。 */ export function StudentFeedback({
  student,
  sessionId,
}: {
  student: any;
  sessionId: string;
}) {
  const [feedback, setFeedback] = useState(student.teacher_feedback || '');
  const qc = useQueryClient();
  const save = useMutation({
    mutationFn: /** 送出這次表單或交易請求；成功後才進行快取更新。 */ () =>
      patch(`/bookings/${student.booking_id}/teacher-feedback`, { feedback }),

    onSuccess: /** 操作成功後刷新相關查詢或關閉表單，避免顯示過期資料。 */ () => {
      void qc.invalidateQueries({ queryKey: ['roster', sessionId] });
    },
  });
  return (
    <div className="feedback-field">
      <label>
        給 {student.student_name || '學生'} 的課後建議
        <textarea
          value={feedback}
          maxLength={2000}
          placeholder="請記錄這堂課的練習建議"
          onChange={/** 同步輸入值與對應的表單狀態。 */ (e) => setFeedback(e.target.value)}
        />
      </label>
      <button
        className="button secondary"
        type="button"
        disabled={!feedback.trim() || save.isPending}
        onClick={/** 處理目前按鈕操作，依元件狀態執行對應動作。 */ () => save.mutate()}
      >
        儲存建議
      </button>
      {save.isSuccess && <span role="status">已儲存</span>}
      {save.isError && <ErrorNote error={save.error} />}
    </div>
  );
}

import { useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { post } from '../../../shared/api/http-client';
import { ErrorNote } from '../../../shared/ui/ErrorNote';

/** 呈現人工調整堂數並要求原因；維持現有角色與互動規則。 */ export function CreditAdjust({
  item,
  onClose,
}: {
  item: any;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [delta, setDelta] = useState(1);
  const [note, setNote] = useState('');
  const key = useRef(crypto.randomUUID());
  const mutation = useMutation({
    mutationFn: /** 送出這次表單或交易請求；成功後才進行快取更新。 */ () =>
      post(`/student-packages/${item.id}/adjust`, {
        delta: Number(delta),
        note,
        idempotency_key: key.current,
      }),

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
      <p>目前餘額 {item.balance} 堂；正數為增加，負數為扣除。</p>
      <label>
        調整堂數
        <input
          type="number"
          required
          value={delta}
          onChange={/** 同步輸入值與對應的表單狀態。 */ (e) => setDelta(Number(e.target.value))}
        />
      </label>
      <label>
        調整原因
        <input
          required
          value={note}
          onChange={/** 同步輸入值與對應的表單狀態。 */ (e) => setNote(e.target.value)}
        />
      </label>
      {mutation.isError && <ErrorNote error={mutation.error} />}
      <button className="button" disabled={mutation.isPending || delta === 0}>
        確認調整
      </button>
    </form>
  );
}

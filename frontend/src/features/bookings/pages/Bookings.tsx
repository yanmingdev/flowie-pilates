import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { post } from '../../../shared/api/http-client';
import { useApp } from '../../../shared/state/AppContext';
import { useStudioQuery } from '../../../shared/hooks/useStudioQuery';
import { dateTime } from '../../../shared/utils/date-time';
import { Empty } from '../../../shared/ui/Empty';
import { ErrorNote } from '../../../shared/ui/ErrorNote';
import { Modal } from '../../../shared/ui/Modal';
import { SignInPrompt } from '../../auth/components/SignInPrompt';

/** 呈現本人的預約、取消與狀態篩選；維持現有角色與互動規則。 */ export function Bookings() {
  const { user, online } = useApp();
  const qc = useQueryClient();
  const query = useStudioQuery<any[]>('bookings', !!user, { scope: 'mine' });
  const [tab, setTab] = useState('upcoming');
  const [cancel, setCancel] = useState<any>(null);
  const mutation = useMutation({
    mutationFn: /** 送出這次表單或交易請求；成功後才進行快取更新。 */ (id: string) =>
      post(`/bookings/${id}/cancel`),

    onSuccess: /** 操作成功後刷新相關查詢或關閉表單，避免顯示過期資料。 */ () => {
      setCancel(null);
      qc.invalidateQueries({ queryKey: ['bookings'] });
      qc.invalidateQueries({ queryKey: ['student-packages'] });
      qc.invalidateQueries({ queryKey: ['credit-ledger'] });
      qc.invalidateQueries({ queryKey: ['sessions'] });
    },
  });
  if (!user)
    return (
      <main className="page">
        <SignInPrompt />
      </main>
    );
  const rows = (query.data || []).filter(
    /** 依目前條件保留符合的項目，不修改原始清單。 */ (b) =>
      tab === 'cancelled'
        ? b.status === 'cancelled'
        : tab === 'upcoming'
          ? b.status === 'confirmed' && new Date(b.class_sessions?.starts_at) > new Date()
          : b.status !== 'cancelled' && new Date(b.class_sessions?.starts_at) <= new Date(),
  );
  return (
    <main className="page narrow">
      <div className="page-intro">
        <span className="eyebrow">YOUR PRACTICE</span>
        <h1>我的預約</h1>
        <p>這些都是留給自己的時間。</p>
      </div>
      <div className="tabs">
        {[
          ['upcoming', '即將到來'],
          ['history', '歷史紀錄'],
          ['cancelled', '已取消'],
        ].map(
          /** 將每個項目轉換為本次清單需要的資料或元件。 */ ([id, label]) => (
            <button
              key={id}
              className={tab === id ? 'active' : ''}
              onClick={/** 處理目前按鈕操作，依元件狀態執行對應動作。 */ () => setTab(id)}
            >
              {label}
            </button>
          ),
        )}
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
      )}{' '}
      {query.isLoading ? (
        <p>載入中…</p>
      ) : rows.length ? (
        <div className="list-stack">
          {rows.map(
            /** 將每個項目轉換為本次清單需要的資料或元件。 */ (b) => (
              <article className="booking-card" key={b.id}>
                <div>
                  <span className="eyebrow">
                    {b.status === 'cancelled' ? '已取消' : 'FLOWIE CLASS'}
                  </span>
                  <h3>{b.class_sessions?.courses?.name || '課程'}</h3>
                  <p>{b.class_sessions?.starts_at ? dateTime(b.class_sessions.starts_at) : '—'}</p>
                  <p>
                    {b.class_sessions?.branches?.name}・{b.class_sessions?.rooms?.name}{' '}
                    {b.class_sessions?.teachers?.name && `・${b.class_sessions.teachers.name}`}
                  </p>
                  <small>
                    取消期限{' '}
                    {b.cancellation_deadline_at ? dateTime(b.cancellation_deadline_at) : '—'} ·
                    預約編號 {b.id} {b.credits_charged != null && `· ${b.credits_charged} 堂`}{' '}
                    {b.attendance_status &&
                      `· 出勤：${({ present: '已出席', absent: '缺席', unconfirmed: '未確認' } as Record<string, string>)[b.attendance_status]}`}
                  </small>
                </div>
                {tab === 'upcoming' && (
                  <button
                    className="button secondary"
                    disabled={!online}
                    onClick={
                      /** 處理目前按鈕操作，依元件狀態執行對應動作。 */ () => {
                        mutation.reset();
                        setCancel(b);
                      }
                    }
                  >
                    取消預約
                  </button>
                )}
              </article>
            ),
          )}
        </div>
      ) : !query.isError ? (
        <Empty title="還沒有預約" description="挑選一堂適合自己的課程吧。" />
      ) : null}
      {cancel && (
        <Modal title="取消預約" onClose={/** 關閉目前介面並清理選取狀態。 */ () => setCancel(null)}>
          <p>
            確定要取消「{cancel.class_sessions?.courses?.name}
            」嗎？系統會依設定檢查取消期限並處理退堂。
          </p>
          {mutation.isError && <ErrorNote error={mutation.error} />}
          <div className="button-row">
            <button
              className="button secondary"
              onClick={/** 處理目前按鈕操作，依元件狀態執行對應動作。 */ () => setCancel(null)}
            >
              保留預約
            </button>
            <button
              className="button"
              disabled={mutation.isPending || !online}
              onClick={
                /** 處理目前按鈕操作，依元件狀態執行對應動作。 */ () => mutation.mutate(cancel.id)
              }
            >
              確認取消
            </button>
          </div>
        </Modal>
      )}
    </main>
  );
}

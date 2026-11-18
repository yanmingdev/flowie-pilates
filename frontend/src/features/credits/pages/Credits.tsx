import { useApp } from '../../../shared/state/AppContext';
import { useStudioQuery } from '../../../shared/hooks/useStudioQuery';
import { dateTime } from '../../../shared/utils/date-time';
import { Empty } from '../../../shared/ui/Empty';
import { ErrorNote } from '../../../shared/ui/ErrorNote';
import { SignInPrompt } from '../../auth/components/SignInPrompt';

/** 呈現有效方案、到期時間及堂數帳本；維持現有角色與互動規則。 */ export function Credits() {
  const { user } = useApp();
  const packages = useStudioQuery<any[]>('student-packages', !!user, { scope: 'mine' });
  const ledger = useStudioQuery<any[]>('credit-ledger', !!user, { scope: 'mine' });
  if (!user)
    return (
      <main className="page">
        <SignInPrompt />
      </main>
    );
  return (
    <main className="page narrow">
      <div className="page-intro">
        <span className="eyebrow">YOUR BALANCE</span>
        <h1>我的堂數</h1>
        <p>每一次練習，都是送給自己的禮物。</p>
      </div>
      {packages.isError && (
        <ErrorNote
          error={packages.error}
          retry={
            /** 重新載入本區塊查詢，提供連線失敗後的重試入口。 */ () => {
              void packages.refetch();
            }
          }
        />
      )}
      <div className="list-stack">
        {packages.data?.length ? (
          packages.data.map(
            /** 將每個項目轉換為本次清單需要的資料或元件。 */ (p) => (
              <article className="credit-card" key={p.id}>
                <div>
                  <span>FLOWIE PACKAGE</span>
                  <h2>{p.course_packages?.name || '課程方案'}</h2>
                  <p>
                    有效期限至{' '}
                    {new Date(p.expires_at).toLocaleDateString('zh-TW', {
                      timeZone: 'Asia/Taipei',
                    })}{' '}
                    ·{' '}
                    {!p.is_active
                      ? '已停用'
                      : new Date(p.expires_at) <= new Date()
                        ? '已到期'
                        : new Date(p.starts_at) > new Date()
                          ? '尚未生效'
                          : '啟用'}
                  </p>
                </div>
                <strong>
                  {p.balance}
                  <small> 堂</small>
                </strong>
              </article>
            ),
          )
        ) : packages.isLoading ? (
          <p>載入中…</p>
        ) : !packages.isError ? (
          <Empty title="目前沒有課程方案" description="請洽工作室協助指派方案。" />
        ) : null}
      </div>
      <div className="section-heading compact">
        <div>
          <span className="eyebrow">CREDIT HISTORY</span>
          <h2>堂數紀錄</h2>
        </div>
      </div>
      {ledger.isError && (
        <ErrorNote
          error={ledger.error}
          retry={
            /** 重新載入本區塊查詢，提供連線失敗後的重試入口。 */ () => {
              void ledger.refetch();
            }
          }
        />
      )}
      {ledger.data?.length ? (
        <div className="panel">
          {ledger.data.map(
            /** 將每個項目轉換為本次清單需要的資料或元件。 */ (l) => (
              <div className="ledger-row" key={l.id}>
                <div>
                  <strong>
                    {(
                      {
                        GRANT: '方案授予',
                        BOOKING_DEBIT: '課程預約',
                        CANCELLATION_REFUND: '取消退堂',
                        MANUAL_ADJUSTMENT: '人工調整',
                        EXPIRATION: '方案到期',
                      } as Record<string, string>
                    )[l.entry_type] || l.entry_type}
                  </strong>
                  <p>
                    {dateTime(l.created_at)} {l.note && `· ${l.note}`}
                  </p>
                </div>
                <strong className={l.delta > 0 ? 'positive' : ''}>
                  {l.delta > 0 ? '+' : ''}
                  {l.delta}
                </strong>
              </div>
            ),
          )}
        </div>
      ) : ledger.isLoading ? (
        <p>載入中…</p>
      ) : !ledger.isError ? (
        <Empty title="尚無堂數紀錄" />
      ) : null}
    </main>
  );
}

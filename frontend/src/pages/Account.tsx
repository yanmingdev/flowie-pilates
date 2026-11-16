import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { patch, post } from '../services/api';
import { supabase } from '../services/supabase';
import { useApp, useStudioQuery } from '../services/context';
import { dateTime } from '../services/types';
import { Empty, ErrorNote, Modal } from '../components/Ui';
function SignInPrompt() {
  return (
    <div className="empty">
      <h2>登入 Flowie</h2>
      <p>登入後即可查看你的資料。</p>
      <Link className="button" to="/login">
        登入 / 註冊
      </Link>
    </div>
  );
}
export function Bookings() {
  const { user, online } = useApp();
  const qc = useQueryClient();
  const query = useStudioQuery<any[]>('bookings', !!user, { scope: 'mine' });
  const [tab, setTab] = useState('upcoming');
  const [cancel, setCancel] = useState<any>(null);
  const mutation = useMutation({
    mutationFn: (id: string) => post(`/bookings/${id}/cancel`),
    onSuccess: () => {
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
  const rows = (query.data || []).filter((b) =>
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
        ].map(([id, label]) => (
          <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </div>
      {query.isError && <ErrorNote error={query.error} retry={() => { void query.refetch(); }} />}{' '}
      {query.isLoading ? (
        <p>載入中…</p>
      ) : rows.length ? (
        <div className="list-stack">
          {rows.map((b) => (
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
                  取消期限 {b.cancellation_deadline_at ? dateTime(b.cancellation_deadline_at) : '—'}{' '}
                  · 預約編號 {b.id} {b.credits_charged != null && `· ${b.credits_charged} 堂`}{' '}
                  {b.attendance_status &&
                    `· 出勤：${({ present: '已出席', absent: '缺席', unconfirmed: '未確認' } as Record<string, string>)[b.attendance_status]}`}
                </small>
              </div>
              {tab === 'upcoming' && (
                <button
                  className="button secondary"
                  disabled={!online}
                  onClick={() => {
                    mutation.reset();
                    setCancel(b);
                  }}
                >
                  取消預約
                </button>
              )}
            </article>
          ))}
        </div>
      ) : !query.isError ? (
        <Empty title="還沒有預約" description="挑選一堂適合自己的課程吧。" />
      ) : null}
      {cancel && (
        <Modal title="取消預約" onClose={() => setCancel(null)}>
          <p>
            確定要取消「{cancel.class_sessions?.courses?.name}
            」嗎？系統會依設定檢查取消期限並處理退堂。
          </p>
          {mutation.isError && <ErrorNote error={mutation.error} />}
          <div className="button-row">
            <button className="button secondary" onClick={() => setCancel(null)}>
              保留預約
            </button>
            <button
              className="button"
              disabled={mutation.isPending || !online}
              onClick={() => mutation.mutate(cancel.id)}
            >
              確認取消
            </button>
          </div>
        </Modal>
      )}
    </main>
  );
}
export function Credits() {
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
      {packages.isError && <ErrorNote error={packages.error} retry={() => { void packages.refetch(); }} />}
      <div className="list-stack">
        {packages.data?.length ? (
          packages.data.map((p) => (
            <article className="credit-card" key={p.id}>
              <div>
                <span>FLOWIE PACKAGE</span>
                <h2>{p.course_packages?.name || '課程方案'}</h2>
                <p>
                  有效期限至{' '}
                  {new Date(p.expires_at).toLocaleDateString('zh-TW', { timeZone: 'Asia/Taipei' })}{' '}
                  · {!p.is_active ? '已停用' : new Date(p.expires_at) <= new Date() ? '已到期' : new Date(p.starts_at) > new Date() ? '尚未生效' : '啟用'}
                </p>
              </div>
              <strong>
                {p.balance}
                <small> 堂</small>
              </strong>
            </article>
          ))
        ) : packages.isLoading ? <p>載入中…</p> : !packages.isError ? (
          <Empty title="目前沒有課程方案" description="請洽工作室協助指派方案。" />
        ) : null}
      </div>
      <div className="section-heading compact">
        <div>
          <span className="eyebrow">CREDIT HISTORY</span>
          <h2>堂數紀錄</h2>
        </div>
      </div>
      {ledger.isError && <ErrorNote error={ledger.error} retry={() => { void ledger.refetch(); }} />}
      {ledger.data?.length ? (
        <div className="panel">
          {ledger.data.map((l) => (
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
          ))}
        </div>
      ) : ledger.isLoading ? <p>載入中…</p> : !ledger.isError ? (
        <Empty title="尚無堂數紀錄" />
      ) : null}
    </main>
  );
}
export function Account() {
  const { user, me, refreshMe, logout, meError } = useApp();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState<unknown>();
  useEffect(() => {
    setName(me?.profile?.display_name || '');
  }, [me]);
  if (!user)
    return (
      <main className="page">
        <SignInPrompt />
      </main>
    );
  const isStaff = !!me?.profile.is_active && (me.profile.is_admin || me.is_teacher);
  return (
    <main className="page narrow">
      <div className="page-intro">
        <span className="eyebrow">A LITTLE ABOUT YOU</span>
        <h1>我的資料</h1>
        <p>照顧自己，從認識自己開始。</p>
      </div>
      <form
        className="panel form-stack"
        onSubmit={async (e) => {
          e.preventDefault();
          try {
            setError(undefined);
            await patch('/auth/profile', { display_name: name });
            refreshMe();
            setMessage('資料已更新。');
          } catch (err) {
            setError(err);
          }
        }}
      >
        <label>
          Email
          <input value={user.email || ''} disabled />
        </label>
        <p className="helper">帳號 User ID：{user.id}</p>
        <label>
          姓名
          <input required value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        {!!meError && <ErrorNote error={meError} />}
        {!!error && <ErrorNote error={error} />}{' '}
        {message && <div className="success-note">{message}</div>}
        <button className="button">儲存資料</button>
      </form>
      <form
        className="panel form-stack account-password"
        onSubmit={async (e) => {
          e.preventDefault();
          const { error } = await supabase.auth.updateUser({ password });
          if (error) setError(error);
          else {
            setPassword('');
            setMessage('密碼已更新。');
          }
        }}
      >
        <h3>修改密碼</h3>
        <label>
          新密碼
          <input
            type="password"
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        <button className="button secondary">更新密碼</button>
      </form>
      <div className="button-row account-links">
        <Link to="/bookings" className="button secondary">
          我的預約
        </Link>
        <Link to="/credits" className="button secondary">
          我的堂數
        </Link>
        {isStaff && (
          <Link to="/admin" className="button secondary">
            前往管理後台
          </Link>
        )}
        <button
          className="button secondary"
          onClick={async () => {
            await logout();
            navigate('/');
          }}
        >
          登出
        </button>
      </div>
    </main>
  );
}

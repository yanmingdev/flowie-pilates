import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { patch } from '../../../shared/api/http-client';
import { supabase } from '../../../shared/auth/supabase-client';
import { useApp } from '../../../shared/state/AppContext';
import { ErrorNote } from '../../../shared/ui/ErrorNote';
import { SignInPrompt } from '../../auth/components/SignInPrompt';

/** 呈現會員顯示名稱、密碼及帳戶操作；維持現有角色與互動規則。 */ export function Account() {
  const { user, me, refreshMe, logout, meError } = useApp();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState<unknown>();
  useEffect(
    /** 同步外部狀態或註冊事件；需要時回傳清理函式。 */ () => {
      setName(me?.profile?.display_name || '');
    },
    [me],
  );
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
        onSubmit={
          /** 處理表單送出及非同步結果，保留現有驗證與錯誤提示。 */ async (e) => {
            e.preventDefault();
            try {
              setError(undefined);
              await patch('/auth/profile', { display_name: name });
              refreshMe();
              setMessage('資料已更新。');
            } catch (err) {
              setError(err);
            }
          }
        }
      >
        <label>
          Email
          <input value={user.email || ''} disabled />
        </label>
        <p className="helper">帳號 User ID：{user.id}</p>
        <label>
          姓名
          <input
            required
            value={name}
            onChange={/** 同步輸入值與對應的表單狀態。 */ (e) => setName(e.target.value)}
          />
        </label>
        {!!meError && <ErrorNote error={meError} />}
        {!!error && <ErrorNote error={error} />}{' '}
        {message && <div className="success-note">{message}</div>}
        <button className="button">儲存資料</button>
      </form>
      <form
        className="panel form-stack account-password"
        onSubmit={
          /** 處理表單送出及非同步結果，保留現有驗證與錯誤提示。 */ async (e) => {
            e.preventDefault();
            const { error } = await supabase.auth.updateUser({ password });
            if (error) setError(error);
            else {
              setPassword('');
              setMessage('密碼已更新。');
            }
          }
        }
      >
        <h3>修改密碼</h3>
        <label>
          新密碼
          <input
            type="password"
            minLength={8}
            value={password}
            onChange={/** 同步輸入值與對應的表單狀態。 */ (e) => setPassword(e.target.value)}
            required
          />
        </label>
        <button className="button secondary">更新密碼</button>
      </form>
      <h2 className="account-section-title">我的學習</h2>
      <div className="button-row account-links">
        <Link to="/bookings" className="button secondary">
          我的預約
        </Link>
        <Link to="/favorites" className="button secondary">
          收藏的課程
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
          onClick={
            /** 處理目前按鈕操作，依元件狀態執行對應動作。 */ async () => {
              await logout();
              navigate('/');
            }
          }
        >
          登出
        </button>
      </div>
    </main>
  );
}

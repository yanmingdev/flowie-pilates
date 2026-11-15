import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '../services/supabase';
import { post } from '../services/api';
import { useApp } from '../services/context';
import { ErrorNote } from '../components/Ui';
const schema = z.object({
  email: z.string().email('請輸入有效的 Email'),
  password: z.string().min(8, '密碼至少 8 個字元'),
  name: z.string().optional(),
});
type Values = z.infer<typeof schema>;
export function AuthPage() {
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>('login');
  const [message, setMessage] = useState('');
  const [error, setError] = useState<unknown>();
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const { studio, refreshMe } = useApp();
  const join = async () => {
    if (studio) {
      try {
        await post('/auth/join', { studio_id: studio.id });
        refreshMe();
      } catch {
        /* Account page allows joining later. */
      }
    }
  };
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '', name: '' },
  });
  const submit = async (v: Values) => {
    setError(undefined);
    setMessage('');
    setBusy(true);
    try {
      if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(v.email, {
          redirectTo: `${location.origin}/reset-password`,
        });
        if (error) throw error;
        setMessage('若帳號存在，重設密碼的信件已寄出。');
      } else if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email: v.email,
          password: v.password,
          options: { data: { full_name: v.name || '' } },
        });
        if (error) throw error;
        if (data.session) {
          await join();
          navigate('/');
        } else setMessage('請查看信箱並完成驗證，再回來登入。');
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: v.email,
          password: v.password,
        });
        if (error) throw error;
        await join();
        navigate('/');
      }
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  };
  return (
    <main className="auth-page">
      <div className="auth-art">
        <span>FIND YOUR FLOW.</span>
        <div className="auth-illustration">✳</div>
        <h1>
          留一點時間
          <br />
          給自己。
        </h1>
        <p>一呼一吸，回到自己的節奏。</p>
      </div>
      <section className="auth-form">
        <Link to="/">
          <img src="/logo.svg" className="auth-logo" alt="Flowie" />
        </Link>
        <span className="eyebrow">WELCOME TO FLOWIE</span>
        <h1>{mode === 'login' ? '歡迎回來' : mode === 'signup' ? '一起開始練習' : '重設密碼'}</h1>
        <p>
          {mode === 'forgot'
            ? '輸入註冊信箱，我們會寄送重設連結。'
            : '從這裡開始，為自己留一段美好時光。'}
        </p>
        <form onSubmit={handleSubmit(submit)} className="form-stack">
          {mode === 'signup' && (
            <label>
              你的名字
              <input {...register('name')} autoComplete="name" placeholder="如何稱呼你？" />
            </label>
          )}
          <label>
            Email
            <input
              {...register('email')}
              autoComplete="email"
              type="email"
              placeholder="you@example.com"
            />
            {errors.email && <small className="field-error">{errors.email.message}</small>}
          </label>
          {mode !== 'forgot' && (
            <label>
              密碼
              <input
                {...register('password')}
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                type="password"
                placeholder="至少 8 個字元"
              />
              {errors.password && <small className="field-error">{errors.password.message}</small>}
            </label>
          )}
          {mode === 'forgot' && (
            <input type="hidden" value="placeholder" {...register('password')} />
          )}{' '}
          {!!error && <ErrorNote error={error} />}{' '}
          {message && <div className="success-note">{message}</div>}
          <button className="button button-full" disabled={busy}>
            {busy
              ? '處理中…'
              : mode === 'login'
                ? '登入'
                : mode === 'signup'
                  ? '建立帳號'
                  : '寄送重設連結'}
          </button>
        </form>
        <div className="auth-links">
          {mode === 'login' ? (
            <>
              <button
                onClick={() => {
                  setMode('forgot');
                  setError(undefined);
                }}
              >
                忘記密碼？
              </button>
              <button
                onClick={() => {
                  setMode('signup');
                  setError(undefined);
                }}
              >
                還沒有帳號？立即註冊
              </button>
            </>
          ) : (
            <button
              onClick={() => {
                setMode('login');
                setError(undefined);
              }}
            >
              返回登入
            </button>
          )}
        </div>
      </section>
    </main>
  );
}
export function ResetPassword() {
  const [password, setPassword] = useState('');
  const [result, setResult] = useState('');
  const [error, setError] = useState<unknown>();
  return (
    <main className="page narrow">
      <span className="eyebrow">ACCOUNT SECURITY</span>
      <h1>設定新密碼</h1>
      <p>請從收到的重設密碼連結開啟這個頁面。</p>
      <form
        className="panel form-stack"
        onSubmit={async (e) => {
          e.preventDefault();
          setError(undefined);
          const { error } = await supabase.auth.updateUser({ password });
          if (error) setError(error);
          else setResult('密碼已更新，請使用新密碼登入。');
        }}
      >
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
        {!!error && <ErrorNote error={error} />}{' '}
        {result && <p className="success-note">{result}</p>}
        <button className="button">更新密碼</button>
      </form>
    </main>
  );
}

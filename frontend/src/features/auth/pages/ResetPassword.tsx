import { useState } from 'react';
import { supabase } from '../../../shared/auth/supabase-client';
import { ErrorNote } from '../../../shared/ui/ErrorNote';

/** 呈現重設密碼流程；維持現有角色與互動規則。 */ export function ResetPassword() {
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
        onSubmit={
          /** 處理表單送出及非同步結果，保留現有驗證與錯誤提示。 */ async (e) => {
            e.preventDefault();
            setError(undefined);
            const { error } = await supabase.auth.updateUser({ password });
            if (error) setError(error);
            else setResult('密碼已更新，請使用新密碼登入。');
          }
        }
      >
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
        {!!error && <ErrorNote error={error} />}{' '}
        {result && <p className="success-note">{result}</p>}
        <button className="button">更新密碼</button>
      </form>
    </main>
  );
}

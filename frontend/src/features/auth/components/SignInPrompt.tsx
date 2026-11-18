import { Link } from 'react-router-dom';

/** 呈現未登入會員的操作引導；維持現有角色與互動規則。 */ export function SignInPrompt() {
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

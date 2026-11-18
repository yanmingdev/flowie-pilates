import { NavLink, Link, Outlet, useNavigate } from 'react-router-dom';
import { CalendarDays, LayoutDashboard, Menu } from 'lucide-react';
import { useApp } from '../../shared/state/AppContext';
const adminLinks = [
  { to: '/admin', label: '營運總覽', Icon: LayoutDashboard },
  { to: '/admin/calendar', label: '排課行事曆', Icon: CalendarDays },
  { to: '/admin/teaching', label: '授課紀錄', Icon: CalendarDays },
  { to: '/admin/manage', label: '資料管理', Icon: Menu },
];

/** 呈現老師／管理員工作區與後台存取引導；維持現有角色與互動規則。 */ export function AdminLayout() {
  const { studio, me, user, authLoading, meLoading, meError, refreshMe } = useApp();
  const navigate = useNavigate();
  const staff = !!me?.profile.is_active && (me.profile.is_admin || me.is_teacher);
  if (authLoading || (user && meLoading))
    return (
      <div className="page">
        <div className="empty">載入中…</div>
      </div>
    );
  if (!user)
    return (
      <div className="page">
        <div className="empty">
          <h2>請先登入</h2>
          <button
            className="button"
            onClick={/** 處理目前按鈕操作，依元件狀態執行對應動作。 */ () => navigate('/login')}
          >
            前往登入
          </button>
        </div>
      </div>
    );
  if (user && meError)
    return (
      <div className="page">
        <div className="error-note" role="alert">
          無法讀取帳號權限，請檢查連線。 <button onClick={refreshMe}>重新載入</button>
        </div>
      </div>
    );
  if (!staff)
    return (
      <div className="page">
        <div className="empty">
          <h2>此帳號沒有後台權限</h2>
          <p>如有需要，請聯繫品牌管理員。</p>
        </div>
      </div>
    );
  return (
    <div className="admin-layout">
      <aside className="sidebar">
        <div className="sidebar-caption">STUDIO WORKSPACE</div>
        <h2>{studio?.name}</h2>
        <p>讓每一天的流動更從容。</p>
        <nav>
          {adminLinks.map(
            /** 將每個項目轉換為本次清單需要的資料或元件。 */ ({ to, label, Icon }) => (
              <NavLink key={to} end={to === '/admin'} to={to}>
                <Icon size={18} />
                {label}
              </NavLink>
            ),
          )}
        </nav>
        <Link className="sidebar-back" to="/">
          ← 回到學生端
        </Link>
      </aside>
      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  );
}

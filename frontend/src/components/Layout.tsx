import { NavLink, Link, Outlet, useNavigate } from 'react-router-dom';
import {
  CalendarDays,
  Home,
  Layers,
  UserRound,
  Heart,
  Activity,
  Bell,
  LayoutDashboard,
  Menu,
  WifiOff,
} from 'lucide-react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { useApp, useStudioQuery } from '../services/context';
const links = [
  { to: '/', label: '首頁', Icon: Home },
  { to: '/classes', label: '探索課程', Icon: Layers },
  { to: '/favorites', label: '收藏', Icon: Heart },
  { to: '/history', label: '紀錄', Icon: Activity },
  { to: '/account', label: '我的', Icon: UserRound },
];
export function Layout() {
  const { studio, user, me, online } = useApp();
  const settings = useStudioQuery<any[]>('site-settings');
  const isStaff = !!me?.profile.is_active && (me.profile.is_admin || me.is_teacher);
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW();
  return (
    <>
      <header className="topbar">
        <div className="topbar-inner">
          <Link to="/" aria-label="Flowie 首頁">
            <img
              className="logo"
              src={studio?.logo_url || '/logo.svg'}
              alt="Flowie"
              onError={(e) => {
                e.currentTarget.src = '/logo.svg';
              }}
            />
          </Link>
          <nav className="desktop-nav">
            {links.map(({ to, label }) => (
              <NavLink end={to === '/'} key={to} to={to}>
                {label}
              </NavLink>
            ))}
            {isStaff && <NavLink to="/admin">管理後台</NavLink>}
          </nav>
          <div className="top-actions">
            <Link to="/announcements" className="top-notice" aria-label="查看最新消息">
              <Bell size={20} />
            </Link>
            <Link to={user ? '/account' : '/login'} className="top-user">
              <UserRound size={17} />
              <span>{user ? '我的帳戶' : '登入 / 註冊'}</span>
            </Link>
          </div>
        </div>
      </header>
      {!online && (
        <div role="status" className="network-banner">
          <WifiOff size={16} />
          目前離線，預約與取消需連線後操作。
        </div>
      )}
      {needRefresh && (
        <div className="update-banner">
          有新版本可用，儲存資料後可手動更新。{' '}
          <button onClick={() => updateServiceWorker(true)}>更新</button>
        </div>
      )}
      <Outlet />
      <nav className="bottom-nav">
        {links.map(({ to, label, Icon }) => (
          <NavLink end={to === '/'} key={to} to={to}>
            <Icon size={20} />
            <span>
              {label === '探索課程'
                ? '課程'
                : label === '我的預約'
                  ? '預約'
                  : label === '我的堂數'
                    ? '堂數'
                    : label}
            </span>
          </NavLink>
        ))}
      </nav>
      <footer className="footer">
        <span>flowie.</span>
        <span>
          {settings.data?.[0]?.brand_tagline || 'Find Your Flow.'} · {studio?.name}{' '}
          {settings.data?.[0]?.contact_email && ` · ${settings.data[0].contact_email}`}{' '}
          {settings.data?.[0]?.contact_phone && ` · ${settings.data[0].contact_phone}`}
        </span>
      </footer>
    </>
  );
}
const adminLinks = [
  { to: '/admin', label: '營運總覽', Icon: LayoutDashboard },
  { to: '/admin/calendar', label: '排課行事曆', Icon: CalendarDays },
  { to: '/admin/teaching', label: '授課紀錄', Icon: CalendarDays },
  { to: '/admin/manage', label: '資料管理', Icon: Menu },
];
export function AdminLayout() {
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
          <button className="button" onClick={() => navigate('/login')}>
            前往登入
          </button>
        </div>
      </div>
    );
  if (user && meError)
    return <div className="page"><div className="error-note" role="alert">無法讀取帳號權限，請檢查連線。 <button onClick={refreshMe}>重新載入</button></div></div>;
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
          {adminLinks.map(({ to, label, Icon }) => (
            <NavLink key={to} end={to === '/admin'} to={to}>
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
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

import { resolvePublicAssetUrl } from '../../shared/config/assets';
import { NavLink, Link, Outlet } from 'react-router-dom';
import { CalendarDays, Home, Layers, UserRound, BookOpen, Bell, WifiOff } from 'lucide-react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { useApp } from '../../shared/state/AppContext';
import { useStudioQuery } from '../../shared/hooks/useStudioQuery';
const links = [
  { to: '/', label: '首頁', Icon: Home },
  { to: '/teachers', label: '師資介紹', Icon: UserRound },
  { to: '/classes', label: '探索課程', Icon: Layers },
  { to: '/my-calendar', label: '行事曆', Icon: CalendarDays },
  { to: '/history', label: '上課紀錄', Icon: BookOpen },
  { to: '/account', label: '我的帳戶', Icon: UserRound },
];

/** 呈現前台導覽、離線狀態與 PWA 更新提示；維持現有角色與互動規則。 */ export function Layout() {
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
              src={resolvePublicAssetUrl(studio?.logo_url || '/assets/images/brand/logo.svg')}
              alt="Flowie"
              onError={
                /** 保留操作失敗資訊供畫面顯示，不將失敗當成成功。 */ (e) => {
                  e.currentTarget.src = '/assets/images/brand/logo.svg';
                }
              }
            />
          </Link>
          <nav className="desktop-nav">
            {links.map(
              /** 將每個項目轉換為本次清單需要的資料或元件。 */ ({ to, label }) => (
                <NavLink end={to === '/'} key={to} to={to}>
                  {label}
                </NavLink>
              ),
            )}
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
          <button
            onClick={
              /** 處理目前按鈕操作，依元件狀態執行對應動作。 */ () => updateServiceWorker(true)
            }
          >
            更新
          </button>
        </div>
      )}
      <Outlet />
      <nav className="bottom-nav">
        {links.map(
          /** 將每個項目轉換為本次清單需要的資料或元件。 */ ({ to, label, Icon }) => (
            <NavLink end={to === '/'} key={to} to={to}>
              <Icon size={20} />
              <span>
                {label === '探索課程'
                  ? '課程'
                  : label === '上課紀錄'
                    ? '紀錄'
                    : label === '我的帳戶'
                      ? '帳戶'
                      : label}
              </span>
            </NavLink>
          ),
        )}
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

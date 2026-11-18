import { Route, Routes } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { Layout } from '../layouts/MemberLayout';
import { AdminLayout } from '../layouts/AdminLayout';
import { Home } from '../../features/home/pages/Home';
const Classes = lazy(
  /** 按需載入此路由的頁面模組，避免一次下載全部頁面程式。 */ () =>
    import('../../features/classes/pages/Classes').then(
      /** 接續處理非同步成功結果，更新對應狀態。 */ (m) => ({ default: m.Classes }),
    ),
);
const Account = lazy(
  /** 按需載入此路由的頁面模組，避免一次下載全部頁面程式。 */ () =>
    import('../../features/account/pages/Account').then(
      /** 接續處理非同步成功結果，更新對應狀態。 */ (m) => ({ default: m.Account }),
    ),
);
const Bookings = lazy(
  /** 按需載入此路由的頁面模組，避免一次下載全部頁面程式。 */ () =>
    import('../../features/bookings/pages/Bookings').then(
      /** 接續處理非同步成功結果，更新對應狀態。 */ (m) => ({ default: m.Bookings }),
    ),
);
const Credits = lazy(
  /** 按需載入此路由的頁面模組，避免一次下載全部頁面程式。 */ () =>
    import('../../features/credits/pages/Credits').then(
      /** 接續處理非同步成功結果，更新對應狀態。 */ (m) => ({ default: m.Credits }),
    ),
);
const AuthPage = lazy(
  /** 按需載入此路由的頁面模組，避免一次下載全部頁面程式。 */ () =>
    import('../../features/auth/pages/AuthPage').then(
      /** 接續處理非同步成功結果，更新對應狀態。 */ (m) => ({ default: m.AuthPage }),
    ),
);
const ResetPassword = lazy(
  /** 按需載入此路由的頁面模組，避免一次下載全部頁面程式。 */ () =>
    import('../../features/auth/pages/ResetPassword').then(
      /** 接續處理非同步成功結果，更新對應狀態。 */ (m) => ({ default: m.ResetPassword }),
    ),
);
const AdminHome = lazy(
  /** 按需載入此路由的頁面模組，避免一次下載全部頁面程式。 */ () =>
    import('../../features/admin-dashboard/pages/AdminHome').then(
      /** 接續處理非同步成功結果，更新對應狀態。 */ (m) => ({ default: m.AdminHome }),
    ),
);
const Favorites = lazy(
  /** 按需載入此路由的頁面模組，避免一次下載全部頁面程式。 */ () =>
    import('../../features/favorites/pages/Favorites').then(
      /** 接續處理非同步成功結果，更新對應狀態。 */ (m) => ({ default: m.Favorites }),
    ),
);
const History = lazy(
  /** 按需載入此路由的頁面模組，避免一次下載全部頁面程式。 */ () =>
    import('../../features/history/pages/History').then(
      /** 接續處理非同步成功結果，更新對應狀態。 */ (m) => ({ default: m.History }),
    ),
);
const Announcements = lazy(
  /** 按需載入此路由的頁面模組，避免一次下載全部頁面程式。 */ () =>
    import('../../features/announcements/pages/Announcements').then(
      /** 接續處理非同步成功結果，更新對應狀態。 */ (m) => ({ default: m.Announcements }),
    ),
);
const TeachingRecords = lazy(
  /** 按需載入此路由的頁面模組，避免一次下載全部頁面程式。 */ () =>
    import('../../features/teaching/pages/TeachingRecords').then(
      /** 接續處理非同步成功結果，更新對應狀態。 */ (m) => ({ default: m.TeachingRecords }),
    ),
);
const Manage = lazy(
  /** 按需載入此路由的頁面模組，避免一次下載全部頁面程式。 */ () =>
    import('../../features/admin-management/pages/Manage').then(
      /** 接續處理非同步成功結果，更新對應狀態。 */ (m) => ({ default: m.Manage }),
    ),
);
const Teachers = lazy(
  /** 按需載入此路由的頁面模組，避免一次下載全部頁面程式。 */ () =>
    import('../../features/teachers/pages/Teachers').then(
      /** 接續處理非同步成功結果，更新對應狀態。 */ (m) => ({ default: m.Teachers }),
    ),
);
const MyCalendar = lazy(
  /** 按需載入此路由的頁面模組，避免一次下載全部頁面程式。 */ () =>
    import('../../features/member-calendar/pages/MyCalendar').then(
      /** 接續處理非同步成功結果，更新對應狀態。 */ (m) => ({ default: m.MyCalendar }),
    ),
);
const Calendar = lazy(
  /** 按需載入此路由的頁面模組，避免一次下載全部頁面程式。 */ () =>
    import('../../features/scheduling/pages/Calendar').then(
      /** 接續處理非同步成功結果，更新對應狀態。 */ (m) => ({ default: m.Calendar }),
    ),
);

/** 組裝前台、會員與後台路由，保留既有 URL。 */ export function App() {
  return (
    <Suspense fallback={<main className="page">載入中…</main>}>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="classes" element={<Classes />} />
          <Route path="teachers" element={<Teachers />} />
          <Route path="my-calendar" element={<MyCalendar />} />
          <Route path="favorites" element={<Favorites />} />
          <Route path="history" element={<History />} />
          <Route path="announcements" element={<Announcements />} />
          <Route path="bookings" element={<Bookings />} />
          <Route path="credits" element={<Credits />} />
          <Route path="account" element={<Account />} />
          <Route path="reset-password" element={<ResetPassword />} />
          <Route path="admin" element={<AdminLayout />}>
            <Route index element={<AdminHome />} />
            <Route path="calendar" element={<Calendar />} />
            <Route path="teaching" element={<TeachingRecords />} />
            <Route path="manage" element={<Manage />} />
          </Route>
        </Route>
        <Route path="login" element={<AuthPage />} />
        <Route
          path="*"
          element={
            <main className="page">
              <h1>找不到頁面</h1>
              <a href="/">回到首頁</a>
            </main>
          }
        />
      </Routes>
    </Suspense>
  );
}

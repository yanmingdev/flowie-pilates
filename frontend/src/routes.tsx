import { Route, Routes } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { Layout, AdminLayout } from './components/Layout';
import { Home } from './pages/Home';
import { Classes } from './pages/Classes';
import { Account, Bookings, Credits } from './pages/Account';
import { AuthPage, ResetPassword } from './pages/Auth';
import { AdminHome } from './pages/AdminHome';
import { Favorites } from './pages/Favorites';
import { History } from './pages/History';
import { Announcements } from './pages/Announcements';
import { TeachingRecords } from './pages/TeachingRecords';
const Manage = lazy(() => import('./pages/Manage').then((m) => ({ default: m.Manage })));
const Calendar = lazy(() => import('./pages/Calendar').then((m) => ({ default: m.Calendar })));
export function App() {
  return (
    <Suspense fallback={<main className="page">載入中…</main>}>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="classes" element={<Classes />} />
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

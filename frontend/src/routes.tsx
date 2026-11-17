import { Route, Routes } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { Layout, AdminLayout } from './components/Layout';
import { Home } from './pages/Home';

// Load each page when it is visited; shared modules are bundled only once.
const Classes = lazy(() => import('./pages/Classes').then((m) => ({ default: m.Classes })));
const Account = lazy(() => import('./pages/Account').then((m) => ({ default: m.Account })));
const Bookings = lazy(() => import('./pages/Account').then((m) => ({ default: m.Bookings })));
const Credits = lazy(() => import('./pages/Account').then((m) => ({ default: m.Credits })));
const AuthPage = lazy(() => import('./pages/Auth').then((m) => ({ default: m.AuthPage })));
const ResetPassword = lazy(() => import('./pages/Auth').then((m) => ({ default: m.ResetPassword })));
const AdminHome = lazy(() => import('./pages/AdminHome').then((m) => ({ default: m.AdminHome })));
const Favorites = lazy(() => import('./pages/Favorites').then((m) => ({ default: m.Favorites })));
const History = lazy(() => import('./pages/History').then((m) => ({ default: m.History })));
const Announcements = lazy(() => import('./pages/Announcements').then((m) => ({ default: m.Announcements })));
const TeachingRecords = lazy(() => import('./pages/TeachingRecords').then((m) => ({ default: m.TeachingRecords })));
const Manage = lazy(() => import('./pages/Manage').then((m) => ({ default: m.Manage })));
const Teachers = lazy(() => import('./pages/Teachers').then((m) => ({ default: m.Teachers })));
const MyCalendar = lazy(() => import('./pages/MyCalendar').then((m) => ({ default: m.MyCalendar })));
const Calendar = lazy(() => import('./pages/Calendar').then((m) => ({ default: m.Calendar })));

export function App() {
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

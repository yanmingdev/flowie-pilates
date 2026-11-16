import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../src/components/Layout', async () => {
  const { Outlet } = await import('react-router-dom');
  return { Layout: () => <Outlet />, AdminLayout: () => <Outlet /> };
});
vi.mock('../src/pages/Home', () => ({ Home: () => <div>首頁內容</div> }));
vi.mock('../src/pages/Classes', () => ({ Classes: () => <div>課程內容</div> }));
vi.mock('../src/pages/Account', () => ({
  Account: () => <div>帳號內容</div>,
  Bookings: () => <div>預約內容</div>,
  Credits: () => <div>堂數內容</div>,
}));
vi.mock('../src/pages/Auth', () => ({
  AuthPage: () => <div>登入內容</div>,
  ResetPassword: () => <div>重設密碼內容</div>,
}));
vi.mock('../src/pages/Calendar', () => ({ Calendar: () => <div>行事曆內容</div> }));

import { App } from '../src/routes';

afterEach(() => cleanup());
describe('page routes', () => {
  it.each([
    ['/', '首頁內容'],
    ['/classes', '課程內容'],
    ['/account', '帳號內容'],
    ['/bookings', '預約內容'],
    ['/credits', '堂數內容'],
    ['/login', '登入內容'],
    ['/reset-password', '重設密碼內容'],
    ['/admin/calendar', '行事曆內容'],
  ])('opens %s', async (url, expected) => {
    render(<MemoryRouter initialEntries={[url]}><App /></MemoryRouter>);
    expect(await screen.findByText(expected)).toBeTruthy();
  });
});

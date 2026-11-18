import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { App } from '../../frontend/src/app/router/AppRoutes';
vi.mock(
  '../../frontend/src/app/layouts/MemberLayout',
  /** 提供此測試專用的模組替身，避免連線至正式環境。 */ async () => {
    const { Outlet } = await import('react-router-dom');
    return {
      Layout: /** 呈現前台導覽、離線狀態與 PWA 更新提示；維持現有角色與互動規則。 */ () => (
        <Outlet />
      ),
    };
  },
);
vi.mock(
  '../../frontend/src/app/layouts/AdminLayout',
  /** 提供此測試專用的模組替身，避免連線至正式環境。 */ async () => {
    const { Outlet } = await import('react-router-dom');
    return {
      AdminLayout: /** 呈現老師／管理員工作區與後台存取引導；維持現有角色與互動規則。 */ () => (
        <Outlet />
      ),
    };
  },
);
vi.mock(
  '../../frontend/src/features/home/pages/Home',
  /** 提供此測試專用的模組替身，避免連線至正式環境。 */ () => ({
    Home: /** 呈現首頁品牌區塊、近期課程、老師、知識與公告；維持現有角色與互動規則。 */ () => (
      <div>首頁內容</div>
    ),
  }),
);
vi.mock(
  '../../frontend/src/features/classes/pages/Classes',
  /** 提供此測試專用的模組替身，避免連線至正式環境。 */ () => ({
    Classes: /** 呈現課程篩選、場次與預約流程；維持現有角色與互動規則。 */ () => (
      <div>課程內容</div>
    ),
  }),
);
vi.mock(
  '../../frontend/src/features/account/pages/Account',
  /** 提供此測試專用的模組替身，避免連線至正式環境。 */ () => ({
    Account: /** 呈現會員顯示名稱、密碼及帳戶操作；維持現有角色與互動規則。 */ () => (
      <div>帳號內容</div>
    ),
  }),
);
vi.mock(
  '../../frontend/src/features/bookings/pages/Bookings',
  /** 提供此測試專用的模組替身，避免連線至正式環境。 */ () => ({
    Bookings: /** 呈現本人的預約、取消與狀態篩選；維持現有角色與互動規則。 */ () => (
      <div>預約內容</div>
    ),
  }),
);
vi.mock(
  '../../frontend/src/features/credits/pages/Credits',
  /** 提供此測試專用的模組替身，避免連線至正式環境。 */ () => ({
    Credits: /** 呈現有效方案、到期時間及堂數帳本；維持現有角色與互動規則。 */ () => (
      <div>堂數內容</div>
    ),
  }),
);
vi.mock(
  '../../frontend/src/features/auth/pages/AuthPage',
  /** 提供此測試專用的模組替身，避免連線至正式環境。 */ () => ({
    AuthPage: /** 呈現登入、註冊與找回密碼流程；維持現有角色與互動規則。 */ () => (
      <div>登入內容</div>
    ),
  }),
);
vi.mock(
  '../../frontend/src/features/auth/pages/ResetPassword',
  /** 提供此測試專用的模組替身，避免連線至正式環境。 */ () => ({
    ResetPassword: /** 呈現重設密碼流程；維持現有角色與互動規則。 */ () => <div>重設密碼內容</div>,
  }),
);
vi.mock(
  '../../frontend/src/features/scheduling/pages/Calendar',
  /** 提供此測試專用的模組替身，避免連線至正式環境。 */ () => ({
    Calendar: /** 呈現排課行事曆、場次明細與點名入口；維持現有角色與互動規則。 */ () => (
      <div>行事曆內容</div>
    ),
  }),
);
afterEach(/** 清理案例產生的 DOM、狀態或 mock。 */ () => cleanup());
describe(
  'page routes',
  /** 組織同一功能的測試案例，不接觸正式資料。 */ () => {
    it.each([
      ['/', '首頁內容'],
      ['/classes', '課程內容'],
      ['/account', '帳號內容'],
      ['/bookings', '預約內容'],
      ['/credits', '堂數內容'],
      ['/login', '登入內容'],
      ['/reset-password', '重設密碼內容'],
      ['/admin/calendar', '行事曆內容'],
    ])(
      'opens %s',
      /** 以指定輸入逐一驗證路由或表單行為。 */ async (url, expected) => {
        render(
          <MemoryRouter initialEntries={[url]}>
            <App />
          </MemoryRouter>,
        );
        expect(await screen.findByText(expected)).toBeTruthy();
      },
    );
  },
);

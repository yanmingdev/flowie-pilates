import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { type User } from '@supabase/supabase-js';
import { api } from '../api/http-client';
import { supabase } from '../auth/supabase-client';
import { type Studio, type Me } from '../types/models';
type Context = {
  studio?: Studio;
  user: User | null;
  me?: Me;
  authLoading: boolean;
  brandLoading: boolean;
  brandError: unknown;
  retryBrand: () => void;
  meLoading: boolean;
  meError: unknown;
  online: boolean;
  refreshMe: () => void;
  logout: () => Promise<void>;
};
const AppContext = createContext<Context | null>(null);

/** 同步 Supabase 登入狀態、品牌資料與 React Query 快取，提供全站狀態。 */ export function AppProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const qc = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(
    /** 同步外部狀態或註冊事件；需要時回傳清理函式。 */ () => {
      supabase.auth
        .getSession()
        .then(
          /** 接續處理非同步成功結果，更新對應狀態。 */ ({ data }) => {
            setUser(data.session?.user ?? null);
          },
        )
        .catch(/** 接收非同步失敗並執行現有錯誤處理。 */ () => setUser(null))
        .finally(/** 非同步流程結束後執行清理或解除載入狀態。 */ () => setAuthLoading(false));
      const { data } = supabase.auth.onAuthStateChange(
        /** 同步 Auth 變更後的登入狀態，並讓本人 profile 查詢失效以重讀權限。 */ (
          _event,
          session,
        ) => {
          setUser(session?.user ?? null);
          setAuthLoading(false);
          qc.invalidateQueries({ queryKey: ['me'] });
        },
      );
      return /** 解除先前註冊的事件或訂閱，避免元件卸載後仍持續更新。 */ () =>
        data.subscription.unsubscribe();
    },
    [qc],
  );
  useEffect(
    /** 同步外部狀態或註冊事件；需要時回傳清理函式。 */ () => {
      const on = /** 同步瀏覽器連線狀態，更新離線操作提示。 */ () => setOnline(navigator.onLine);
      window.addEventListener('online', on);
      window.addEventListener('offline', on);
      return /** 解除先前註冊的事件或訂閱，避免元件卸載後仍持續更新。 */ () => {
        window.removeEventListener('online', on);
        window.removeEventListener('offline', on);
      };
    },
    [],
  );
  const brands = useQuery({
    queryKey: ['studios'],

    queryFn: /** 載入目前查詢需要的資料；查詢狀態與錯誤交由 React Query 管理。 */ () =>
      api<Studio[]>('/studios'),
    retry: 1,
  });
  const studio = brands.data?.[0];
  const meQuery = useQuery({
    queryKey: ['me', user?.id],

    queryFn: /** 載入目前查詢需要的資料；查詢狀態與錯誤交由 React Query 管理。 */ () =>
      api<Me>('/auth/me'),
    enabled: !!user,
    staleTime: 30000,
  });
  const me = meQuery.data;
  const value = useMemo(
    /** 依相依值計算可重用的衍生資料，避免重複計算。 */ () => ({
      studio,
      user,
      me,
      authLoading,
      brandLoading: brands.isLoading,
      brandError: brands.error,

      retryBrand: /** 重新載入品牌資料，供連線失敗後重試。 */ () => {
        void brands.refetch();
      },
      meLoading: meQuery.isLoading,
      meError: meQuery.error,
      online,

      refreshMe: /** 讓本人權限與 profile 查詢失效，於下次讀取重新取得。 */ () => {
        qc.invalidateQueries({ queryKey: ['me'] });
      },

      logout: /** 登出 Supabase 並清除本機查詢快取。 */ async () => {
        await supabase.auth.signOut();
        qc.clear();
      },
    }),
    [
      studio,
      user,
      me,
      authLoading,
      online,
      qc,
      brands.isLoading,
      brands.error,
      brands.refetch,
      meQuery.isLoading,
      meQuery.error,
    ],
  );
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

/** 取得全站登入與品牌狀態；缺少 Provider 時立即回報組裝錯誤。 */ export function useApp() {
  const c = useContext(AppContext);
  if (!c) throw new Error('AppProvider missing');
  return c;
}

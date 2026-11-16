import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { User } from '@supabase/supabase-js';
import { api, qs } from './api';
import { supabase } from './supabase';
import type { Studio, Me } from './types';
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
export function AppProvider({ children }: { children: React.ReactNode }) {
  const qc = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
    }).catch(() => setUser(null)).finally(() => setAuthLoading(false));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
      qc.invalidateQueries({ queryKey: ['me'] });
    });
    return () => data.subscription.unsubscribe();
  }, [qc]);
  useEffect(() => {
    const on = () => setOnline(navigator.onLine);
    window.addEventListener('online', on);
    window.addEventListener('offline', on);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', on);
    };
  }, []);
  const brands = useQuery({
    queryKey: ['studios'],
    queryFn: () => api<Studio[]>('/studios'),
    retry: 1,
  });
  const studio = brands.data?.[0];
  const meQuery = useQuery({
    queryKey: ['me', user?.id],
    queryFn: () => api<Me>('/auth/me'),
    enabled: !!user,
    staleTime: 30000,
  });
  const me = meQuery.data;
  const value = useMemo(
    () => ({
      studio,
      user,
      me,
      authLoading,
      brandLoading: brands.isLoading,
      brandError: brands.error,
      retryBrand: () => { void brands.refetch(); },
      meLoading: meQuery.isLoading,
      meError: meQuery.error,
      online,
      refreshMe: () => {
        qc.invalidateQueries({ queryKey: ['me'] });
      },
      logout: async () => {
        await supabase.auth.signOut();
        qc.clear();
      },
    }),
    [studio, user, me, authLoading, online, qc, brands.isLoading, brands.error, brands.refetch, meQuery.isLoading, meQuery.error],
  );
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
export function useApp() {
  const c = useContext(AppContext);
  if (!c) throw new Error('AppProvider missing');
  return c;
}
export function useStudioQuery<T>(
  resource: string,
  enabled = true,
  params: Record<string, string> = {},
) {
  const { studio } = useApp();
  return useQuery({
    queryKey: [resource, studio?.id, params],
    queryFn: () => api<T>(`/${resource}?${qs(params)}`),
    enabled: !!studio && enabled,
    staleTime: 30000,
  });
}

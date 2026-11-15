import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { User } from '@supabase/supabase-js';
import { api, qs } from './api';
import { supabase } from './supabase';
import type { Studio, Me } from './types';
type Context = {
  studio?: Studio;
  studios: Studio[];
  setStudioId: (id: string) => void;
  user: User | null;
  me?: Me;
  authLoading: boolean;
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
  const [studio_id, setStudioId] = useState(localStorage.getItem('flowie-studio') || '');
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setAuthLoading(false);
    });
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
  const { data: studios = [] } = useQuery({
    queryKey: ['studios'],
    queryFn: () => api<Studio[]>('/studios'),
    retry: 1,
  });
  const studio = studios.find((s) => s.id === studio_id) || studios[0];
  const { data: me } = useQuery({
    queryKey: ['me', user?.id],
    queryFn: () => api<Me>('/auth/me'),
    enabled: !!user,
    staleTime: 30000,
  });
  const value = useMemo(
    () => ({
      studio,
      studios,
      setStudioId: (id: string) => {
        localStorage.setItem('flowie-studio', id);
        setStudioId(id);
      },
      user,
      me,
      authLoading,
      online,
      refreshMe: () => {
        qc.invalidateQueries({ queryKey: ['me'] });
      },
      logout: async () => {
        await supabase.auth.signOut();
        qc.clear();
      },
    }),
    [studio, studios, user, me, authLoading, online, qc],
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
    queryFn: () => api<T>(`/${resource}?${qs({ studio_id: studio!.id, ...params })}`),
    enabled: !!studio && enabled,
    staleTime: 30000,
  });
}

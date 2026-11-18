import { createClient } from '@supabase/supabase-js';
import { env } from '../../config/env.js';
// Every request uses the caller's JWT, keeping auth.uid() and RLS intact.

/** 使用公開 key 加本次使用者 JWT 建立 Supabase client；不繞過 RLS，也不使用 service role。 */ export function supabaseFor(
  token?: string,
) {
  return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    global: token ? { headers: { Authorization: `Bearer ${token}` } } : undefined,
  });
}

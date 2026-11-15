import { createClient } from '@supabase/supabase-js';
import { env } from './env.js';
// Every request uses the caller's JWT, keeping auth.uid() and RLS intact.
export function supabaseFor(token?: string) {
  return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    global: token ? { headers: { Authorization: `Bearer ${token}` } } : undefined,
  });
}

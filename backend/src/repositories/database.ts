import type { SupabaseClient } from '@supabase/supabase-js';
export async function rpc(db: SupabaseClient, name: string, args: Record<string, unknown>) {
  const { data, error } = await db.rpc(name, args);
  if (error) throw error;
  return data;
}
// PostgREST can encode a row-returning function as a one-element array.
export function singleRpcResult(value: unknown): unknown {
  if (Array.isArray(value)) {
    if (value.length !== 1) throw new Error('RPC_EXPECTED_SINGLE_ROW');
    return value[0];
  }
  if (value === null || value === undefined) throw new Error('RPC_EXPECTED_SINGLE_ROW');
  return value;
}
export async function rpcSingle(db: SupabaseClient, name: string, args: Record<string, unknown>) {
  return singleRpcResult(await rpc(db, name, args));
}

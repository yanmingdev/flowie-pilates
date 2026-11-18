import { type SupabaseClient } from '@supabase/supabase-js';

/** 使用本次請求的使用者憑證呼叫既有 RPC，保留 RLS／交易權限檢查。 */ export async function rpc(
  db: SupabaseClient,
  name: string,
  args: Record<string, unknown>,
) {
  const { data, error } = await db.rpc(name, args);
  if (error) throw error;
  return data;
}
// PostgREST can encode a row-returning function as a one-element array.

/** 相容 PostgREST 回傳物件或單元素陣列，避免預約結果形狀不一致。 */ export function singleRpcResult(
  value: unknown,
): unknown {
  if (Array.isArray(value)) {
    if (value.length !== 1) throw new Error('RPC_EXPECTED_SINGLE_ROW');
    return value[0];
  }
  if (value === null || value === undefined) throw new Error('RPC_EXPECTED_SINGLE_ROW');
  return value;
}

/** 呼叫 RPC 並將 PostgREST 單列結果正規化，拒絕缺列或多列。 */ export async function rpcSingle(
  db: SupabaseClient,
  name: string,
  args: Record<string, unknown>,
) {
  return singleRpcResult(await rpc(db, name, args));
}

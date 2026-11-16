import { supabase } from './supabase';
const base = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api/v1').replace(
  /\/$/,
  '',
);
export class ApiError extends Error {
  code: string;
  constructor(message: string, code: string) {
    super(message);
    this.code = code;
  }
}
export type ApiPage<T> = { data: T[]; meta: { page: number; limit: number; total: number } };
async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<{ data: T; meta?: ApiPage<unknown>['meta'] }> {
  if (!navigator.onLine && options.method && options.method !== 'GET')
    throw new ApiError('目前離線，請連線後再操作。', 'OFFLINE');
  const {
    data: { session },
  } = await supabase.auth.getSession();
  let response: Response;
  try { response = await fetch(`${base}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
      ...options.headers,
    },
    cache: 'no-store',
  }); } catch { throw new ApiError('無法連線到後端，請確認服務已啟動後重試。', 'NETWORK_ERROR'); }
  const json = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new ApiError(
      json.error?.message || '暫時無法取得資料，請稍後再試。',
      json.error?.code || 'NETWORK_ERROR',
    );
  return json as { data: T; meta?: ApiPage<unknown>['meta'] };
}
export async function api<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  return (await request<T>(path, options)).data;
}
export async function apiPage<T>(path: string): Promise<ApiPage<T>> {
  const result = await request<T[]>(path);
  if (!result.meta) throw new ApiError('分頁資料不完整，請稍後重試。', 'INVALID_RESPONSE');
  return { data: result.data, meta: result.meta };
}
// Load lookup lists using the server's pagination rather than silently dropping entries.
export async function apiAll<T>(resource: string, studio_id: string): Promise<T[]> {
  const rows: T[] = [];
  for (let page = 1; page <= 100; page++) {
    const result = await apiPage<T>(
      `/${resource}?${qs({ studio_id, page: String(page), limit: '100' })}`,
    );
    rows.push(...result.data);
    if (rows.length >= result.meta.total) return rows;
    if (!result.data.length) throw new ApiError('清單分頁資料不完整。', 'INVALID_RESPONSE');
  }
  throw new ApiError('清單超過可載入數量，請聯絡管理員。', 'TOO_MANY_ROWS');
}
export const post = <T = any>(path: string, body?: unknown) =>
  api<T>(path, { method: 'POST', body: JSON.stringify(body ?? {}) });
export const patch = <T = any>(path: string, body: unknown) =>
  api<T>(path, { method: 'PATCH', body: JSON.stringify(body) });
export const qs = (v: Record<string, string | undefined>) =>
  new URLSearchParams(
    Object.entries(v).filter(
      (entry): entry is [string, string] => entry[1] !== undefined && entry[1] !== '',
    ),
  ).toString();

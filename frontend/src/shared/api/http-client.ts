import { supabase } from '../auth/supabase-client';
const base = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api/v1').replace(
  /\/$/,
  '',
);
export class ApiError extends Error {
  code: string;

  /** 保存 API 錯誤訊息與機器可判讀代碼，供畫面重試與錯誤顯示。 */ constructor(
    message: string,
    code: string,
  ) {
    super(message);
    this.code = code;
  }
}
export type ApiPage<T> = { data: T[]; meta: { page: number; limit: number; total: number } };

/** 附上目前使用者 access token 並處理離線、連線與 API 錯誤；不快取個資回應。 */ async function request<
  T,
>(path: string, options: RequestInit = {}): Promise<{ data: T; meta?: ApiPage<unknown>['meta'] }> {
  if (!navigator.onLine && options.method && options.method !== 'GET')
    throw new ApiError('目前離線，請連線後再操作。', 'OFFLINE');
  const {
    data: { session },
  } = await supabase.auth.getSession();
  let response: Response;
  try {
    response = await fetch(`${base}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
        ...options.headers,
      },
      cache: 'no-store',
    });
  } catch {
    throw new ApiError('無法連線到後端，請確認服務已啟動後重試。', 'NETWORK_ERROR');
  }
  const json = await response.json().catch(/** 接收非同步失敗並執行現有錯誤處理。 */ () => ({}));
  if (!response.ok)
    throw new ApiError(
      json.error?.message || '暫時無法取得資料，請稍後再試。',
      json.error?.code || 'NETWORK_ERROR',
    );
  return json as { data: T; meta?: ApiPage<unknown>['meta'] };
}

/** 呼叫共用 HTTP client 並取出既有 data 包裝。 */ export async function api<T = any>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  return (await request<T>(path, options)).data;
}

/** 讀取分頁清單並驗證 meta 存在，避免誤把不完整資料當成完整清單。 */ export async function apiPage<
  T,
>(path: string): Promise<ApiPage<T>> {
  const result = await request<T[]>(path);
  if (!result.meta) throw new ApiError('分頁資料不完整，請稍後重試。', 'INVALID_RESPONSE');
  return { data: result.data, meta: result.meta };
}

/** 逐頁載入選單資料，遇中斷或超過上限時明確失敗，避免靜默遺漏。 */ export async function apiAll<T>(
  resource: string,
  studio_id: string,
): Promise<T[]> {
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
export const post = /** 以 JSON 發送 POST，沿用共用憑證及錯誤處理。 */ <T = any>(
  path: string,
  body?: unknown,
) => api<T>(path, { method: 'POST', body: JSON.stringify(body ?? {}) });
export const patch = /** 以 JSON 發送 PATCH，沿用共用憑證及錯誤處理。 */ <T = any>(
  path: string,
  body: unknown,
) => api<T>(path, { method: 'PATCH', body: JSON.stringify(body) });
export const qs = /** 移除未定義／空字串條件後編碼 query string。 */ (
  v: Record<string, string | undefined>,
) =>
  new URLSearchParams(
    Object.entries(v).filter(
      /** 依目前條件保留符合的項目，不修改原始清單。 */ (entry): entry is [string, string] =>
        entry[1] !== undefined && entry[1] !== '',
    ),
  ).toString();

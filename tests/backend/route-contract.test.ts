import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import type { Router } from 'express';

let router: Router;
beforeAll(
  /** 僅載入路由定義；不啟動 listener，也不向真實 Supabase 發出請求。 */ async () => {
    process.env.SUPABASE_URL = 'http://127.0.0.1:54321';
    process.env.SUPABASE_ANON_KEY = 'local-test-anon-key';
    router = (await import('../../backend/src/app/router.js')).default;
  },
);

type Layer = {
  route?: { path: string; methods: Record<string, boolean> };
  handle: { stack?: Layer[] };
};

/** 從 Express 實際註冊結果展開模組路由，涵蓋 catalog 動態產生的白名單端點。 */
function registeredRoutes(stack: Layer[]): string[][] {
  const result: string[][] = [];
  for (const layer of stack) {
    if (layer.route) {
      for (const method of Object.keys(layer.route.methods))
        result.push([method === '_all' ? 'all' : method, layer.route.path]);
    } else if (layer.handle.stack) result.push(...registeredRoutes(layer.handle.stack));
  }
  return result;
}

describe(
  'canonical module route contract',
  /** 確認清除舊路由後，現行 Express router 仍完整保留附件的 URL 與 HTTP 方法。 */ () => {
    it(
      'registers exactly the existing API routes, including generated resource routes',
      /** 比對執行時路由與既有基準，避免靜態檢查硬編碼清單掩蓋端點遺漏。 */ () => {
        const baseline = JSON.parse(
          readFileSync(
            new URL('../../docs/architecture/api-route-baseline.json', import.meta.url),
            'utf8',
          ),
        ) as string[][];
        expect(registeredRoutes(router.stack).sort()).toEqual(baseline.sort());
      },
    );
  },
);

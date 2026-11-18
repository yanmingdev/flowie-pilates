import { beforeAll, describe, expect, it } from 'vitest';
import { once } from 'node:events';
import type { Request } from 'express';
import { toServiceContext } from '../../backend/src/shared/http/service-context.js';
let createApp: typeof import('../../backend/src/app/create-app.js').createApp;
let startServer: typeof import('../../backend/src/server.js').startServer;
let registerShutdownHandlers: typeof import('../../backend/src/server.js').registerShutdownHandlers;
beforeAll(
  /** 使用本機測試公開設定載入伺服器模組，不連線真實 Supabase。 */ async () => {
    process.env.SUPABASE_URL = 'http://127.0.0.1:54321';
    process.env.SUPABASE_ANON_KEY = 'local-test-anon-key';
    createApp = (await import('../../backend/src/app/create-app.js')).createApp;
    ({ startServer, registerShutdownHandlers } = await import('../../backend/src/server.js'));
  },
);
describe(
  'Node and Express responsibility boundaries',
  /** 驗證應用工廠、Node HTTP 生命週期與 HTTP→服務邊界。 */ () => {
    it(
      'creates independent Express applications without listening',
      /** 工廠建立獨立 app，沒有連接埠或建表副作用。 */ () => {
        const first = createApp({
          frontendUrl: 'http://localhost:5173',
          enableRequestLogging: false,
        });
        const second = createApp({
          frontendUrl: 'http://localhost:5173',
          enableRequestLogging: false,
        });
        expect(first).not.toBe(second);
        expect(first.disabled('x-powered-by')).toBe(true);
      },
    );
    it(
      'starts on an ephemeral port and supports removable shutdown handlers',
      /** 由 Node server 層負責啟動與關閉，Express app 本身不持有 listener。 */ async () => {
        const app = createApp({
          frontendUrl: 'http://localhost:5173',
          enableRequestLogging: false,
        });
        const server = startServer({ app, port: 0, host: '127.0.0.1' });
        await once(server, 'listening');
        try {
          const address = server.address();
          if (!address || typeof address === 'string') throw Error('expected TCP address');
          const response = await fetch(`http://127.0.0.1:${address.port}/api/v1/health`);
          expect(await response.json()).toEqual({ status: 'ok' });
          const before = process.listenerCount('SIGTERM');
          const remove = registerShutdownHandlers(server);
          expect(process.listenerCount('SIGTERM')).toBe(before + 1);
          remove();
          expect(process.listenerCount('SIGTERM')).toBe(before);
        } finally {
          await new Promise<void>(
            /** 測試結束後關閉此 server，避免連接埠與事件監聽器洩漏。 */ (resolve, reject) =>
              server.close(
                /** 依 Node close 結果完成清理斷言。 */ (error) =>
                  error ? reject(error) : resolve(),
              ),
          );
        }
      },
    );
    it(
      'passes only DB and minimal identity into service',
      /** HTTP headers、body 與使用者 metadata 不可混入 service context。 */ () => {
        const req = {
          db: {},
          user: { id: 'student', email: 'student@example.test', user_metadata: { is_admin: true } },
          body: { is_admin: true },
          headers: { authorization: 'never-forward' },
        } as unknown as Request;
        const context = toServiceContext(req);
        expect(Object.keys(context).sort()).toEqual(['db', 'user']);
        expect(context.user).toEqual({ id: 'student', email: 'student@example.test' });
        expect(context.db).toBe(req.db);
      },
    );
  },
);

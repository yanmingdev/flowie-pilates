import { beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { type Express } from 'express';
import { singleRpcResult } from '../../backend/src/infrastructure/database/rpc.js';
let app: Express;
beforeAll(
  /** 建立本組測試需要的隔離 fixture。 */ async () => {
    process.env.SUPABASE_URL = 'http://127.0.0.1:54321';
    process.env.SUPABASE_ANON_KEY = 'local-test-anon-key';
    process.env.FRONTEND_URL = 'http://localhost:5173';
    app = (await import('../../backend/src/app/create-app.js')).createApp({frontendUrl:'http://localhost:5173',enableRequestLogging:false});
  },
);
describe(
  'API boundary without a Supabase server',
  /** 組織同一功能的測試案例，不接觸正式資料。 */ () => {
    it(
      'exposes health and security headers',
      /** 驗證目前測試案例的預期行為與錯誤邊界。 */ async () => {
        const r = await request(app).get('/api/v1/health');
        expect(r.status).toBe(200);
        expect(r.body.status).toBe('ok');
        expect(r.headers['x-content-type-options']).toBe('nosniff');
        expect(r.headers['x-powered-by']).toBeUndefined();
      },
    );
    it(
      'rejects unauthenticated booking',
      /** 驗證目前測試案例的預期行為與錯誤邊界。 */ async () => {
        const r = await request(app)
          .post('/api/v1/bookings')
          .send({ session_id: '00000000-0000-4000-8000-000000000001' });
        expect(r.status).toBe(401);
        expect(r.body.error.code).toBe('UNAUTHENTICATED');
      },
    );
    it(
      'rejects unauthenticated resource writes',
      /** 驗證目前測試案例的預期行為與錯誤邊界。 */ async () => {
        const r = await request(app).post('/api/v1/rooms').send({ name: 'test' });
        expect(r.status).toBe(401);
      },
    );
    it(
      'rejects unauthenticated attendance and credits',
      /** 驗證目前測試案例的預期行為與錯誤邊界。 */ async () => {
        expect((await request(app).post('/api/v1/attendance').send({})).status).toBe(401);
        expect((await request(app).post('/api/v1/student-packages').send({})).status).toBe(401);
      },
    );
    it(
      'rejects an invalid authorization scheme',
      /** 驗證目前測試案例的預期行為與錯誤邊界。 */ async () => {
        const r = await request(app).get('/api/v1/studios').set('Authorization', 'Basic fake');
        expect(r.status).toBe(401);
      },
    );
    it(
      'validates required query parameters before calling database',
      /** 驗證目前測試案例的預期行為與錯誤邊界。 */ async () => {
        const r = await request(app).get('/api/v1/sessions');
        expect(r.status).toBe(400);
        expect(r.body.error.code).toBe('VALIDATION_ERROR');
      },
    );
    it(
      'serves OpenAPI definition',
      /** 驗證目前測試案例的預期行為與錯誤邊界。 */ async () => {
        const r = await request(app).get('/api/openapi.json');
        expect(r.status).toBe(200);
        expect(r.body.openapi).toBe('3.0.3');
        expect(r.body.paths['/bookings']).toBeDefined();
      },
    );
  },
);

describe(
  'single-row RPC response shape',
  /** 組織同一功能的測試案例，不接觸正式資料。 */ () => {
    it(
      'accepts a one-row PostgREST array',
      /** 驗證目前測試案例的預期行為與錯誤邊界。 */ () =>
        expect(singleRpcResult([{ id: '123' }])).toEqual({ id: '123' }),
    );
    it(
      'accepts an object response',
      /** 驗證目前測試案例的預期行為與錯誤邊界。 */ () =>
        expect(singleRpcResult({ id: '123' })).toEqual({ id: '123' }),
    );
    it(
      'rejects a missing or unexpected multirow response',
      /** 驗證目前測試案例的預期行為與錯誤邊界。 */ () => {
        expect(
          /** 為隔離測試建立 fixture、接收本機服務結果或核對斷言；不接觸正式資料。 */ () =>
            singleRpcResult([]),
        ).toThrow();
        expect(
          /** 為隔離測試建立 fixture、接收本機服務結果或核對斷言；不接觸正式資料。 */ () =>
            singleRpcResult([{}, {}]),
        ).toThrow();
      },
    );
  },
);

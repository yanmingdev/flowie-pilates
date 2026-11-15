import { beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { singleRpcResult } from '../src/repositories/database.js';
let app: Express;
beforeAll(async () => {
  process.env.SUPABASE_URL = 'http://127.0.0.1:54321';
  process.env.SUPABASE_ANON_KEY = 'local-test-anon-key';
  process.env.FRONTEND_URL = 'http://localhost:5173';
  app = (await import('../src/app.js')).app;
});
describe('API boundary without a Supabase server', () => {
  it('exposes health and security headers', async () => {
    const r = await request(app).get('/api/v1/health');
    expect(r.status).toBe(200);
    expect(r.body.status).toBe('ok');
    expect(r.headers['x-content-type-options']).toBe('nosniff');
    expect(r.headers['x-powered-by']).toBeUndefined();
  });
  it('rejects unauthenticated booking', async () => {
    const r = await request(app)
      .post('/api/v1/bookings')
      .send({ session_id: '00000000-0000-4000-8000-000000000001' });
    expect(r.status).toBe(401);
    expect(r.body.error.code).toBe('UNAUTHENTICATED');
  });
  it('rejects unauthenticated resource writes', async () => {
    const r = await request(app).post('/api/v1/rooms').send({ name: 'test' });
    expect(r.status).toBe(401);
  });
  it('rejects unauthenticated attendance and credits', async () => {
    expect((await request(app).post('/api/v1/attendance').send({})).status).toBe(401);
    expect((await request(app).post('/api/v1/student-packages').send({})).status).toBe(401);
  });
  it('rejects an invalid authorization scheme', async () => {
    const r = await request(app).get('/api/v1/studios').set('Authorization', 'Basic fake');
    expect(r.status).toBe(401);
  });
  it('validates required query parameters before calling database', async () => {
    const r = await request(app).get('/api/v1/sessions');
    expect(r.status).toBe(400);
    expect(r.body.error.code).toBe('VALIDATION_ERROR');
  });
  it('serves OpenAPI definition', async () => {
    const r = await request(app).get('/api/openapi.json');
    expect(r.status).toBe(200);
    expect(r.body.openapi).toBe('3.0.3');
    expect(r.body.paths['/bookings']).toBeDefined();
  });
});

describe('single-row RPC response shape', () => {
  it('accepts a one-row PostgREST array', () =>
    expect(singleRpcResult([{ id: '123' }])).toEqual({ id: '123' }));
  it('accepts an object response', () =>
    expect(singleRpcResult({ id: '123' })).toEqual({ id: '123' }));
  it('rejects a missing or unexpected multirow response', () => {
    expect(() => singleRpcResult([])).toThrow();
    expect(() => singleRpcResult([{}, {}])).toThrow();
  });
});

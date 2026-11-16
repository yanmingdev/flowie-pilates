// Optional integration check using a real PostgREST binary and local PostgreSQL.
// Auth and Storage are simulated; this is not a managed Supabase instance.
import EmbeddedPostgres from 'embedded-postgres';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createHmac, randomUUID } from 'node:crypto';
import net from 'node:net';
import http from 'node:http';
import { seedDemoHistory } from './seed-demo-history.mjs';
const bin = process.env.POSTGREST_BINARY;
if (!bin) throw new Error('Set POSTGREST_BINARY to a PostgREST executable');
const freePort = () =>
  new Promise((resolve, reject) => {
    const s = net.createServer();
    s.once('error', reject);
    s.listen(0, '127.0.0.1', () => {
      const n = s.address().port;
      s.close(() => resolve(n));
    });
  });
const [port, httpPort] = [await freePort(), await freePort()];
const temporary = await mkdtemp(path.join(tmpdir(), 'flowie-postgrest-'));
const pg = new EmbeddedPostgres({
  databaseDir: path.join(temporary, 'db'),
  user: 'postgres',
  password: 'localtest',
  port,
  persistent: false,
  postgresFlags: ['-c', 'unix_socket_directories='],
  onLog: () => {},
  onError: (e) => console.error(e),
});
const secret = 'test-secret-not-for-production-0123456789';
const token = (id) => {
  const enc = (x) => Buffer.from(JSON.stringify(x)).toString('base64url');
  const body =
    enc({ alg: 'HS256', typ: 'JWT' }) +
    '.' +
    enc({ sub: id, role: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600 });
  return body + '.' + createHmac('sha256', secret).update(body).digest('base64url');
};
let client,
  service,
  apiService,
  proxy,
  errors = '';
let apiErrors = '';
async function request(method, endpoint, body, who, expect = 200) {
  const res = await fetch(`http://127.0.0.1:${httpPort}${endpoint}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(who ? { Authorization: 'Bearer ' + token(who) } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const payload = await res.json();
  if (res.status !== expect)
    throw new Error(`${method} ${endpoint}: ${res.status} ${JSON.stringify(payload)}`);
  return payload;
}
try {
  await pg.initialise();
  await pg.start();
  client = pg.getPgClient();
  await client.connect();
  await client.query(
    `create role anon;create role authenticated;create role authenticator noinherit login password 'localtest';grant anon,authenticated to authenticator;create schema extensions;create schema auth;create schema storage;create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb);create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claims',true)::jsonb->>'sub','')::uuid $$;grant usage on schema auth to authenticated,anon;grant execute on function auth.uid() to authenticated,anon;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text);create function storage.foldername(name text) returns text[] language sql immutable as $$ select string_to_array(name,'/') $$;`,
  );
  await client.query(await readFile('supabase/sql-editor/00_flowie_install_schema_and_seed.sql', 'utf8'));
  console.log('PASS combined SQL Editor schema and demo seed on PostgreSQL');
  for (const [file, marker] of [
    ['01_flowie_schema.sql', 'FLOWIE_EXISTING_TABLES'],
    ['02_flowie_demo_seed.sql', 'FLOWIE_DEMO_ALREADY_EXISTS'],
  ]) {
    try {
      await client.query(await readFile('supabase/sql-editor/' + file, 'utf8'));
      throw new Error('guard did not reject');
    } catch (e) {
      if (!e.message.includes(marker)) throw e;
      await client.query('rollback');
    }
  }
  try {
    await client.query(await readFile('supabase/sql-editor/03_first_platform_admin.sql', 'utf8'));
    throw new Error('administrator guard did not reject');
  } catch (e) {
    if (!e.message.includes('REPLACE_NULL_WITH_AUTH_USER_UUID')) throw e;
  }
  console.log('PASS SQL Editor duplicate and administrator guards');
  const studio = '10000000-0000-4000-8000-000000000001',
    pkg = '70000000-0000-4000-8000-000000000001',
    admin = randomUUID(),
    student = randomUUID();
  for (const id of [admin, student])
    await client.query('insert into auth.users(id,email,raw_user_meta_data) values($1,$2,$3)', [
      id,
      id + '@example.test',
      { full_name: id === admin ? 'Admin' : 'Student' },
    ]);
  await client.query(
    "insert into public.studio_memberships(studio_id,user_id,role) values($1,$2,'admin'),($1,$3,'student')",
    [studio, admin, student],
  );
  service = spawn(bin, [], {
    env: {
      ...process.env,
      PGRST_DB_URI: `postgresql://authenticator:localtest@127.0.0.1:${port}/postgres`,
      PGRST_DB_SCHEMAS: 'public',
      PGRST_DB_ANON_ROLE: 'anon',
      PGRST_JWT_SECRET: secret,
      PGRST_SERVER_HOST: '127.0.0.1',
      PGRST_SERVER_PORT: String(httpPort),
    },
  });
  service.stderr.on('data', (d) => (errors += d.toString()));
  let ready = false;
  for (let i = 0; i < 100; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${httpPort}/`);
      if (r.ok) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  if (!ready) throw new Error('PostgREST did not start: ' + errors);
  const embed = await request(
    'GET',
    `/class_sessions?select=*,courses(name),rooms(name),branches(name),teachers:teachers!class_sessions_studio_id_teacher_id_fkey(name)&studio_id=eq.${studio}`,
    null,
    admin,
  );
  if (!embed.length || !embed[0].courses?.name || !embed[0].teachers?.name || !embed[0].rooms?.name)
    throw new Error('PostgREST relationship embeds missing');
  console.log('PASS actual PostgREST session relationship embeds');
  const students = await request(
    'POST',
    '/rpc/list_students',
    { p_studio: studio, p_limit: 20, p_offset: 0, p_search: null },
    admin,
  );
  if (students.length !== 1 || students[0].student_id !== student)
    throw new Error('Student listing mismatch');
  console.log('PASS actual PostgREST student listing RPC');
  await request(
    'POST',
    '/rpc/issue_student_package',
    {
      p_studio: studio,
      p_student: student,
      p_package: pkg,
      p_key: 'grant-postgrest-123',
      p_starts: new Date(Date.now() - 5 * 86400000).toISOString(),
    },
    admin,
  );
  const seededHistory = await seedDemoHistory(client, studio, admin, [student]);
  const seededAgain = await seedDemoHistory(client, studio, admin, [student]);
  if (seededHistory !== 1 || seededAgain !== 0)
    throw new Error('Local demo history is not atomic and idempotent');
  const demoAttendance = await client.query(
    "select count(*)::int n from public.attendance where status='present'",
  );
  if (demoAttendance.rows[0].n !== 1) throw new Error('Local demo attendance missing');
  console.log('PASS local demo history and attendance transaction');
  const session = embed.find(
    (x) => x.status === 'scheduled' && new Date(x.starts_at).getTime() > Date.now() + 86400000,
  );
  const booking = await request(
    'POST',
    '/rpc/book_class_session',
    { p_session: session.id, p_key: 'book-postgrest-123' },
    student,
  );
  if (!booking.cancellation_deadline_at) throw new Error('Missing saved deadline');
  const list = await request(
    'POST',
    '/rpc/list_bookings',
    { p_studio: studio, p_student: student },
    student,
  );
  if (!list.some((x) => x.id === booking.id && x.cancellation_deadline_at))
    throw new Error('Booking list mismatch');
  console.log('PASS actual PostgREST booking and history RPC');
  const records = await request(
    'POST',
    '/rpc/teaching_records',
    {
      p_studio: studio,
      p_from: new Date(Date.now() - 86400000).toISOString(),
      p_to: new Date(Date.now() + 40 * 86400000).toISOString(),
    },
    admin,
  );
  if (!records.length) throw new Error('No teaching records');
  console.log('PASS actual PostgREST teaching records RPC');
  // Minimal local proxy: PostgREST is real; Auth verifies a test JWT with the same test secret.
  const proxyPort = await freePort();
  const apiPort = await freePort();
  proxy = http.createServer((req, res) => {
    if (req.url === '/auth/v1/user') {
      const value = (req.headers.authorization || '').replace(/^Bearer /, '');
      const [h, p, sig] = value.split('.');
      const expected =
        h && p
          ? createHmac('sha256', secret)
              .update(h + '.' + p)
              .digest('base64url')
          : '';
      if (!sig || sig !== expected) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: 'invalid token' }));
        return;
      }
      const claims = JSON.parse(Buffer.from(p, 'base64url').toString());
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ id: claims.sub, email: claims.sub + '@example.test' }));
      return;
    }
    if (!req.url?.startsWith('/rest/v1/')) {
      res.writeHead(404);
      res.end();
      return;
    }
    const target = http.request(
      {
        host: '127.0.0.1',
        port: httpPort,
        path: req.url.slice('/rest/v1'.length),
        method: req.method,
        headers: { ...req.headers, host: `127.0.0.1:${httpPort}` },
      },
      (upstream) => {
        res.writeHead(upstream.statusCode || 500, upstream.headers);
        upstream.pipe(res);
      },
    );
    target.on('error', () => {
      res.writeHead(502);
      res.end();
    });
    req.pipe(target);
  });
  await new Promise((resolve) => proxy.listen(proxyPort, '127.0.0.1', resolve));
  apiService = spawn(process.execPath, ['backend/dist/index.js'], {
    env: {
      ...process.env,
      PORT: String(apiPort),
      FRONTEND_URL: 'http://localhost:5173',
      SUPABASE_URL: `http://127.0.0.1:${proxyPort}`,
      SUPABASE_ANON_KEY: 'local-anon-key',
    },
  });
  apiService.stderr.on('data', (d) => (apiErrors += d.toString()));
  let apiReady = false;
  for (let i = 0; i < 100; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${apiPort}/api/v1/health`);
      if (r.ok) {
        apiReady = true;
        break;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  if (!apiReady) throw new Error('API did not start: ' + apiErrors);
  async function appRequest(method, endpoint, who, body, expectedStatus = 200) {
    const response = await fetch(`http://127.0.0.1:${apiPort}/api/v1${endpoint}`, {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token(who) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const payload = await response.json();
    if (response.status !== expectedStatus)
      throw new Error(`API ${method} ${endpoint}: ${response.status} ${JSON.stringify(payload)}`);
    return payload;
  }
  const me = await appRequest('GET', '/auth/me', admin);
  if (typeof me.data.is_super_admin !== 'boolean' || !me.data.memberships.length)
    throw new Error('API auth/me naming or membership mismatch');
  const page = await appRequest('GET', `/students?studio_id=${studio}&page=1&limit=20`, admin);
  if (page.meta.total !== 1 || page.data[0].student_id !== student)
    throw new Error('API student pagination mismatch');
  await appRequest('PATCH', `/students/${student}/profile`, admin, {
    studio_id: studio,
    full_name: 'Updated Student',
    phone: null,
    birthday: null,
    notes: 'test',
  });
  const updated = await appRequest('GET', `/students?studio_id=${studio}&q=Updated`, admin);
  if (updated.data[0]?.notes !== 'test') throw new Error('API student update mismatch');
  const courseId = '60000000-0000-4000-8000-000000000001';
  await appRequest('POST', '/favorites', student, {
    studio_id: studio,
    course_id: courseId,
    is_favorite: true,
  });
  const favoriteList = await appRequest('GET', `/favorites?studio_id=${studio}`, student);
  const otherFavoriteList = await appRequest('GET', `/favorites?studio_id=${studio}`, admin);
  if (favoriteList.data.length !== 1 || otherFavoriteList.data.length !== 0)
    throw new Error('Favorites are not scoped to current user');
  await appRequest('POST', '/favorites', student, {
    studio_id: studio,
    course_id: courseId,
    is_favorite: false,
  });
  if ((await appRequest('GET', `/favorites?studio_id=${studio}`, student)).data.length)
    throw new Error('Favorite not removed');
  const packages = await appRequest(
    'GET',
    `/student-packages?studio_id=${studio}&scope=mine`,
    student,
  );
  if (packages.data.length !== 1 || !packages.data[0].course_packages?.name)
    throw new Error('API student package relation mismatch');
  const history = await appRequest(
    'GET',
    `/students/${student}/history?studio_id=${studio}`,
    admin,
  );
  if (!history.data.packages.length || !history.data.ledger.length || !history.data.bookings.length)
    throw new Error('API student history mismatch');
  const from = new Date(Date.now() - 86400000).toISOString(),
    to = new Date(Date.now() + 40 * 86400000).toISOString();
  const sessions = await appRequest(
    'GET',
    `/sessions/manage?studio_id=${studio}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
    admin,
  );
  if (!sessions.data.length || !sessions.data[0].teachers?.name)
    throw new Error('API session relationships missing');
  const different = sessions.data.find(
    (x) =>
      x.id !== session.id &&
      x.status === 'scheduled' &&
      new Date(x.starts_at).getTime() > Date.now() + 86400000,
  );
  const newStart = new Date(new Date(different.starts_at).getTime() + 6 * 3600000);
  const scheduleBody = {
    studio_id: studio, branch_id: different.branch_id, room_id: different.room_id,
    course_id: different.course_id, teacher_id: different.teacher_id,
    starts_at: newStart.toISOString(), ends_at: new Date(+newStart + 3600000).toISOString(),
    capacity: 5, booking_opens_at: new Date(Date.now() - 7200000).toISOString(),
    booking_closes_at: new Date(+newStart - 3600000).toISOString(),
    cancellation_deadline: null, until_date: null,
  };
  const deadlineSession = await appRequest('POST', '/sessions', admin, scheduleBody, 201);
  if (!deadlineSession.data[0]?.booking_closes_at) throw new Error('Schedule deadline missing');
  const pastClose = new Date(Date.now() - 3600000).toISOString();
  const changed = await appRequest('PATCH', `/sessions/${deadlineSession.data[0].id}`, admin,
    { ...scheduleBody, booking_closes_at: pastClose });
  if (!changed.data.booking_closes_at) throw new Error('Updated deadline missing');
  const closedResult = await appRequest('POST', '/bookings', student,
    { session_id: deadlineSession.data[0].id, idempotency_key: 'closed-booking-test-01' }, 400);
  if (closedResult.error.code !== 'BOOKING_CLOSED') throw new Error('Late booking not rejected');
  console.log('PASS Express schedule/update and booking deadline enforcement');
  const created = await appRequest(
    'POST',
    '/bookings',
    student,
    { session_id: different.id, idempotency_key: 'book-api-integration-123' },
    201,
  );
  if (!created.data.cancellation_deadline_at) throw new Error('API booking deadline missing');
  await appRequest('POST', `/bookings/${created.data.id}/cancel`, student, {});
  const catalog = await appRequest(
    'GET',
    `/sessions?studio_id=${studio}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
    student,
  );
  if (
    !catalog.data.length ||
    !('course_description' in catalog.data[0]) ||
    !catalog.data[0].duration_minutes ||
    !('booking_closes_at' in catalog.data[0])
  )
    throw new Error('Course detail fields missing');
  const metrics = await appRequest(
    'GET',
    `/reports/metrics?studio_id=${studio}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
    admin,
  );
  if (
    metrics.data.room_utilization_rate == null ||
    Number(metrics.data.room_utilization_rate) > 100
  )
    throw new Error('Room utilization incorrect');
  await appRequest(
    'GET',
    `/reports/metrics?studio_id=${studio}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
    student,
    undefined,
    403,
  );
  await client.query('update public.courses set name=$1 where id=$2', [
    'DB updated course',
    courseId,
  ]);
  await client.query('update public.banners set title=$1 where studio_id=$2', [
    'DB updated banner',
    studio,
  ]);
  const refreshedCourses = await appRequest('GET', `/courses?studio_id=${studio}`, admin);
  const refreshedBanners = await appRequest('GET', `/banners?studio_id=${studio}`, admin);
  if (
    !refreshedCourses.data.some((x) => x.name === 'DB updated course') ||
    refreshedBanners.data[0]?.title !== 'DB updated banner'
  )
    throw new Error('Database-driven content did not refresh');
  console.log(
    'PASS Express favorites isolation, business metrics and database-driven course/banner updates',
  );
  const taught = await appRequest(
    'GET',
    `/teaching-records?studio_id=${studio}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
    admin,
  );
  if (!taught.data.length) throw new Error('API teaching records missing');
  console.log(
    'PASS Express API + actual PostgREST + simulated Auth: identity, pagination, student edit, session list, booking/cancel, teaching records',
  );
} catch (e) {
  console.error('FAIL', e.message);
  process.exitCode = 1;
} finally {
  if (apiService) {
    if (apiService.exitCode === null) {
      apiService.kill('SIGTERM');
      await new Promise((r) => apiService.once('exit', r));
    }
  }
  if (proxy) await new Promise((r) => proxy.close(r));
  if (service) {
    service.kill('SIGTERM');
    await new Promise((r) => service.once('exit', r));
  }
  if (client) await client.end();
  await pg.stop().catch(() => {});
  await rm(temporary, { recursive: true, force: true });
}

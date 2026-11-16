import EmbeddedPostgres from 'embedded-postgres';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import net from 'node:net';
import { randomUUID } from 'node:crypto';
const project = process.cwd();
const temporary = await mkdtemp(path.join(tmpdir(), 'flowie-pg-test-'));
const port = await new Promise((resolve, reject) => {
  const server = net.createServer();
  server.once('error', reject);
  server.listen(0, '127.0.0.1', () => {
    const address = server.address();
    server.close(() => resolve(address.port));
  });
});
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
const clients = [];
let owner;
try {
  await pg.initialise();
  await pg.start();
  owner = pg.getPgClient();
  await owner.connect();
  await owner.query(
    `create role anon;create role authenticated;create schema extensions;create schema auth;create schema storage;create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb);create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;grant usage on schema auth to authenticated,anon;grant execute on function auth.uid() to authenticated,anon;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text);create function storage.foldername(name text) returns text[] language sql immutable as $$ select string_to_array(name,'/') $$;`,
  );
  for (const f of [
    'supabase/migrations/20261114000100_core.sql',
    'supabase/migrations/20261114000200_security.sql',
    'supabase/migrations/20261114000300_transactions.sql',
    'supabase/migrations/20261114000400_management.sql',
    'supabase/migrations/20261114000500_platform.sql',
    'supabase/migrations/20261114000600_teacher_membership.sql',
    'supabase/migrations/20261114000700_room_capacity.sql',
    'supabase/migrations/20261114000800_teacher_catalog.sql',
    'supabase/migrations/20261114000900_integrity_and_student_records.sql',
    'supabase/migrations/20261115001000_frontend_data_model.sql',
    'supabase/migrations/20261115001100_booking_deadline.sql',
    'supabase/seed.sql',
  ]) {
    await owner.query(await readFile(project + '/' + f, 'utf8'));
    console.log('PASS PostgreSQL', f);
  }
  const studio = '10000000-0000-4000-8000-000000000001',
    pkg = '70000000-0000-4000-8000-000000000001',
    admin = randomUUID(),
    students = Array.from({ length: 5 }, () => randomUUID());
  for (const id of [admin, ...students])
    await owner.query('insert into auth.users(id,email,raw_user_meta_data) values($1,$2,$3)', [
      id,
      `${id}@example.test`,
      { full_name: id },
    ]);
  await owner.query(
    'insert into public.studio_memberships(studio_id,user_id,role) values($1,$2,$3)',
    [studio, admin, 'admin'],
  );
  for (const id of students)
    await owner.query(
      'insert into public.studio_memberships(studio_id,user_id,role) values($1,$2,$3)',
      [studio, id, 'student'],
    );
  await owner.query('set role authenticated');
  await owner.query("select set_config('request.jwt.claim.sub',$1,false)", [admin]);
  for (const id of students)
    await owner.query('select public.issue_student_package($1,$2,$3,$4)', [
      studio,
      id,
      pkg,
      'grant-' + id,
    ]);
  await owner.query('reset role');
  const { rows } = await owner.query(
    "select id from public.class_sessions where starts_at>now()+interval '2 days' and status='scheduled' order by starts_at limit 3",
  );
  const [one, two, three] = rows.map((x) => x.id);
  await owner.query('update public.class_sessions set capacity=1 where id=$1', [one]);
  for (const id of students) {
    const c = pg.getPgClient();
    await c.connect();
    clients.push(c);
    await c.query('set role authenticated');
    await c.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
  }
  const concurrent = await Promise.allSettled(
    clients.map((c, i) =>
      c.query('select public.book_class_session($1,$2)', [
        one,
        'parallel-' + i + '-' + randomUUID(),
      ]),
    ),
  );
  const successes = concurrent.filter((x) => x.status === 'fulfilled').length,
    failures = concurrent.filter(
      (x) => x.status === 'rejected' && x.reason.message.includes('SESSION_FULL'),
    ).length;
  const counts = await owner.query(
    "select count(*)::int n from public.bookings where session_id=$1 and status='confirmed'",
    [one],
  );
  if (successes !== 1 || failures !== 4 || counts.rows[0].n !== 1)
    throw new Error(`Overbooking check failed ${successes}/${failures}/${counts.rows[0].n}`);
  console.log(
    'PASS concurrent final seat: 5 simultaneous requests, 1 success, 4 SESSION_FULL, 1 booking',
  );
  const winner = concurrent.findIndex((x) => x.status === 'fulfilled');
  const winnerId = students[winner];
  await owner.query('set role authenticated');
  await owner.query("select set_config('request.jwt.claim.sub',$1,false)", [admin]);
  const packRow = await owner.query(
    'select id,balance from public.student_packages where student_id=$1',
    [winnerId],
  );
  await owner.query('select public.adjust_student_credits($1,$2,$3,$4)', [
    packRow.rows[0].id,
    1 - packRow.rows[0].balance,
    'Parallel test',
    'adjust-' + randomUUID(),
  ]);
  await owner.query('reset role');
  const c1 = clients[winner],
    c2 = pg.getPgClient();
  await c2.connect();
  clients.push(c2);
  await c2.query('set role authenticated');
  await c2.query("select set_config('request.jwt.claim.sub',$1,false)", [winnerId]);
  const creditRace = await Promise.allSettled([
    c1.query('select public.book_class_session($1,$2)', [two, 'credit-a-' + randomUUID()]),
    c2.query('select public.book_class_session($1,$2)', [three, 'credit-b-' + randomUUID()]),
  ]);
  const ok = creditRace.filter((x) => x.status === 'fulfilled').length;
  const failed = creditRace.filter(
    (x) => x.status === 'rejected' && x.reason.message.includes('NO_VALID_PACKAGE_OR_CREDITS'),
  ).length;
  const bal = await owner.query('select balance from public.student_packages where student_id=$1', [
    winnerId,
  ]);
  if (ok !== 1 || failed !== 1 || bal.rows[0].balance !== 0)
    throw new Error(`Credit race failed ${ok}/${failed}/${bal.rows[0].balance}`);
  console.log('PASS concurrent credit: 2 simultaneous sessions, 1 credit, 1 success, balance 0');
  const adminConnections = [];
  for (let i = 0; i < 2; i++) {
    const c = pg.getPgClient();
    await c.connect();
    clients.push(c);
    adminConnections.push(c);
    await c.query('set role authenticated');
    await c.query("select set_config('request.jwt.claim.sub',$1,false)", [admin]);
  }
  const targetDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Taipei' }).format(
    new Date(Date.now() + 20 * 86400000),
  );
  const starts = new Date(`${targetDate}T15:00:00+08:00`).toISOString(),
    ends = new Date(`${targetDate}T16:00:00+08:00`).toISOString();
  const branch = '20000000-0000-4000-8000-000000000001',
    room = '30000000-0000-4000-8000-000000000001',
    course = '60000000-0000-4000-8000-000000000001',
    teacher = '40000000-0000-4000-8000-000000000001';
  const args = [
    studio,
    branch,
    room,
    course,
    teacher,
    starts,
    ends,
    8,
    new Date().toISOString(),
    null,
    null,
  ];
  const scheduling = await Promise.allSettled(
    adminConnections.map((c) =>
      c.query('select public.schedule_class_sessions($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)', args),
    ),
  );
  const scheduled = scheduling.filter((x) => x.status === 'fulfilled').length,
    conflicts = scheduling.filter(
      (x) => x.status === 'rejected' && x.reason.code === '23P01',
    ).length;
  const stored = await owner.query(
    'select count(*)::int n from public.class_sessions where room_id=$1 and starts_at=$2',
    [room, starts],
  );
  if (scheduled !== 1 || conflicts !== 1 || stored.rows[0].n !== 1)
    throw new Error(`Concurrent schedule failed ${scheduled}/${conflicts}/${stored.rows[0].n}`);
  console.log(
    'PASS concurrent scheduling: 2 simultaneous requests, 1 success, 1 conflict, 1 session',
  );
  console.log(
    'NOTE: PostgreSQL 15 with local Auth/Storage shims, not a Supabase integration test.',
  );
} catch (e) {
  console.error('FAIL', e.message);
  process.exitCode = 1;
} finally {
  for (const c of clients) await c.end().catch(() => {});
  if (owner) await owner.end().catch(() => {});
  await pg.stop().catch(() => {});
  await rm(temporary, { recursive: true, force: true });
}

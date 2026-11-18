// Isolated local PostgreSQL; no access to the user's Supabase project.
import EmbeddedPostgres from 'embedded-postgres';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import net from 'node:net';
import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';
const dir = await mkdtemp(path.join(tmpdir(), 'flowie-v1-'));
const port = await new Promise(
  /** 為隔離測試建立 fixture、接收本機服務結果或核對斷言；不接觸正式資料。 */ (resolve, reject) => {
    const s = net.createServer();
    s.on('error', reject);
    s.listen(
      0,
      '127.0.0.1',
      /** 處理隔離測試服務的啟動、關閉或事件通知。 */ () => {
        const p = s.address().port;
        s.close(/** 處理隔離測試服務的啟動、關閉或事件通知。 */ () => resolve(p));
      },
    );
  },
);
const pg = new EmbeddedPostgres({
  databaseDir: path.join(dir, 'db'),
  user: 'postgres',
  password: 'localtest',
  port,
  persistent: false,
  postgresFlags: ['-c', 'unix_socket_directories='],

  onLog: /** 略過測試 PostgreSQL 的一般日誌，保留案例的 PASS／FAIL 結果。 */ () => {},

  onError: /** 保留操作失敗資訊供畫面顯示，不將失敗當成成功。 */ () => {},
});
let owner;
const clients = [];
try {
  await pg.initialise();
  await pg.start();
  owner = pg.getPgClient();
  await owner.connect();
  await owner.query(
    `create role anon;create role authenticated;create schema extensions;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;`,
  );
  for (const f of [
    'supabase/sql/01_Flowie_建立資料表.sql',
    'supabase/sql/02_Flowie_新增示範資料.sql',
    'supabase/sql/05_flowie_v1_api_and_transactions.sql',
    'supabase/sql/06_flowie_v1_report_session_count.sql',
  ])
    await owner.query(await readFile(f, 'utf8'));
  const admin = randomUUID(),
    teacher = randomUUID(),
    students = Array.from(
      { length: 4 },
      /** 為隔離測試建立 fixture、接收本機服務結果或核對斷言；不接觸正式資料。 */ () =>
        randomUUID(),
    ),
    pkg = '70000000-0000-4000-8000-000000000002',
    room = '30000000-0000-4000-8000-000000000001',
    course = '60000000-0000-4000-8000-000000000001';
  for (const id of [admin, teacher, ...students])
    await owner.query('insert into auth.users(id) values($1)', [id]);
  await owner.query("update public.profiles set display_name='Local test'");
  await owner.query('update public.profiles set is_admin=true where id=$1', [admin]);
  await owner.query('insert into public.teachers(id) values($1)', [teacher]);
  const sessions = Array.from(
    { length: 3 },
    /** 為隔離測試建立 fixture、接收本機服務結果或核對斷言；不接觸正式資料。 */ () => randomUUID(),
  );
  for (let i = 0; i < sessions.length; i++)
    await owner.query(
      `insert into public.class_sessions(id,room_id,course_id,teacher_id,starts_at,ends_at,capacity) values($1,$2,$3,$4,now()+($5::int)*interval '1 day',now()+($5::int)*interval '1 day'+interval '1 hour',1)`,
      [sessions[i], room, course, teacher, i + 2],
    );
  await owner.query('set role authenticated');
  await owner.query("select set_config('request.jwt.claim.sub',$1,false)", [admin]);
  for (const id of students)
    await owner.query('select * from public.flowie_v1_issue_package($1,$2,$3,null)', [
      id,
      pkg,
      'grant-' + id,
    ]);
  await owner.query('reset role');
  for (const id of students) {
    const c = pg.getPgClient();
    await c.connect();
    clients.push(c);
    await c.query('set role authenticated');
    await c.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
  }
  const race = await Promise.allSettled(
    clients.map(
      /** 將每個項目轉換為本次清單需要的資料或元件。 */ (c, i) =>
        c.query('select * from public.flowie_v1_book($1,$2)', [sessions[0], 'book-' + students[i]]),
    ),
  );
  assert.equal(
    race.filter(/** 依目前條件保留符合的項目，不修改原始清單。 */ (x) => x.status === 'fulfilled')
      .length,
    1,
  );
  assert.equal(
    race.filter(
      /** 依目前條件保留符合的項目，不修改原始清單。 */ (x) =>
        x.status === 'rejected' && x.reason.message.includes('SESSION_FULL'),
    ).length,
    3,
  );
  const count = await owner.query(
    "select count(*)::int n from public.bookings where session_id=$1 and status='confirmed'",
    [sessions[0]],
  );
  assert.equal(count.rows[0].n, 1);
  console.log('PASS concurrent seat: 4 simultaneous requests, exactly 1 confirmed');
  const wi = race.findIndex(
      /** 為隔離測試建立 fixture、接收本機服務結果或核對斷言；不接觸正式資料。 */ (x) =>
        x.status === 'fulfilled',
    ),
    winner = students[wi];
  const pack = await owner.query('select id from public.student_packages where student_id=$1', [
    winner,
  ]);
  await owner.query('set role authenticated');
  await owner.query("select set_config('request.jwt.claim.sub',$1,false)", [admin]);
  await owner.query(
    "select * from public.flowie_v1_adjust_credits($1,-3,'local test','adjust-concurrency')",
    [pack.rows[0].id],
  );
  await owner.query('reset role');
  const second = pg.getPgClient();
  await second.connect();
  clients.push(second);
  await second.query('set role authenticated');
  await second.query("select set_config('request.jwt.claim.sub',$1,false)", [winner]);
  const retries = await Promise.all([
    clients[wi].query('select * from public.flowie_v1_book($1,$2)', [
      sessions[0],
      'book-' + winner,
    ]),
    second.query('select * from public.flowie_v1_book($1,$2)', [sessions[0], 'book-' + winner]),
  ]);
  assert.equal(retries[0].rows[0].id, retries[1].rows[0].id);
  const debits = await owner.query(
    'select count(*)::int n from public.credit_ledger where idempotency_key=$1',
    ['book-' + winner],
  );
  assert.equal(debits.rows[0].n, 1);
  console.log('PASS concurrent retry: same request returned the same booking without extra debit');
  const credit = await Promise.allSettled([
    clients[wi].query('select * from public.flowie_v1_book($1,$2)', [
      sessions[1],
      'credit-race-first',
    ]),
    second.query('select * from public.flowie_v1_book($1,$2)', [sessions[2], 'credit-race-second']),
  ]);
  assert.equal(
    credit.filter(/** 依目前條件保留符合的項目，不修改原始清單。 */ (x) => x.status === 'fulfilled')
      .length,
    1,
  );
  assert.equal(
    credit.filter(
      /** 依目前條件保留符合的項目，不修改原始清單。 */ (x) =>
        x.status === 'rejected' && x.reason.message.includes('NO_VALID_PACKAGE_OR_CREDITS'),
    ).length,
    1,
  );
  const balance = await owner.query(
    'select sum(delta)::int n from public.credit_ledger where student_package_id=$1',
    [pack.rows[0].id],
  );
  assert.equal(balance.rows[0].n, 0);
  console.log('PASS concurrent credits: 2 simultaneous requests for 1 credit, 1 success');
  console.log(
    'LIMITATION local PostgreSQL with simulated Auth; not a hosted Supabase integration test.',
  );
} catch (e) {
  console.error('FAIL', e.stack);
  process.exitCode = 1;
} finally {
  for (const c of clients) await c.end().catch(/** 接收非同步失敗並執行現有錯誤處理。 */ () => {});
  if (owner) await owner.end().catch(/** 接收非同步失敗並執行現有錯誤處理。 */ () => {});
  await pg.stop().catch(/** 接收非同步失敗並執行現有錯誤處理。 */ () => {});
  await rm(dir, { recursive: true, force: true });
}

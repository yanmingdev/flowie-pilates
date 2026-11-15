// Exercises the migration functions against PGlite with a small auth/storage shim.
// This is NOT a real Supabase environment and does not prove concurrent behavior.
import { PGlite } from '@electric-sql/pglite';
import { btree_gist } from '@electric-sql/pglite/contrib/btree_gist';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';
import { readFile } from 'node:fs/promises';
const db = await PGlite.create({ extensions: { btree_gist, pgcrypto } });
let checks = 0;
const a = 'aaaaaaaa-0000-4000-8000-000000000001',
  s = 'aaaaaaaa-0000-4000-8000-000000000002',
  s2 = 'aaaaaaaa-0000-4000-8000-000000000003',
  outsider = 'aaaaaaaa-0000-4000-8000-000000000004',
  studio = '10000000-0000-4000-8000-000000000001',
  pack = '70000000-0000-4000-8000-000000000001';
const assert = (v, msg) => {
  if (!v) throw new Error(msg);
  checks++;
  console.log('PASS', msg);
};
async function raises(sql, expected, params = []) {
  try {
    await db.query(sql, params);
    throw new Error('Did not reject: ' + expected);
  } catch (e) {
    if (!e.message.includes(expected)) throw e;
    assert(true, expected);
  }
}
async function as(user) {
  await db.exec(
    `reset role; select set_config('request.jwt.claim.sub','${user}',false); set role authenticated;`,
  );
}
try {
  await db.exec(
    `create role anon;create role authenticated;create schema extensions;create schema auth;create schema storage;create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb);create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;grant usage on schema auth to authenticated,anon;grant execute on function auth.uid() to authenticated,anon;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text);create function storage.foldername(name text) returns text[] language sql immutable as $$ select string_to_array(name,'/') $$;`,
  );
  for (const file of [
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
  ])
    await db.exec(await readFile(file, 'utf8'));
  for (const [id, name] of [
    [a, 'Admin'],
    [s, 'Student A'],
    [s2, 'Student B'],
    [outsider, 'Other tenant'],
  ])
    await db.query('insert into auth.users(id,email,raw_user_meta_data) values($1,$2,$3)', [
      id,
      `${id}@example.test`,
      { full_name: name },
    ]);
  await db.exec(
    `insert into public.studio_memberships(studio_id,user_id,role) values('${studio}','${a}','admin');`,
  );
  await as(s);
  await db.query(`select public.join_studio('${studio}')`);
  await as(s2);
  await db.query(`select public.join_studio('${studio}')`);
  const favoriteCourse = '60000000-0000-4000-8000-000000000001';
  await as(s);
  await db.query('select public.set_course_favorite($1,$2,true)', [studio, favoriteCourse]);
  await db.query('select public.set_course_favorite($1,$2,true)', [studio, favoriteCourse]);
  const favorites = await db.query('select * from public.favorite_courses($1)', [studio]);
  assert(
    favorites.rows.length === 1 && favorites.rows[0].course_id === favoriteCourse,
    'favorite retry creates one course relationship',
  );
  await raises(
    'insert into public.course_favorites(studio_id,student_id,course_id) values($1,$2,$3)',
    'permission denied',
    [studio, s2, favoriteCourse],
  );
  await as(s2);
  const otherFavorites = await db.query('select * from public.favorite_courses($1)', [studio]);
  assert(otherFavorites.rows.length === 0, 'another student cannot see favorites');
  await as(s);
  await db.query('select public.set_course_favorite($1,$2,false)', [studio, favoriteCourse]);
  assert(
    (await db.query('select * from public.favorite_courses($1)', [studio])).rows.length === 0,
    'favorite can be removed',
  );
  await as(a);
  await db.query(
    `select public.issue_student_package('${studio}','${s}','${pack}','student-a-grant')`,
  );
  await db.query(
    `select public.issue_student_package('${studio}','${s}','${pack}','student-a-grant')`,
  );
  const granted = await db.query(
    `select count(*)::int n from public.student_packages where student_id='${s}'`,
  );
  assert(granted.rows[0].n === 1, 'same grant request cannot create two packages');
  await db.query(
    `select public.issue_student_package('${studio}','${s2}','${pack}','student-b-grant')`,
  );
  const deadlineTarget = (await db.query(`select * from public.class_sessions
    where status='scheduled' and starts_at>now()+interval '20 days' order by starts_at desc limit 1`)).rows[0];
  const deadline = new Date(Date.now()-3600000).toISOString();
  const opening = new Date(Date.now()-7200000).toISOString();
  const changedDeadline = await db.query(`select * from public.update_class_session_with_deadline($1,$2,$3,$4,$5,$6,$7,$8,$9,null,$10)`,
    [deadlineTarget.id,deadlineTarget.branch_id,deadlineTarget.room_id,deadlineTarget.course_id,deadlineTarget.teacher_id,deadlineTarget.starts_at,deadlineTarget.ends_at,deadlineTarget.capacity,opening,deadline]);
  assert(!!changedDeadline.rows[0].booking_closes_at, 'admin can configure a booking deadline');
  await as(s);
  await raises('select public.book_class_session($1,$2)', 'BOOKING_CLOSED', [deadlineTarget.id,'deadline-test-01']);
  await as(a);
  const {
    rows: [session],
  } = await db.query(
    `select id from public.class_sessions where starts_at>now()+interval '2 days' and status='scheduled' order by starts_at limit 1`,
  );
  await db.exec('reset role');
  await db.query(`update public.class_sessions set capacity=1 where id=$1`, [session.id]);
  await as(s);
  const {
    rows: [result],
  } = await db.query(
    `select (public.book_class_session('${session.id}','request-student-a-01')).*`,
  );
  assert(result.credits_charged === 1, 'booking succeeds and charges current course credits');
  const {
    rows: [retry],
  } = await db.query(
    `select (public.book_class_session('${session.id}','request-student-a-01')).*`,
  );
  assert(retry.id === result.id, 'same request key returns the same booking');
  await raises(
    `select public.book_class_session('${session.id}','request-student-a-02')`,
    'ALREADY_BOOKED',
  );
  const {
    rows: [balance],
  } = await db.query('select balance from public.student_packages');
  assert(balance.balance === 9, 'booking reduced balance once');
  const otherRows = await db.query(
    `select * from public.student_packages where student_id='${s2}'`,
  );
  assert(otherRows.rows.length === 0, 'student cannot read another student package through RLS');
  await as(s2);
  await raises(
    `select public.book_class_session('${session.id}','request-student-b-01')`,
    'SESSION_FULL',
  );
  await raises(`select public.cancel_class_booking('${result.id}')`, 'FORBIDDEN');
  await as(s);
  await db.query(`select public.cancel_class_booking('${result.id}')`);
  await raises(`select public.cancel_class_booking('${result.id}')`, 'BOOKING_NOT_ACTIVE');
  const {
    rows: [refunded],
  } = await db.query('select balance from public.student_packages');
  assert(refunded.balance === 10, 'cancel refunds exactly once');
  const {
    rows: [ledger],
  } = await db.query(
    `select count(*)::int as n from public.credit_ledger where booking_id='${result.id}' and entry_type='CANCELLATION_REFUND'`,
  );
  assert(ledger.n === 1, 'refund has exactly one ledger entry');
  await as(s2);
  const {
    rows: [booked2],
  } = await db.query(
    `select (public.book_class_session('${session.id}','request-student-b-02')).*`,
  );
  assert(booked2.student_id === s2, 'seat becomes available after cancellation');
  const visibleSessions = await db.query('select id from public.class_sessions');
  assert(
    visibleSessions.rows.length === 1 && visibleSessions.rows[0].id === session.id,
    'student sees only a session they booked through RLS',
  );
  const deadlineBefore = booked2.cancellation_deadline_at;
  await as(a);
  await db.query('update public.booking_settings set cancellation_hours=1 where studio_id=$1', [
    studio,
  ]);
  const savedDeadline = await db.query(
    'select cancellation_deadline_at from public.bookings where id=$1',
    [booked2.id],
  );
  assert(
    +new Date(savedDeadline.rows[0].cancellation_deadline_at) === +new Date(deadlineBefore),
    'booking cancellation deadline is snapshotted',
  );
  await db.query('update public.booking_settings set cancellation_hours=12 where studio_id=$1', [
    studio,
  ]);
  const {
    rows: [sdetail],
  } = await db.query(`select * from public.class_sessions where id='${session.id}'`);
  const tooEarly = new Date(new Date(sdetail.starts_at).getTime() - 4 * 3600000);
  await raises(
    'select public.schedule_class_sessions($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)',
    'OUTSIDE_ROOM_AVAILABILITY',
    [
      studio,
      sdetail.branch_id,
      sdetail.room_id,
      sdetail.course_id,
      sdetail.teacher_id,
      tooEarly.toISOString(),
      new Date(+tooEarly + 3600000).toISOString(),
      1,
      new Date().toISOString(),
      null,
      null,
    ],
  );
  await raises(
    'select public.schedule_class_sessions($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)',
    'conflicting key value violates exclusion constraint',
    [
      studio,
      sdetail.branch_id,
      sdetail.room_id,
      sdetail.course_id,
      sdetail.teacher_id,
      sdetail.starts_at,
      sdetail.ends_at,
      1,
      new Date().toISOString(),
      null,
      null,
    ],
  );
  await raises(
    'insert into public.teacher_time_off(studio_id,teacher_id,starts_at,ends_at) values($1,$2,$3,$4)',
    'TIME_OFF_CONFLICTS_WITH_SESSION',
    [studio, sdetail.teacher_id, sdetail.starts_at, sdetail.ends_at],
  );
  const moved = new Date(new Date(sdetail.starts_at).getTime() + 3600000).toISOString();
  const movedEnd = new Date(new Date(sdetail.ends_at).getTime() + 3600000).toISOString();
  await raises(
    'select public.update_class_session($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',
    'BOOKED_SESSION_CHANGE_REQUIRES_CANCELLATION',
    [
      session.id,
      sdetail.branch_id,
      sdetail.room_id,
      sdetail.course_id,
      sdetail.teacher_id,
      moved,
      movedEnd,
      1,
      new Date().toISOString(),
      null,
    ],
  );
  const {
    rows: [another],
  } = await db.query(
    `select * from public.class_sessions where starts_at>now()+interval '3 days' and id<>'${session.id}' and status='scheduled' order by starts_at limit 1`,
  );
  await as(s);
  await db.query(`select public.book_class_session('${another.id}','room-cap-a-123')`);
  await as(s2);
  await db.query(`select public.book_class_session('${another.id}','room-cap-b-123')`);
  await as(a);
  await raises('update public.rooms set capacity=1 where id=$1', 'ROOM_CAPACITY_BELOW_BOOKINGS', [
    another.room_id,
  ]);
  // Link a registered user to a teacher. The trigger grants only the teacher role in this studio.
  await db.query('update public.teachers set profile_id=$1 where id=$2', [
    outsider,
    sdetail.teacher_id,
  ]);
  await as(outsider);
  const roster = await db.query('select * from public.session_students($1)', [session.id]);
  assert(
    roster.rows.some((r) => r.student_id === s2),
    'assigned teacher can read session roster',
  );
  const privateProfile = await db.query('select * from public.profiles where id=$1', [s2]);
  assert(privateProfile.rows.length === 0, 'teacher cannot read full student profile');
  await db.query("select public.mark_attendance($1,'present')", [booked2.id]);
  await as(s);
  await raises("select public.mark_attendance($1,'present')", 'FORBIDDEN_OR_NOT_FOUND', [
    booked2.id,
  ]);
  await as(a);
  await db.query('select public.cancel_class_session($1)', [session.id]);
  const cancelledAttendance = await db.query(
    'select status from public.attendance where booking_id=$1',
    [booked2.id],
  );
  assert(
    cancelledAttendance.rows[0].status === 'unconfirmed',
    'cancelling a class clears prior attendance status',
  );
  const cancelledRefund = await db.query(
    "select count(*)::int n from public.credit_ledger where booking_id=$1 and entry_type='CANCELLATION_REFUND'",
    [booked2.id],
  );
  assert(cancelledRefund.rows[0].n === 1, 'class cancellation refunds the booking once');
  await db.query('select public.cancel_class_session($1)', [another.id]);
  const refunds = await db.query(
    "select count(*)::int n from public.credit_ledger l join public.bookings b on b.id=l.booking_id where b.session_id=$1 and l.entry_type='CANCELLATION_REFUND'",
    [another.id],
  );
  assert(refunds.rows[0].n === 2, 'class cancellation refunds all active bookings');
  await as(s);
  await raises(
    'insert into public.bookings(studio_id,session_id,student_id,student_package_id,credits_charged) values($1,$2,$3,$4,1)',
    'permission denied',
    [studio, another.id, s, '00000000-0000-4000-8000-000000000000'],
  );
  await as(a);
  const packageA = await db.query(
    'select id,balance from public.student_packages where student_id=$1',
    [s],
  );
  await db.query('select public.adjust_student_credits($1,$2,$3,$4)', [
    packageA.rows[0].id,
    -packageA.rows[0].balance,
    'test insufficient balance',
    'test-zero-credits',
  ]);
  const nextSession = await db.query(
    "select id from public.class_sessions where status='scheduled' and starts_at>now()+interval '4 days' order by starts_at limit 1",
  );
  await as(s);
  await raises('select public.book_class_session($1,$2)', 'NO_VALID_PACKAGE_OR_CREDITS', [
    nextSession.rows[0].id,
    'no-credits-request',
  ]);
  const noDebit = await db.query(
    "select count(*)::int n from public.credit_ledger where idempotency_key='no-credits-request'",
  );
  assert(noDebit.rows[0].n === 0, 'failed booking creates no debit ledger entry');
  // Validate booking windows and package eligibility using a new student.
  const s3 = 'aaaaaaaa-0000-4000-8000-000000000005';
  await db.exec('reset role');
  await db.query('insert into auth.users(id,email,raw_user_meta_data) values($1,$2,$3)', [
    s3,
    'student-c@example.test',
    { full_name: 'Student C' },
  ]);
  await as(s3);
  await db.query('select public.join_studio($1)', [studio]);
  await as(a);
  await db.query('select public.issue_student_package($1,$2,$3,$4)', [
    studio,
    s3,
    pack,
    'student-c-grant',
  ]);
  await db.exec('reset role');
  await db.query(
    "update public.class_sessions set booking_opens_at=now()+interval '1 day' where id=$1",
    [nextSession.rows[0].id],
  );
  await as(s3);
  await raises('select public.book_class_session($1,$2)', 'BOOKING_NOT_OPEN', [
    nextSession.rows[0].id,
    'not-open-request',
  ]);
  await raises('select public.book_class_session($1,$2)', 'SESSION_UNAVAILABLE', [
    another.id,
    'cancelled-request',
  ]);
  await db.exec('reset role');
  await db.query(
    "update public.class_sessions set booking_opens_at=now()-interval '1 day' where id=$1",
    [nextSession.rows[0].id],
  );
  await db.query(
    "update public.student_packages set starts_at=now()-interval '30 days',expires_at=now()-interval '1 day' where student_id=$1",
    [s3],
  );
  await as(s3);
  await raises('select public.book_class_session($1,$2)', 'NO_VALID_PACKAGE_OR_CREDITS', [
    nextSession.rows[0].id,
    'expired-request',
  ]);
  await db.exec('reset role');
  await db.query(
    "update public.student_packages set starts_at=now()-interval '1 day',expires_at=now()+interval '90 days' where student_id=$1",
    [s3],
  );
  await db.query('update public.course_packages set applies_to_all=false where id=$1', [pack]);
  await as(s3);
  await raises('select public.book_class_session($1,$2)', 'NO_VALID_PACKAGE_OR_CREDITS', [
    nextSession.rows[0].id,
    'wrong-course-request',
  ]);
  await db.exec('reset role');
  await db.query('update public.course_packages set applies_to_all=true where id=$1', [pack]);
  await db.query(
    "update public.class_sessions set cancellation_deadline=now()-interval '1 minute' where id=$1",
    [nextSession.rows[0].id],
  );
  await as(s3);
  const deadlineBooking = await db.query('select (public.book_class_session($1,$2)).id as id', [
    nextSession.rows[0].id,
    'deadline-booking',
  ]);
  await raises('select public.cancel_class_booking($1)', 'CANCELLATION_DEADLINE_PASSED', [
    deadlineBooking.rows[0].id,
  ]);
  await as(a);
  await db.query('select public.cancel_class_booking($1)', [deadlineBooking.rows[0].id]);
  assert(true, 'administrator can cancel before class after student deadline');
  // Weekly generation and cancellation remain one database transaction each.
  const recurringStart = new Date(new Date(sdetail.starts_at).getTime() + 5 * 3600000);
  const recurringEnd = new Date(recurringStart.getTime() + 3600000);
  const until = new Date(recurringStart.getTime() + 14 * 86400000).toISOString().slice(0, 10);
  const recurring = await db.query(
    'select * from public.schedule_class_sessions_with_deadline($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)',
    [
      studio,
      sdetail.branch_id,
      sdetail.room_id,
      sdetail.course_id,
      sdetail.teacher_id,
      recurringStart.toISOString(),
      recurringEnd.toISOString(),
      1,
      new Date().toISOString(),
      null,
      until,
      new Date(recurringStart.getTime() - 3600000).toISOString(),
    ],
  );
  assert(recurring.rows.length === 3, 'weekly schedule generates three bounded sessions');
  assert(recurring.rows.every((row) =>
    new Date(row.starts_at).getTime()-new Date(row.booking_closes_at).getTime()===3600000),
    'weekly booking deadlines move with each occurrence');
  const futureChanges = await db.query(
    'select * from public.update_future_sessions_with_deadline($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)',
    [recurring.rows[0].id,sdetail.branch_id,sdetail.room_id,sdetail.course_id,sdetail.teacher_id,
      recurringStart.toISOString(),recurringEnd.toISOString(),1,new Date().toISOString(),null,
      new Date(recurringStart.getTime()-7200000).toISOString()],
  );
  assert(futureChanges.rows.length===3 && futureChanges.rows.every((row) =>
    new Date(row.starts_at).getTime()-new Date(row.booking_closes_at).getTime()===7200000),
    'weekly future update preserves deadline offsets');
  const cancelledFuture = await db.query('select public.cancel_future_sessions($1) n', [
    recurring.rows[0].id,
  ]);
  assert(cancelledFuture.rows[0].n === 3, 'cancel future occurrences cancels the remaining series');
  // Student details are scoped per studio; changing one tenant must not modify the global profile or another tenant.
  const otherStudio = '10000000-0000-4000-8000-000000000002';
  await db.exec('reset role');
  await db.query('insert into public.studios(id,name,slug) values($1,$2,$3)', [
    otherStudio,
    'Other',
    'other',
  ]);
  await db.query(
    "insert into public.studio_memberships(studio_id,user_id,role) values($1,$2,'student')",
    [otherStudio, s],
  );
  await as(a);
  await db.query('select public.update_student_profile($1,$2,$3,$4,$5,$6)', [
    studio,
    s,
    'Tenant Name',
    '0912345678',
    null,
    'local note',
  ]);
  const local = await db.query('select * from public.list_students($1,20,0,$2)', [
    studio,
    'Tenant Name',
  ]);
  assert(
    local.rows.length === 1 && local.rows[0].notes === 'local note',
    'student edit and notes are saved to the correct studio',
  );
  const metrics = await db.query('select * from public.business_metrics($1,$2,$3,null,null)', [
    studio,
    new Date(Date.now() - 7 * 86400000).toISOString(),
    new Date(Date.now() + 45 * 86400000).toISOString(),
  ]);
  assert(
    metrics.rows.length === 1 &&
      Number(metrics.rows[0].room_utilization_rate) > 0 &&
      Number(metrics.rows[0].room_utilization_rate) <= 100,
    'room utilization uses configured availability',
  );
  assert(
    Number(metrics.rows[0].booking_rate) >= 0 && Number(metrics.rows[0].cancellation_rate) >= 0,
    'booking and cancellation rates are computed',
  );
  const staff = await db.query('select * from public.teaching_records($1,$2,$3)', [
    studio,
    new Date(Date.now() - 7 * 86400000).toISOString(),
    new Date(Date.now() + 45 * 86400000).toISOString(),
  ]);
  assert(
    staff.rows.length > 0 && staff.rows[0].duration_minutes > 0,
    'admin teaching report returns duration and attendance counts',
  );
  const adjustmentKey = 'adjustment-retry-123';
  const bPackage = await db.query(
    'select id,balance from public.student_packages where student_id=$1',
    [s2],
  );
  await db.query('select public.adjust_student_credits($1,1,$2,$3)', [
    bPackage.rows[0].id,
    'retry test',
    adjustmentKey,
  ]);
  await db.query('select public.adjust_student_credits($1,1,$2,$3)', [
    bPackage.rows[0].id,
    'retry test',
    adjustmentKey,
  ]);
  const afterAdjust = await db.query('select balance from public.student_packages where id=$1', [
    bPackage.rows[0].id,
  ]);
  assert(
    afterAdjust.rows[0].balance === bPackage.rows[0].balance + 1,
    'identical credit adjustment retries apply once',
  );
  await raises('select public.adjust_student_credits($1,2,$2,$3)', 'DUPLICATE_REQUEST', [
    bPackage.rows[0].id,
    'retry test',
    adjustmentKey,
  ]);
  await db.exec('reset role');
  const unchanged = await db.query(
    'select p.full_name global_name,d.full_name tenant_name from public.profiles p join public.student_details d on d.student_id=p.id and d.studio_id=$2 where p.id=$1',
    [s, otherStudio],
  );
  assert(
    unchanged.rows[0].global_name === 'Student A' && unchanged.rows[0].tenant_name === 'Student A',
    'other studio and global profile remain unchanged',
  );
  await raises(
    'update public.credit_ledger set note=$1 where student_package_id=$2',
    'LEDGER_IMMUTABLE',
    ['tamper', bPackage.rows[0].id],
  );
  await raises(
    'update public.student_packages set balance=balance+1 where id=$1',
    'LEDGER_BALANCE_MISMATCH',
    [bPackage.rows[0].id],
  );
  await raises(
    'insert into public.bookings(studio_id,session_id,student_id,student_package_id,credits_charged,cancellation_deadline_at) values($1,$2,$3,$4,1,now())',
    'bookings_student_package_owner_fkey',
    [studio, nextSession.rows[0].id, s, bPackage.rows[0].id],
  );
  await as(s);
  await raises('select * from public.business_metrics($1,$2,$3,null,null)', 'FORBIDDEN', [
    studio,
    new Date(Date.now() - 86400000).toISOString(),
    new Date(Date.now() + 86400000).toISOString(),
  ]);
  await raises('select * from public.teaching_records($1,$2,$3)', 'FORBIDDEN', [
    studio,
    new Date(Date.now() - 86400000).toISOString(),
    new Date(Date.now() + 86400000).toISOString(),
  ]);
  await as(outsider);
  const ownTeaching = await db.query('select * from public.teaching_records($1,$2,$3)', [
    studio,
    new Date(Date.now() - 7 * 86400000).toISOString(),
    new Date(Date.now() + 45 * 86400000).toISOString(),
  ]);
  assert(
    ownTeaching.rows.length > 0 &&
      ownTeaching.rows.every(
        (r) => r.teacher_name === staff.rows.find((x) => x.session_id === session.id).teacher_name,
      ),
    'teacher report excludes other teachers',
  );
  const cross = await db.query(`select * from public.student_packages where studio_id='${studio}'`);
  assert(cross.rows.length === 0, 'cross-tenant private records hidden');
  await raises(
    `select public.book_class_session('${session.id}','request-outsider-01')`,
    'FORBIDDEN',
  );
  await db.exec('reset role; set role anon');
  await raises('select * from public.student_packages', 'permission denied');
  const publicTeachers = await db.query('select * from public.public_teacher_catalog($1)', [
    studio,
  ]);
  assert(
    publicTeachers.rows.length === 4 &&
      !('email' in publicTeachers.rows[0]) &&
      !('phone' in publicTeachers.rows[0]),
    'public teacher catalog omits private contact fields',
  );
  await raises('select * from public.teachers', 'permission denied');
  console.log(`PASS ${checks} PGlite checks`);
} catch (e) {
  console.error('FAIL', e.message);
  process.exitCode = 1;
} finally {
  await db.close();
}

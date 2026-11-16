// Local Supabase only. Creates accounts with the supported Auth Admin API.
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import pg from 'pg';
import { seedDemoHistory } from './seed-demo-history.mjs';
dotenv.config();
const url = process.env.SUPABASE_URL,
  key = process.env.SUPABASE_SERVICE_ROLE_KEY,
  anon = process.env.SUPABASE_ANON_KEY;
if (!url || !key || !anon || !/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?\/?$/.test(url)) {
  console.error(
    'Only local Supabase is supported. Configure local URL, anon key and service role key in .env.',
  );
  process.exit(1);
}
const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const studio = '10000000-0000-4000-8000-000000000001',
  pkg = '70000000-0000-4000-8000-000000000001',
  password = 'FlowieDemo123!';
const accounts = [
  ['flowie-demo-super@gmail.com', '平台管理員', 'super'],
  ['flowie-demo-admin@gmail.com', '品牌管理員', 'admin'],
  ['flowie-demo-teacher@gmail.com', '安安', 'teacher'],
  ...Array.from({ length: 20 }, (_, i) => [
    `flowie-demo-student${String(i + 1).padStart(2, '0')}@gmail.com`,
    `示範學生 ${String(i + 1).padStart(2, '0')}`,
    'student',
  ]),
];
const demoUserIds = new Map();
const { data: existing, error: listError } = await admin.auth.admin.listUsers({
  page: 1,
  perPage: 1000,
});
if (listError) throw listError;
for (const [email, full_name, role] of accounts) {
  let user = existing.users.find((u) => u.email === email);
  if (!user) {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name },
    });
    if (error) throw error;
    user = data.user;
  }
  if (!user) throw new Error(`User creation failed: ${email}`);
  demoUserIds.set(email, user.id);
  if (role === 'super') {
    const { error } = await admin.from('platform_admins').upsert({ user_id: user.id });
    if (error) throw error;
  }
  if (role !== 'super') {
    const { error } = await admin
      .from('studio_memberships')
      .upsert(
        { studio_id: studio, user_id: user.id, role },
        { onConflict: 'studio_id,user_id,role' },
      );
    if (error) throw error;
  }
  if (role === 'teacher') {
    const { error } = await admin
      .from('teachers')
      .update({ profile_id: user.id, email })
      .eq('id', '40000000-0000-4000-8000-000000000001');
    if (error) throw error;
  }
}
const authClient = createClient(url, anon, {
  auth: { persistSession: false, autoRefreshToken: false },
});
let signed = await authClient.auth.signInWithPassword({
  email: 'flowie-demo-admin@gmail.com',
  password,
});
if (signed.error) throw signed.error;
for (const [email, , role] of accounts.filter((a) => a[2] === 'student')) {
  const user = (await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })).data.users.find(
    (u) => u.email === email,
  );
  if (!user) throw new Error('Missing demo user');
  const { data: current, error } = await admin
    .from('student_packages')
    .select('id')
    .eq('studio_id', studio)
    .eq('student_id', user.id)
    .limit(1);
  if (error) throw error;
  if (!current.length) {
    const grant = await authClient.rpc('issue_student_package', {
      p_studio: studio,
      p_student: user.id,
      p_package: pkg,
      p_key: 'demo-grant-' + user.id,
      p_starts: new Date(Date.now() - 5 * 86400000).toISOString(),
    });
    if (grant.error) throw grant.error;
  }
}
await authClient.auth.signOut();
signed = await authClient.auth.signInWithPassword({
  email: 'flowie-demo-student01@gmail.com',
  password,
});
if (signed.error) throw signed.error;
const now = new Date().toISOString(),
  until = new Date(Date.now() + 30 * 86400000).toISOString();
const sessions = await authClient.rpc('session_catalog', {
  p_studio: studio,
  p_from: now,
  p_to: until,
});
if (sessions.error) throw sessions.error;
if (sessions.data.length) {
  const booked = await authClient
    .from('bookings')
    .select('id')
    .eq('session_id', sessions.data[0].id)
    .eq('status', 'confirmed');
  if (booked.error) throw booked.error;
  if (!booked.data.length) {
    const result = await authClient.rpc('book_class_session', {
      p_session: sessions.data[0].id,
      p_key: 'demo-booking-student01',
    });
    if (result.error) throw result.error;
  }
}
// Historic sample transactions require a single PostgreSQL transaction.
// This path is deliberately restricted to local PostgreSQL and local Supabase.
const dbUrl =
  process.env.LOCAL_SUPABASE_DB_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
const parsed = new URL(dbUrl);
if (
  !['postgres:', 'postgresql:'].includes(parsed.protocol) ||
  !['127.0.0.1', 'localhost'].includes(parsed.hostname)
)
  throw new Error('Demo database must be local PostgreSQL.');
const db = new pg.Client({ connectionString: dbUrl });
try {
  await db.connect();
  const students = accounts.filter((a) => a[2] === 'student').map((a) => demoUserIds.get(a[0]));
  const count = await seedDemoHistory(
    db,
    studio,
    demoUserIds.get('flowie-demo-admin@gmail.com'),
    students,
  );
  console.log(
    `Created ${count} historic demo bookings with attendance (existing rows are preserved).`,
  );
} finally {
  await db.end();
}
console.log('Local demo accounts ready. Password for each: FlowieDemo123!');
console.log(
  'flowie-demo-super@gmail.com | flowie-demo-admin@gmail.com | flowie-demo-teacher@gmail.com | flowie-demo-student01@gmail.com (through flowie-demo-student20@gmail.com)',
);

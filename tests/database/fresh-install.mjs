import { PGlite } from '@electric-sql/pglite';
import { btree_gist } from '@electric-sql/pglite/contrib/btree_gist';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const folder = path.join(root, 'supabase/sql');
const plan = JSON.parse(await readFile(path.join(folder, 'installation-plan.json'), 'utf8'));
const db = await PGlite.create({ extensions: { btree_gist } });
try {
  await db.exec(
    "create role anon;create role authenticated;create schema extensions;create schema auth;create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;",
  );
  for (const name of plan.fresh_install_order.slice(0, 2))
    await db.exec(await readFile(path.join(folder, name), 'utf8'));
  for (const file of plan.optional) {
    const template = await readFile(path.join(folder, file), 'utf8');
    assert.ok(template.includes(plan.auth_placeholders[file]));
    await assert.rejects(
      /** 未替換的 UID 範本必須失敗，不能授權給過去環境中的帳號。 */ () => db.exec(template),
      /invalid input syntax for type uuid/,
    );
    await db.exec('ROLLBACK');
  }
  const admin = randomUUID(),
    teacher = randomUUID();
  for (const id of [admin, teacher])
    await db.query('insert into auth.users(id,email,raw_user_meta_data) values($1,$2,$3)', [
      id,
      'fixture@example.test',
      { display_name: 'Install fixture' },
    ]);
  for (const [index, id] of [
    [2, admin],
    [3, teacher],
  ]) {
    const file = plan.fresh_install_order[index];
    const sql = (await readFile(path.join(folder, file), 'utf8')).replaceAll(
      plan.auth_placeholders[file],
      id,
    );
    await db.exec(sql);
  }
  for (const name of plan.fresh_install_order.slice(4))
    await db.exec(await readFile(path.join(folder, name), 'utf8'));
  const tables = await db.query(
    "select count(*)::int n from information_schema.tables where table_schema='public' and table_type='BASE TABLE'",
  );
  assert.equal(tables.rows[0].n, 16);
  const profile = await db.query('select is_admin from public.profiles where id=$1', [admin]);
  assert.equal(profile.rows[0].is_admin, true);
  const teachers = await db.query('select id from public.teachers where id=$1', [teacher]);
  assert.equal(teachers.rows.length, 1);
  const sessions = await db.query(
    'select count(*)::int n from public.class_sessions where teacher_id=$1',
    [teacher],
  );
  assert.equal(sessions.rows[0].n, 6);
  const knowledge = await db.query('select count(*)::int n from public.knowledge_articles');
  assert.equal(knowledge.rows[0].n, 3);
  const feedback = await db.query(
    "select column_name from information_schema.columns where table_schema='public' and table_name='bookings' and column_name='teacher_feedback'",
  );
  assert.equal(feedback.rows.length, 1);
  console.log(
    'PASS fresh 01→02→03→04→05→06→07 in isolated PostgreSQL engine; 16 tables, 6 sessions, 3 knowledge articles.',
  );
  console.log(
    'PASS unfilled Auth UID templates fail without granting historical users; production Supabase was not accessed.',
  );
} finally {
  await db.close();
}

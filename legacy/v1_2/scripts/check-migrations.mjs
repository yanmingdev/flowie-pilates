// Local PostgreSQL-compatible smoke check, NOT a substitute for Supabase integration/RLS tests.
import { PGlite } from '@electric-sql/pglite';
import { btree_gist } from '@electric-sql/pglite/contrib/btree_gist';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';
import { readFile } from 'node:fs/promises';
const db = await PGlite.create({ extensions: { btree_gist, pgcrypto } });
await db.exec(`
create role anon; create role authenticated; create schema extensions; create schema auth; create schema storage;
create table auth.users(id uuid primary key, email text, raw_user_meta_data jsonb);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
create table storage.objects(id uuid default gen_random_uuid(), bucket_id text,name text);
create function storage.foldername(name text) returns text[] language sql immutable as $$ select string_to_array(name,'/') $$;
`);
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
]) {
  try {
    await db.exec(await readFile(file, 'utf8'));
    console.log(`PASS ${file}`);
  } catch (error) {
    console.error(`FAIL ${file}:`, error.message);
    process.exitCode = 1;
    break;
  }
}
await db.close();

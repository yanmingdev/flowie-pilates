// Generates SQL Editor install files from the migrations and seed; do not edit generated copies.
import { readFile, readdir, writeFile } from 'node:fs/promises';
const dir = 'supabase/migrations';
const files = (await readdir(dir)).filter((f) => f.endsWith('.sql')).sort();
const parts = await Promise.all(files.map((f) => readFile(`${dir}/${f}`, 'utf8')));
const existingTables = [
  ...new Set(
    parts.flatMap((s) => [...s.matchAll(/create table public\.([a-z_]+)/gi)].map((m) => m[1])),
  ),
];
const tableArray = existingTables.map((t) => `'${t}'`).join(',');
const header = `-- Flowie V1.2 installation for a NEW, EMPTY Supabase test project only.\n-- Generated from supabase/migrations by npm run db:sql. Do not combine this\n-- with a CLI migration install or run it against an existing application database.\n-- This transaction fails before writing if a Flowie table or bucket already exists.\nbegin;\ndo $$\ndeclare found_tables text;\nbegin\n select string_agg(c.relname, ', ' order by c.relname) into found_tables\n from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace\n where n.nspname='public' and c.relkind in ('r','p','v','m','f') and c.relname=any(array[${tableArray}]);\n if found_tables is not null then raise exception 'FLOWIE_EXISTING_TABLES: %',found_tables; end if;\n if exists(select 1 from storage.buckets where id='studio-public') then raise exception 'FLOWIE_EXISTING_BUCKET: studio-public'; end if;\nend $$;\n`;
const migrations = files.map((f, i) => `\n-- ===== ${f} =====\n${parts[i]}\n`).join('');
const schemaSql = `${header}${migrations}\ncommit;\n`;
await writeFile('supabase/sql-editor/01_flowie_schema.sql', schemaSql);
const seed = await readFile('supabase/seed.sql', 'utf8');
const seedSql = `-- Optional demonstration data. For the same new test project after 01.\n-- Does not create users, passwords, bookings or student balances. Do not use for production.\nbegin;\ndo $$ begin\n if exists(select 1 from public.studios where id='10000000-0000-4000-8000-000000000001'::uuid or slug='flowie') then raise exception 'FLOWIE_DEMO_ALREADY_EXISTS'; end if;\nend $$;\n${seed}\ncommit;\n`;
await writeFile('supabase/sql-editor/02_flowie_demo_seed.sql', seedSql);
await writeFile('supabase/sql-editor/00_flowie_install_schema_and_seed.sql',
  `-- Flowie V1.2 fresh-install bundle: schema followed by demo INSERTs.\n-- Run this OR 01 + 02, never both. Two transactions: if seed fails, schema remains installed.\n\n${schemaSql}\n${seedSql}`);
console.log(`Generated SQL Editor files from ${files.length} migrations and seed.`);

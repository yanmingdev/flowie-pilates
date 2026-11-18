import { PGlite } from '@electric-sql/pglite';
import { btree_gist } from '@electric-sql/pglite/contrib/btree_gist';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const folder = path.join(root, 'supabase/sql');
const plan = JSON.parse(await readFile(path.join(folder, 'installation-plan.json'), 'utf8'));
const db = await PGlite.create({ extensions: { btree_gist } });
try {
  // Supabase-managed schema is a local stub only. The diagram shows only its referenced id.
  await db.exec(
    "create role anon;create role authenticated;create schema extensions;create schema auth;create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;",
  );
  for (const file of plan.schema_sources)
    await db.exec(await readFile(path.join(folder, file), 'utf8'));
  const tables = (
    await db.query(
      "select table_schema,table_name from information_schema.tables where table_schema='public' and table_type='BASE TABLE' order by table_name",
    )
  ).rows;
  const columns = (
    await db.query(
      "select c.relname as table_name,a.attname as column_name,format_type(a.atttypid,a.atttypmod) as pg_type,a.attnotnull as not_null,a.attnum as ordinal,pg_get_expr(d.adbin,d.adrelid) as default_value from pg_attribute a join pg_class c on c.oid=a.attrelid join pg_namespace n on n.oid=c.relnamespace left join pg_attrdef d on d.adrelid=c.oid and d.adnum=a.attnum where n.nspname='public' and c.relkind='r' and a.attnum>0 and not a.attisdropped order by c.relname,a.attnum",
    )
  ).rows;
  const constraints = (
    await db.query(
      "select c.conname as name,c.contype as kind,n.nspname as schema,t.relname as table_name,rn.nspname as referenced_schema,rt.relname as referenced_table,array(select a.attname from unnest(c.conkey) with ordinality k(num,ord) join pg_attribute a on a.attrelid=c.conrelid and a.attnum=k.num order by k.ord) as columns,array(select a.attname from unnest(c.confkey) with ordinality k(num,ord) join pg_attribute a on a.attrelid=c.confrelid and a.attnum=k.num order by k.ord) as referenced_columns,pg_get_constraintdef(c.oid) as definition from pg_constraint c join pg_class t on t.oid=c.conrelid join pg_namespace n on n.oid=t.relnamespace left join pg_class rt on rt.oid=c.confrelid left join pg_namespace rn on rn.oid=rt.relnamespace where n.nspname='public' order by t.relname,c.conname",
    )
  ).rows;
  if (tables.length !== plan.expected_public_tables)
    throw new Error('Unexpected public table count');
  const foreignKeys = [];
  for (const c of constraints) {
    if (c.kind !== 'f') continue;
    const unique = constraints.some(
      /** 只有全表 PK／UNIQUE 的欄位組合能限制此 FK 的子列至多一筆；不把部分索引當全域唯一。 */ (
        k,
      ) =>
        k.table_name === c.table_name &&
        ['p', 'u'].includes(k.kind) &&
        k.columns.length === c.columns.length &&
        k.columns.every(
          /** 以欄位集合比較唯一鍵，保留複合鍵的正確基數。 */ (name) => c.columns.includes(name),
        ),
    );
    const nullable = c.columns.some(
      /** FK 可空時，子列可不連結父列；非空 FK 必須連結恰好一個父列。 */ (name) =>
        !columns.find(
          /** 尋找此 FK 欄位的實際 PostgreSQL 空值規則。 */ (x) =>
            x.table_name === c.table_name && x.column_name === name,
        ).not_null,
    );
    foreignKeys.push({
      ...c,
      parent_per_child: nullable ? '0..1' : '1',
      children_per_parent: unique ? '0..1' : '0..N',
    });
  }
  const sources = [];
  for (const name of plan.fresh_install_order) {
    const bytes = await readFile(path.join(folder, name));
    sources.push({
      file: name,
      sha256: createHash('sha256').update(bytes).digest('hex'),
      affects_schema: plan.schema_sources.includes(name),
    });
  }
  const catalog = {
    model: 'Flowie V1 + 07',
    generated_from: 'Executed SQL in isolated PGlite; not production Supabase',
    public_table_count: tables.length,
    external_entities: [
      {
        schema: 'auth',
        name: 'users',
        columns: [{ column_name: 'id', pg_type: 'uuid', not_null: true }],
        note: 'Supabase Auth managed; only referenced primary key is shown.',
      },
    ],
    tables,
    columns,
    constraints,
    foreign_keys: foreignKeys,
    sql_sources: sources,
  };
  await writeFile(
    path.join(folder, 'schema-catalog.json'),
    JSON.stringify(catalog, null, 2) + '\n',
  );
  console.log(
    `Schema catalog: ${tables.length} public tables, ${columns.length} columns, ${foreignKeys.length} foreign keys.`,
  );
} finally {
  await db.close();
}

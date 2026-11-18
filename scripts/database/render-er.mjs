import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const folder = path.join(root, 'supabase/sql');
const catalog = JSON.parse(await readFile(path.join(folder, 'schema-catalog.json'), 'utf8'));
/** Escape table metadata for Graphviz HTML labels; metadata is data, never Graphviz instructions. */
function escape(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}
/** Quote a Graphviz identifier without changing the PostgreSQL schema or table name. */
function quote(value) {
  return JSON.stringify(value);
}
const groups = {
  identity: ['profiles', 'teachers'],
  schedule: ['branches', 'rooms', 'course_categories', 'courses', 'class_sessions'],
  credits: ['course_packages', 'student_packages', 'bookings', 'credit_ledger', 'course_favorites'],
  content: ['site_settings', 'homepage_sections', 'announcements', 'knowledge_articles'],
};
const themes = { identity: '#DCE7DA', schedule: '#E7E2D9', credits: '#E9D8D3', content: '#E7EBDD' };
/** Construct a full entity card from actual PostgreSQL columns and key constraints. */
function entity(table, external = false) {
  const full = external ? 'auth.users' : 'public.' + table;
  const columns = external
    ? catalog.external_entities[0].columns
    : catalog.columns.filter(
        /** Select this entity's actual columns, including 07 teacher_feedback. */ (c) =>
          c.table_name === table,
      );
  let group = 'identity';
  for (const [key, names] of Object.entries(groups)) if (names.includes(table)) group = key;
  const rows = [];
  for (const c of columns) {
    const constraints = external
      ? []
      : catalog.constraints.filter(
          /** PK and FK markers come from constraints, not naming guesses. */ (k) =>
            k.table_name === table && k.columns.includes(c.column_name),
        );
    const flags = [];
    if (
      external ||
      constraints.some(/** Mark columns participating in the primary key. */ (k) => k.kind === 'p')
    )
      flags.push('PK');
    if (
      constraints.some(
        /** Mark actual foreign-key columns, including nullable operator references. */ (k) =>
          k.kind === 'f',
      )
    )
      flags.push('FK');
    if (
      constraints.some(
        /** Only single-column global UNIQUE constraints are shown as UQ. */ (k) =>
          k.kind === 'u' && k.columns.length === 1,
      )
    )
      flags.push('UQ');
    const type = c.pg_type === 'timestamp with time zone' ? 'timestamptz' : c.pg_type;
    rows.push(
      `<TR><TD ALIGN="LEFT" PORT="${escape(c.column_name)}"><FONT FACE="DejaVu Sans Mono" POINT-SIZE="10">${escape(c.column_name)}</FONT></TD><TD ALIGN="LEFT"><FONT POINT-SIZE="9">${escape(type)}</FONT></TD><TD><FONT POINT-SIZE="9">${c.not_null ? 'NN' : 'NULL'}</FONT></TD><TD><FONT POINT-SIZE="9" COLOR="#526D56">${flags.join(', ') || '&#160;'}</FONT></TD></TR>`,
    );
  }
  return `${quote(full)} [label=<<TABLE BORDER="1" COLOR="#B7C0B3" CELLBORDER="0" CELLSPACING="0" CELLPADDING="5" BGCOLOR="#FFFFFF"><TR><TD COLSPAN="4" BGCOLOR="${themes[group]}"><FONT POINT-SIZE="13"><B>${full}</B></FONT>${external ? '<BR/><FONT POINT-SIZE="9">Supabase-managed / referenced key only</FONT>' : ''}</TD></TR>${rows.join('')}</TABLE>>];`;
}
const lines = [
  'digraph Flowie {',
  `graph [rankdir=TB, bgcolor="#F7F3EE", pad="0.35", nodesep="0.35", ranksep="0.65", splines=polyline, outputorder=edgesfirst, dpi=160, fontname="Noto Sans CJK TC", labelloc=t, label="Flowie V1 + 07  |  PostgreSQL ER model\\n${catalog.public_table_count} public tables + Supabase Auth reference  •  ${catalog.columns.length} application columns  •  ${catalog.foreign_keys.length} foreign keys"];`,
  'node [shape=plain,fontname="Noto Sans CJK TC"];',
  'edge [color="#6D7D6C",fontname="DejaVu Sans",fontsize=9,dir=both,arrowsize=0.65,labeldistance=1.6,penwidth=1.1];',
  entity('users', true),
];
for (const t of catalog.tables) lines.push(entity(t.table_name));
const ranks = [
  ['auth.users', 'public.branches', 'public.course_categories', 'public.course_packages'],
  ['public.profiles', 'public.rooms', 'public.courses'],
  ['public.teachers', 'public.student_packages', 'public.course_favorites'],
  ['public.class_sessions'],
  ['public.bookings'],
  ['public.credit_ledger'],
  [
    'public.site_settings',
    'public.homepage_sections',
    'public.announcements',
    'public.knowledge_articles',
  ],
];
for (const row of ranks)
  lines.push(
    '{rank=same;' +
      row
        .map(/** Keep each intentional diagram rank in stable entity order. */ (x) => quote(x))
        .join(';') +
      ';}',
  );
for (const fk of catalog.foreign_keys) {
  const parent = fk.referenced_schema + '.' + fk.referenced_table,
    child = fk.schema + '.' + fk.table_name;
  const tail = fk.parent_per_child === '1' ? 'teetee' : 'odottee';
  const head = fk.children_per_parent === '0..1' ? 'odottee' : 'odotcrow';
  lines.push(
    `${quote(parent)}:${quote(fk.referenced_columns[0])}:e -> ${quote(child)}:${quote(fk.columns[0])}:w [arrowtail=${quote(tail)},arrowhead=${quote(head)},taillabel=${quote(fk.parent_per_child)},headlabel=${quote(fk.children_per_parent)}];`,
  );
}
// Invisible layout anchors never imply a database relationship.
for (const content of groups.content)
  lines.push(
    `${quote('public.credit_ledger')} -> ${quote('public.' + content)} [style=invis,dir=none];`,
  );
lines.push(
  'legend [label=<<TABLE BORDER="1" COLOR="#B7C0B3" CELLBORDER="0" CELLSPACING="0" CELLPADDING="8" BGCOLOR="#FFFFFF"><TR><TD><B>圖例 / Model notes</B></TD></TR><TR><TD ALIGN="LEFT">PK = primary key    FK = foreign key    UQ = single-column UNIQUE    NN = NOT NULL</TD></TR><TR><TD ALIGN="LEFT">1 = exactly one    0..1 = optional one    0..N = optional many (crow foot)</TD></TR><TR><TD ALIGN="LEFT">Cardinality comes from foreign-key nullability and global PK/UNIQUE constraints.</TD></TR><TR><TD ALIGN="LEFT">site_settings / homepage_sections / announcements / knowledge_articles have no foreign keys.</TD></TR><TR><TD ALIGN="LEFT">auth.users is managed by Supabase; only its referenced id is shown.</TD></TR><TR><TD ALIGN="LEFT">series_id is a grouping UUID, NOT a foreign key. Credits = SUM(credit_ledger.delta).</TD></TR><TR><TD ALIGN="LEFT">Partial booking/ledger unique indexes and CHECK/EXCLUDE rules are in schema-catalog.json.</TD></TR><TR><TD ALIGN="LEFT">Authoritative SQL: 01 + 05 + 06 + 07. 03/04 are optional Auth-UID installation templates.</TD></TR></TABLE>>];',
);
const relationshipRows = catalog.foreign_keys.map(
  /** 列出每一個外鍵的精確端點與基數，避免高密度關聯線的視覺歧義。 */ (fk, index) =>
    `<TR><TD ALIGN="LEFT">R${String(index + 1).padStart(2, '0')} ${escape(fk.referenced_schema + '.' + fk.referenced_table + '.' + fk.referenced_columns.join(','))}</TD><TD>${fk.parent_per_child}</TD><TD ALIGN="LEFT">${escape(fk.schema + '.' + fk.table_name + '.' + fk.columns.join(','))}</TD><TD>${fk.children_per_parent}</TD></TR>`,
);
lines.push(
  `relations [label=<<TABLE BORDER="1" COLOR="#B7C0B3" CELLBORDER="0" CELLSPACING="0" CELLPADDING="5" BGCOLOR="#FFFFFF"><TR><TD COLSPAN="4" BGCOLOR="#E6EBE4"><B>Foreign-key relationship reference / 外鍵關聯對照</B></TD></TR><TR><TD><B>Parent key</B></TD><TD><B>Parents per child</B></TD><TD><B>Child FK</B></TD><TD><B>Children per parent</B></TD></TR>${relationshipRows.join('')}</TABLE>>];`,
);
lines.push(
  '"public.announcements" -> legend [style=invis,dir=none];',
  'legend -> relations [style=invis,dir=none];',
  '}',
);
const dot = lines.join('\n') + '\n';
await writeFile(path.join(folder, 'Flowie_ER_Model.dot'), dot);
const result = spawnSync(
  'dot',
  [
    '-Tpng',
    path.join(folder, 'Flowie_ER_Model.dot'),
    '-o',
    path.join(folder, 'Flowie_ER_Model.png'),
  ],
  { encoding: 'utf8' },
);
if (result.error || result.status !== 0)
  throw new Error(
    'Graphviz dot is required only to regenerate the supplied PNG. ' +
      (result.error?.message || result.stderr),
  );
console.log('ER PNG generated beside SQL from the executed schema catalog.');

const metadata = {
  public_tables: catalog.public_table_count,
  application_columns: catalog.columns.length,
  foreign_keys: catalog.foreign_keys.length,
  renderer: 'Graphviz dot',
  png_sha256: createHash('sha256')
    .update(await readFile(path.join(folder, 'Flowie_ER_Model.png')))
    .digest('hex'),
  dot_sha256: createHash('sha256').update(dot).digest('hex'),
  catalog_sha256: createHash('sha256')
    .update(await readFile(path.join(folder, 'schema-catalog.json')))
    .digest('hex'),
};
await writeFile(path.join(folder, 'er-artifacts.json'), JSON.stringify(metadata, null, 2) + '\n');

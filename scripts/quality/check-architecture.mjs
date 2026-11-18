import ts from 'typescript';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const issues = [];
let functions = 0;
const graph = new Map();
/** 列出現行程式碼；封存與第三方套件不納入架構規範。 */
function list(dir) {
  const result = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) result.push(...list(p));
    else if (/\.(ts|tsx|mjs|cjs|js)$/.test(p) && !p.endsWith('.d.mts')) result.push(p);
  }
  return result;
}
const files = [];
for (const dir of ['frontend/src', 'backend/src', 'config', 'scripts', 'tests'])
  files.push(...list(path.join(root, dir)));
/** 把 NodeNext .js 或無副檔名匯入對應到實際 TypeScript 檔案。 */
function resolve(file, spec) {
  if (!spec.startsWith('.')) return null;
  const p = path.resolve(path.dirname(file), spec);
  for (const c of [
    p,
    p.replace(/\.js$/, '.ts'),
    p + '.ts',
    p + '.tsx',
    p + '.mjs',
    p + '/index.ts',
  ])
    if (fs.existsSync(c) && fs.statSync(c).isFile()) return c;
  return null;
}
for (const file of files) {
  const rel = path.relative(root, file).replaceAll('\\', '/'),
    text = fs.readFileSync(file, 'utf8'),
    sf = ts.createSourceFile(
      file,
      text,
      ts.ScriptTarget.Latest,
      true,
      file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
    ),
    deps = [];
  if (sf.parseDiagnostics.length) issues.push(rel + ': parse error');
  /** 巡覽 AST，檢查函式註解、分層匯入與禁止的資料庫直連。 */
  function visit(n) {
    const fn =
      (ts.isFunctionDeclaration(n) ||
        ts.isFunctionExpression(n) ||
        ts.isArrowFunction(n) ||
        ts.isMethodDeclaration(n) ||
        ts.isConstructorDeclaration(n) ||
        ts.isGetAccessorDeclaration(n) ||
        ts.isSetAccessorDeclaration(n)) &&
      n.body;
    if (fn) {
      functions++;
      if (!/\/\*\*[\s\S]*?\*\/[\s,(]*$/.test(text.slice(0, n.getStart(sf))) && !n.jsDoc?.length && !(ts.isVariableDeclaration(n.parent)&&n.parent.parent?.parent?.jsDoc?.length))
        issues.push(
          rel +
            ':' +
            (sf.getLineAndCharacterOfPosition(n.getStart()).line + 1) +
            ' missing function documentation',
        );
    }
    let spec;
    if (
      (ts.isImportDeclaration(n) || ts.isExportDeclaration(n)) &&
      n.moduleSpecifier &&
      ts.isStringLiteral(n.moduleSpecifier)
    )
      spec = n.moduleSpecifier.text;
    if (
      ts.isCallExpression(n) &&
      n.expression.kind === ts.SyntaxKind.ImportKeyword &&
      ts.isStringLiteral(n.arguments[0])
    )
      spec = n.arguments[0].text;
    if (spec) {
      const target = resolve(file, spec);
      if (spec.startsWith('.') && !target && !spec.endsWith('.css'))
        issues.push(rel + ': unresolved ' + spec);
      if (target) {
        deps.push(target);
        const to = path.relative(root, target).replaceAll('\\', '/');
        if (rel.startsWith('frontend/src/shared/') && /frontend\/src\/(app|features)\//.test(to))
          issues.push(rel + ': shared imports upper layer');
        if (rel.startsWith('frontend/src/features/') && to.startsWith('frontend/src/app/'))
          issues.push(rel + ': feature imports app');
        if (rel.endsWith('.controller.ts') && to.endsWith('.repository.ts'))
          issues.push(rel + ': controller bypasses service');
        if (rel.endsWith('.repository.ts') && to.endsWith('.service.ts'))
          issues.push(rel + ': repository imports service');
      }
      if (rel.endsWith('.service.ts') && spec === 'express')
        issues.push(rel + ': service imports Express');
    }
    if (
      ts.isCallExpression(n) &&
      ts.isPropertyAccessExpression(n.expression) &&
      ['from', 'rpc'].includes(n.expression.name.text) &&
      n.expression.expression.getText(sf) !== 'Array' &&
      (rel.startsWith('frontend/src/features/') || rel.endsWith('.controller.ts'))
    )
      issues.push(rel + ': forbidden database access');
    if (
      rel.endsWith('.controller.ts') &&
      ts.isCallExpression(n) &&
      ts.isPropertyAccessExpression(n.expression) &&
      n.expression.expression.getText(sf) === 'service' &&
      n.arguments[0]?.getText(sf) === 'req'
    )
      issues.push(rel + ': HTTP request leaked into service');
    ts.forEachChild(n, visit);
  }
  visit(sf);
  graph.set(file, deps);
}
const visited = new Set(),
  active = new Set();
// 已合併到現行分層的舊檔不可重新出現，避免完整覆蓋時混入第二套程式。
const removedDuplicates = JSON.parse(
  fs.readFileSync(path.join(root, 'docs/architecture/removed-duplicates.json'), 'utf8'),
);
for (const entry of removedDuplicates)
  if (fs.existsSync(path.join(root, entry.old))) issues.push('obsolete duplicate: ' + entry.old);
/** 以 DFS 偵測相對模組循環，避免初始化順序依賴。 */
function cycle(file) {
  if (active.has(file)) {
    issues.push('circular dependency: ' + path.relative(root, file));
    return;
  }
  if (visited.has(file)) return;
  active.add(file);
  for (const n of graph.get(file) || []) if (graph.has(n)) cycle(n);
  active.delete(file);
  visited.add(file);
}
for (const file of files) cycle(file);
/** 計算 SQL 排版與註解以外的指紋，確認重構未修改資料契約。 */
function fingerprint(s) {
  return crypto
    .createHash('sha256')
    .update(s.replace(/\/\*[\s\S]*?\*\/|--[^\n]*/g, '').replace(/\s+/g, ''))
    .digest('hex');
}
const sql = JSON.parse(
  fs.readFileSync(path.join(root, 'docs/architecture/sql-integrity-baseline.json'), 'utf8'),
);
for (const item of sql)
  if (fingerprint(fs.readFileSync(path.join(root, item.path), 'utf8')) !== item.sha256)
    issues.push('SQL changed: ' + item.path);
const mapping = JSON.parse(
  fs.readFileSync(path.join(root, 'config/assets/legacy-url-map.json'), 'utf8'),
);
for (const [old, current] of Object.entries(mapping)) {
  const source = path.join(root, 'frontend/public', current);
  if (!fs.existsSync(source)) issues.push('asset missing: ' + current);
  else if (
    current.endsWith('.png') &&
    !fs
      .readFileSync(source)
      .subarray(0, 8)
      .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  )
    issues.push('invalid PNG: ' + current);
  if (!fs.existsSync(path.join(root, 'frontend/public', old)))
    issues.push('legacy asset missing: ' + old);
}
const routes = [];
for (const file of files)
  if (file.endsWith('.routes.ts'))
    for (const m of fs
      .readFileSync(file, 'utf8')
      .matchAll(/router\.(get|post|patch|all)\(\s*'([^']+)'\s*,/g))
      routes.push([m[1], m[2]]);
for (const name of [
  'branches',
  'rooms',
  'teachers',
  'course-categories',
  'courses',
  'packages',
  'homepage-sections',
  'site-settings',
  'announcements',
])
  routes.push(['get', '/' + name], ['post', '/' + name], ['patch', '/' + name + '/:id']);
for (const name of [
  'teacher-branches',
  'teacher-courses',
  'package-courses',
  'room-availability',
  'teacher-availability',
  'teacher-time-off',
  'banners',
  'booking-settings',
])
  routes.push(['all', '/' + name]);
const expected = JSON.parse(
  fs.readFileSync(path.join(root, 'docs/architecture/api-route-baseline.json'), 'utf8'),
);
if (JSON.stringify(routes.sort()) !== JSON.stringify(expected.sort()))
  issues.push('API route contract changed');
/** 按 index.css 順序展開分類檔案，避免重排 cascade 或遺失規則。 */
function styles(file) {
  return fs
    .readFileSync(file, 'utf8')
    .replace(
      /@import\s+['"]([^'"]+)['"];?/g,
      /** 只展開本地樣式；外部字體載入保持原文。 */ (match, spec) =>
        spec.startsWith('.') ? styles(path.resolve(path.dirname(file), spec)) : match,
    );
}
const cssHash = crypto
  .createHash('sha256')
  .update(styles(path.join(root, 'frontend/src/styles/index.css')).replace(/\s+/g, ''))
  .digest('hex');
if (
  cssHash !==
  fs.readFileSync(path.join(root, 'docs/architecture/original-style.sha256'), 'utf8').trim()
)
  issues.push('CSS cascade changed');
// SQL and the ER model are delivered together and must describe the same schema.
const sqlFolder = path.join(root, 'supabase/sql');
const plan = JSON.parse(fs.readFileSync(path.join(sqlFolder, 'installation-plan.json'), 'utf8'));
for (const name of plan.fresh_install_order)
  if (!fs.existsSync(path.join(sqlFolder, name)))
    issues.push('SQL installation step missing: ' + name);
const catalog = JSON.parse(fs.readFileSync(path.join(sqlFolder, 'schema-catalog.json'), 'utf8'));
const er = JSON.parse(fs.readFileSync(path.join(sqlFolder, 'er-artifacts.json'), 'utf8'));
if (
  catalog.public_table_count !== plan.expected_public_tables ||
  er.public_tables !== catalog.public_table_count ||
  er.application_columns !== catalog.columns.length ||
  er.foreign_keys !== catalog.foreign_keys.length
)
  issues.push('ER model counts do not match SQL catalog');
for (const entry of catalog.sql_sources) {
  const hash = crypto
    .createHash('sha256')
    .update(fs.readFileSync(path.join(sqlFolder, entry.file)))
    .digest('hex');
  if (hash !== entry.sha256) issues.push('ER source SQL changed: ' + entry.file);
}
for (const [name, expectedHash] of [
  ['Flowie_ER_Model.png', er.png_sha256],
  ['Flowie_ER_Model.dot', er.dot_sha256],
  ['schema-catalog.json', er.catalog_sha256],
]) {
  const bytes = fs.readFileSync(path.join(sqlFolder, name));
  if (crypto.createHash('sha256').update(bytes).digest('hex') !== expectedHash)
    issues.push('ER artifact changed: ' + name);
}
const erPng = fs.readFileSync(path.join(sqlFolder, 'Flowie_ER_Model.png'));
if (!erPng.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])))
  issues.push('ER model is not PNG');

console.log(
  JSON.stringify(
    {
      files: files.length,
      documented_functions: functions,
      sql_scripts: sql.length,
      api_routes: routes.length,
      asset_aliases: Object.keys(mapping).length,
      er_public_tables: catalog.public_table_count,
      er_foreign_keys: catalog.foreign_keys.length,
      issues,
    },
    null,
    2,
  ),
);
if (issues.length) process.exitCode = 1;

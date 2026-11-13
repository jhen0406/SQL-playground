/**
 * 開發用：檢查每一題的 MySQL 寫法在真正的 MySQL 8 上結果是否和 PostgreSQL 標準解一致。
 * 不在 npm test 裡（使用者電腦不一定有 MySQL）。
 *
 * 用法：
 *   MYSQL_URL=mysql://user:pass@127.0.0.1:3306 npx tsx scripts/verify-mysql.ts [題目 id 前綴…]
 *
 * 做法：
 * 1. 用 PGlite 載入資料集（含隱藏測資與題目專用 SQL），把每張表的內容「倒」成 MySQL 的 CREATE TABLE + INSERT
 *    （資料集用了 generate_series 等 PostgreSQL 語法，直接搬原始 SQL 不會動）。
 * 2. 在 MySQL 執行 ex.mysql（沒有就用 ex.solution，順便確認「寫法相同」是真的）。
 * 3. 用平台的 compareResults 和 PostgreSQL 標準解的結果比對。
 */
import mysql from 'mysql2/promise';
import type { PGlite } from '@electric-sql/pglite';
import { createPGlite } from '../src/db/pglite';
import { runInSandbox, type QueryResult } from '../src/db/sandbox';
import { buildSetup, effectiveSql } from '../src/grading/grade';
import { compareResults } from '../src/grading/compare';
import { chapters, drills, getDataset, mastery } from '../src/content';
import type { Exercise } from '../src/content/types';

const URL = process.env.MYSQL_URL ?? 'mysql://sqlpg:sqlpg@127.0.0.1:3306';
const DB = 'sqlpg_verify';
/** checkQuery 用到 PostgreSQL 系統表的題目，無法在 MySQL 上檢查最終狀態 */
const PG_CATALOG = /pg_|to_regclass|format_type|information_schema/i;

function mysqlType(t: string): string {
  const x = t.toLowerCase();
  if (x === 'integer' || x === 'int4') return 'INT';
  if (x === 'smallint') return 'SMALLINT';
  if (x === 'bigint') return 'BIGINT';
  if (x.startsWith('numeric')) return x.replace('numeric', 'DECIMAL').replace('DECIMAL', x === 'numeric' ? 'DECIMAL(20,6)' : 'DECIMAL');
  if (x.startsWith('character varying')) return x.replace('character varying', 'VARCHAR');
  if (x === 'text') return 'TEXT';
  if (x === 'date') return 'DATE';
  if (x.startsWith('timestamp')) return 'DATETIME';
  if (x === 'boolean') return 'BOOLEAN';
  if (x === 'double precision' || x === 'real') return 'DOUBLE';
  if (x.startsWith('character')) return x.replace('character', 'CHAR');
  throw new Error('未對應的型別：' + t);
}

function lit(v: unknown): string {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
  if (typeof v === 'number' || typeof v === 'bigint') return String(v);
  if (v instanceof Date) return `'${v.toISOString().slice(0, 19).replace('T', ' ')}'`;
  return `'${String(v).replace(/\\/g, '\\\\').replace(/'/g, "''")}'`;
}

/** 在 PGlite 執行 setup 後，把 sandbox 內所有表倒成 MySQL SQL */
async function dumpForMysql(pg: PGlite, setupSql: string): Promise<string[]> {
  const r = await runInSandbox(pg, { setupSql, sql: 'SELECT 1' });
  if (!r.ok) throw new Error('setup 失敗：' + r.error);
  const tables = await pg.query<{ table_name: string }>(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'sandbox' AND table_type = 'BASE TABLE' ORDER BY table_name",
  );
  const out: string[] = [];
  for (const { table_name: t } of tables.rows) {
    const cols = await pg.query<{ column_name: string; data_type: string; fmt: string }>(
      `SELECT a.attname AS column_name, format_type(a.atttypid, a.atttypmod) AS fmt, '' AS data_type
         FROM pg_attribute a WHERE a.attrelid = 'sandbox.${t}'::regclass AND a.attnum > 0 AND NOT a.attisdropped ORDER BY a.attnum`,
    );
    const pk = await pg.query<{ col: string }>(
      `SELECT a.attname AS col FROM pg_index i JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
        WHERE i.indrelid = 'sandbox.${t}'::regclass AND i.indisprimary`,
    );
    const defs = cols.rows.map((c) => `\`${c.column_name}\` ${mysqlType(c.fmt)}`);
    if (pk.rows.length) defs.push(`PRIMARY KEY (${pk.rows.map((p) => '`' + p.col + '`').join(', ')})`);
    out.push(`CREATE TABLE \`${t}\` (${defs.join(', ')})`);
    const rows = await pg.query<Record<string, unknown>>(`SELECT * FROM sandbox."${t}"`, [], { rowMode: 'array' } as never);
    for (const row of rows.rows as unknown as unknown[][]) out.push(`INSERT INTO \`${t}\` VALUES (${row.map(lit).join(', ')})`);
  }
  return out;
}

function toQueryResult(fields: { name: string }[] | undefined, rows: unknown): QueryResult {
  const arr = (rows as unknown[][]) ?? [];
  return { columns: (fields ?? []).map((f) => f.name), rows: arr.map((r) => r.map((v) => (Buffer.isBuffer(v) ? v.toString() : v))) };
}

/** PostgreSQL 的 boolean 在 MySQL 是 1/0 */
function boolsToInt(q: QueryResult): QueryResult {
  return { ...q, rows: q.rows.map((r) => r.map((v) => (typeof v === 'boolean' ? (v ? 1 : 0) : v))) };
}

async function main() {
  const filters = process.argv.slice(2);
  const pg = createPGlite();
  await pg.waitReady;
  const conn = await mysql.createConnection({ uri: URL, multipleStatements: true, dateStrings: true, rowsAsArray: true, decimalNumbers: false });

  const all: Exercise[] = [
    ...chapters.flatMap((c) => [c.practice, ...(c.morePractice ?? []), c.review]),
    ...mastery,
    ...drills,
  ].filter((e) => !filters.length || filters.some((f) => e.id.startsWith(f)));

  let pass = 0;
  const fails: string[] = [];
  const skipped: string[] = [];
  for (const ex of all) {
    if (ex.inputTemplate) {
      skipped.push(`${ex.id}（表單輸入題）`);
      continue;
    }
    const ds = getDataset(ex);
    if (ex.checkQuery && PG_CATALOG.test(ex.checkQuery)) {
      // 判題看 PostgreSQL 系統表，無法比對；至少確認 MySQL 寫法能執行
      const dump = await dumpForMysql(pg, buildSetup(ds, ex, false));
      try {
        await conn.query(`DROP DATABASE IF EXISTS ${DB}; CREATE DATABASE ${DB}; USE ${DB};`);
        for (const s of dump) await conn.query(s);
        await conn.query(ex.mysql ?? ex.solution);
        skipped.push(`${ex.id}（可執行，未比對）`);
      } catch (e) {
        fails.push(`✗ ${ex.id}${ex.mysql ? '' : '（沒有 mysql，用 PostgreSQL 解）'} — 只檢查能否執行：MySQL 錯誤 ${(e as Error).message}`);
      }
      continue;
    }
    const variants = [false, ...(ds.hiddenExtraSql && (ex.useHidden ?? true) ? [true] : [])];
    const sql = ex.mysql ?? ex.solution;
    let ok = true;
    let why = '';
    for (const hidden of variants) {
      const setupSql = buildSetup(ds, ex, hidden);
      const exp = await runInSandbox(pg, { setupSql, sql: effectiveSql(ex, ex.solution), checkQuery: ex.checkQuery, maxRows: 5000 });
      if (!exp.ok) throw new Error(`${ex.id} PostgreSQL 標準解失敗：${exp.error}`);
      const expected = boolsToInt((ex.checkQuery ? exp.check : exp.result)!);
      const dump = await dumpForMysql(pg, setupSql);
      try {
        await conn.query(`DROP DATABASE IF EXISTS ${DB}; CREATE DATABASE ${DB}; USE ${DB};`);
        for (const s of dump) await conn.query(s);
        const [res, fields] = await conn.query(sql);
        let got: QueryResult;
        if (ex.checkQuery) {
          const [cr, cf] = await conn.query(ex.checkQuery);
          got = toQueryResult(cf as never, cr);
        } else if (Array.isArray(fields) && Array.isArray(fields[0])) {
          // 多條陳述式：取最後一個有欄位的結果
          const fs = fields as unknown as ({ name: string }[] | undefined)[];
          const rs = res as unknown as unknown[];
          let i = fs.length - 1;
          while (i >= 0 && !fs[i]) i--;
          got = toQueryResult(fs[i], rs[i]);
        } else {
          got = toQueryResult(fields as never, res);
        }
        const cmp = compareResults(got, expected, { orderMatters: ex.orderMatters, strictColumns: ex.strictColumns });
        if (!cmp.pass) {
          ok = false;
          why = `${hidden ? '隱藏' : '範例'}測資：${cmp.reason}`;
        }
      } catch (e) {
        ok = false;
        why = `${hidden ? '隱藏' : '範例'}測資：MySQL 錯誤 ${(e as Error).message}`;
      }
      if (!ok) break;
    }
    if (ok) pass++;
    else fails.push(`✗ ${ex.id}${ex.mysql ? '' : '（沒有 mysql，用 PostgreSQL 解）'} — ${why}`);
  }
  await conn.query(`DROP DATABASE IF EXISTS ${DB}`);
  await conn.end();
  console.log(fails.join('\n'));
  console.log(`\n通過 ${pass} / ${all.length - skipped.length}，略過 ${skipped.length}：${skipped.join('、')}`);
  process.exit(fails.length ? 1 : 0);
}

void main();

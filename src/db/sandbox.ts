import type { PGlite } from '@electric-sql/pglite';
import { hasTxControl, splitSql } from './splitSql';

/** 一次查詢的結果（最後一個有回傳欄位的 statement）。 */
export interface QueryResult {
  columns: string[];
  rows: unknown[][];
  /** 對 INSERT/UPDATE/DELETE 有意義 */
  affectedRows?: number;
}

export type RunOutput =
  | {
      ok: true;
      result: QueryResult | null;
      check?: QueryResult;
      durationMs: number;
      statements: number;
      /** 使用者開了交易卻沒有 COMMIT：結束時已自動 ROLLBACK（改動不算數） */
      rolledBack?: boolean;
    }
  | { ok: false; error: string; durationMs: number };

export interface RunRequest {
  /** 資料集 schema + seed (+ 隱藏測資 SQL + 題目額外設定) */
  setupSql: string;
  sql: string;
  checkQuery?: string;
  maxRows?: number;
}

const RESET_SQL = `
DEALLOCATE ALL;
DROP SCHEMA IF EXISTS sandbox CASCADE;
CREATE SCHEMA sandbox;
SET search_path TO sandbox;
`;

function toResult(r: { rows: unknown[]; fields: { name: string }[]; affectedRows?: number }, maxRows: number): QueryResult {
  return {
    columns: r.fields.map((f) => f.name),
    rows: (r.rows as unknown[][]).slice(0, maxRows),
    affectedRows: r.affectedRows,
  };
}

/** 目前連線是否停在交易中（BEGIN 後沒有 COMMIT，或交易裡出錯變成 aborted） */
function inTransaction(db: PGlite): boolean {
  return (db as unknown as { isInTransaction?: () => boolean }).isInTransaction?.() ?? false;
}

async function execEach(db: PGlite, sql: string) {
  const all: Awaited<ReturnType<PGlite['exec']>> = [];
  for (const stmt of splitSql(sql)) all.push(...(await db.exec(stmt, { rowMode: 'array' })));
  return all;
}

/** 收掉沒結束的交易，讓下一次執行從乾淨狀態開始 */
async function closeTransaction(db: PGlite): Promise<boolean> {
  if (!inTransaction(db)) return false;
  await db.exec('ROLLBACK;');
  return true;
}

/**
 * 在乾淨的 sandbox schema 中：載入資料 → 執行使用者 SQL →（可選）執行檢查查詢。
 * 瀏覽器（Web Worker）與測試（Node）共用此函式。
 */
export async function runInSandbox(db: PGlite, req: RunRequest): Promise<RunOutput> {
  const maxRows = req.maxRows ?? 1000;
  try {
    await closeTransaction(db);
    await db.exec(RESET_SQL + req.setupSql);
  } catch (e) {
    return { ok: false, error: '資料集載入失敗（平台錯誤）：' + errMsg(e), durationMs: 0 };
  }
  // 交易指令（BEGIN / COMMIT / ROLLBACK / SAVEPOINT）照常執行；
  // 結束時若交易還開著（忘了 COMMIT），就自動 ROLLBACK，模擬連線中斷時未提交的改動消失。
  const userSql = req.sql.trim();
  if (!userSql) return { ok: false, error: '請先輸入 SQL。', durationMs: 0 };
  const t1 = performance.now();
  try {
    // 含交易指令時逐條執行：PostgreSQL 一次送出多條指令會被包成同一個隱含交易，
    // BEGIN 之前的指令也會被後面的 ROLLBACK 撤回；逐條執行才和一般 SQL 工具一樣各自自動提交。
    const results = hasTxControl(userSql)
      ? await execEach(db, userSql)
      : await db.exec(userSql, { rowMode: 'array' });
    const durationMs = performance.now() - t1;
    // 取最後一個有欄位的結果；若都沒有（純 DML），取最後一個並帶 affectedRows
    let picked: QueryResult | null = null;
    for (let i = results.length - 1; i >= 0; i--) {
      if (results[i].fields.length > 0) {
        picked = toResult(results[i], maxRows);
        break;
      }
    }
    if (!picked && results.length > 0) {
      const last = results[results.length - 1];
      picked = { columns: [], rows: [], affectedRows: last.affectedRows };
    }
    const rolledBack = await closeTransaction(db);
    let check: QueryResult | undefined;
    if (req.checkQuery) {
      await db.exec('SET search_path TO sandbox;');
      const c = await db.query(req.checkQuery, [], { rowMode: 'array' });
      check = toResult(c, maxRows);
    }
    return { ok: true, result: picked, check, durationMs, statements: results.length, rolledBack };
  } catch (e) {
    const durationMs = performance.now() - t1;
    const wasInTx = await closeTransaction(db).catch(() => false);
    return { ok: false, error: errMsg(e) + (wasInTx ? '\n（交易中發生錯誤，整個交易已 ROLLBACK）' : ''), durationMs };
  }
}

export interface TableInfo {
  name: string;
  columns: { name: string; type: string; nullable: boolean; pk: boolean }[];
  sample: QueryResult;
  rowCount: number;
}

/** 讀取資料集的表結構與範例資料（給題目左側說明欄）。 */
export async function describeDataset(db: PGlite, setupSql: string, sampleRows = 50): Promise<TableInfo[]> {
  await closeTransaction(db);
  await db.exec(RESET_SQL + setupSql);
  const cols = await db.query<{ table_name: string; column_name: string; data_type: string; is_nullable: string }>(
    `SELECT c.table_name, c.column_name, c.data_type, c.is_nullable
       FROM information_schema.columns c
       JOIN information_schema.tables t
         ON t.table_schema = c.table_schema AND t.table_name = c.table_name
      WHERE c.table_schema = 'sandbox' AND t.table_type = 'BASE TABLE'
      ORDER BY c.table_name, c.ordinal_position`,
  );
  const pks = await db.query<{ table_name: string; column_name: string }>(
    `SELECT kcu.table_name, kcu.column_name
       FROM information_schema.table_constraints tc
       JOIN information_schema.key_column_usage kcu
         ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
      WHERE tc.table_schema = 'sandbox' AND tc.constraint_type = 'PRIMARY KEY'`,
  );
  const pkSet = new Set(pks.rows.map((r) => r.table_name + '.' + r.column_name));
  const order = await db.query<{ table_name: string }>(
    `SELECT c.relname AS table_name FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'sandbox' AND c.relkind = 'r' ORDER BY c.oid`,
  );
  const tables: TableInfo[] = [];
  for (const { table_name } of order.rows) {
    const columns = cols.rows
      .filter((c) => c.table_name === table_name)
      .map((c) => ({
        name: c.column_name,
        type: c.data_type,
        nullable: c.is_nullable === 'YES',
        pk: pkSet.has(table_name + '.' + c.column_name),
      }));
    const pkCols = columns.filter((c) => c.pk).map((c) => `"${c.name}"`);
    const orderBy = pkCols.length ? ` ORDER BY ${pkCols.join(', ')}` : '';
    const s = await db.query(`SELECT * FROM "${table_name}"${orderBy} LIMIT ${sampleRows}`, [], { rowMode: 'array' });
    const cnt = await db.query<{ n: number }>(`SELECT count(*)::int AS n FROM "${table_name}"`);
    tables.push({ name: table_name, columns, sample: toResult(s, sampleRows), rowCount: cnt.rows[0].n });
  }
  return tables;
}

function errMsg(e: unknown): string {
  if (e && typeof e === 'object' && 'message' in e) return String((e as { message: unknown }).message);
  return String(e);
}

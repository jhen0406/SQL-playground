import type { QueryResult } from '../db/sandbox';

export interface CompareOptions {
  orderMatters?: boolean;
  strictColumns?: boolean;
}

export interface CompareResult {
  pass: boolean;
  /** 給使用者看的錯誤原因（繁中） */
  reason?: string;
  /** 不一致的列（在使用者結果與預期結果中的索引） */
  mismatchedRows?: { user: number[]; expected: number[] };
}

const NUMERIC_RE = /^-?\d+(\.\d+)?(e[-+]?\d+)?$/i;

/** 正規化單一值：數字（含 numeric 字串）四捨五入到 4 位小數；其他轉字串。 */
export function normalizeValue(v: unknown): string {
  if (v === null || v === undefined) return '∅NULL';
  if (typeof v === 'number') return 'n:' + roundNum(v);
  if (typeof v === 'bigint') return 'n:' + v.toString();
  if (typeof v === 'boolean') return 'b:' + v;
  if (typeof v === 'string') {
    const s = v.trim();
    if (NUMERIC_RE.test(s)) return 'n:' + roundNum(Number(s));
    // '2024-01-05 00:00:00' 與 '2024-01-05' 視為相同日期
    const m = /^(\d{4}-\d{2}-\d{2})[ T]00:00:00(\.0+)?$/.exec(s);
    if (m) return 's:' + m[1];
    return 's:' + v;
  }
  if (v instanceof Date) return 's:' + v.toISOString();
  return 's:' + JSON.stringify(v);
}

function roundNum(n: number): string {
  if (!Number.isFinite(n)) return String(n);
  const r = Math.round(n * 10000) / 10000;
  return (Object.is(r, -0) ? 0 : r).toString();
}

function rowKey(row: unknown[]): string {
  return row.map(normalizeValue).join('␟');
}

export function compareResults(user: QueryResult | null | undefined, expected: QueryResult, opts: CompareOptions = {}): CompareResult {
  if (!user || user.columns.length === 0) {
    return { pass: false, reason: '你的 SQL 沒有回傳任何查詢結果（最後一個指令需要是 SELECT）。' };
  }
  if (user.columns.length !== expected.columns.length) {
    return {
      pass: false,
      reason: `欄位數量不同：你的結果有 ${user.columns.length} 欄（${user.columns.join(', ')}），預期為 ${expected.columns.length} 欄（${expected.columns.join(', ')}）。`,
    };
  }
  if (opts.strictColumns) {
    const diff = expected.columns.findIndex((c, i) => c.toLowerCase() !== user.columns[i].toLowerCase());
    if (diff >= 0) {
      return {
        pass: false,
        reason: `欄位名稱不符：第 ${diff + 1} 欄應命名為「${expected.columns[diff]}」，你的是「${user.columns[diff]}」（可用 AS 取別名）。`,
      };
    }
  }
  if (user.rows.length !== expected.rows.length) {
    return {
      pass: false,
      reason: `列數不同：你的結果有 ${user.rows.length} 列，預期為 ${expected.rows.length} 列。`,
      ...unorderedMismatch(user, expected),
    };
  }
  if (opts.orderMatters) {
    const bad: number[] = [];
    user.rows.forEach((r, i) => {
      if (rowKey(r) !== rowKey(expected.rows[i])) bad.push(i);
    });
    if (bad.length === 0) return { pass: true };
    // 內容相同只是順序不同？
    const sameSet = unorderedMismatch(user, expected);
    if (sameSet.mismatchedRows!.user.length === 0) {
      return { pass: false, reason: '資料內容正確，但排序不符合題目要求（請檢查 ORDER BY）。', mismatchedRows: { user: bad, expected: bad } };
    }
    return { pass: false, reason: `第 ${bad[0] + 1} 列起與預期結果不同。`, mismatchedRows: { user: bad, expected: bad } };
  }
  const mm = unorderedMismatch(user, expected);
  if (mm.mismatchedRows!.user.length === 0 && mm.mismatchedRows!.expected.length === 0) return { pass: true };
  return { pass: false, reason: `有 ${mm.mismatchedRows!.user.length} 列資料與預期結果不同（不考慮排序）。`, ...mm };
}

/** 以多重集合比對，找出雙方多出來的列。 */
function unorderedMismatch(user: QueryResult, expected: QueryResult): { mismatchedRows: { user: number[]; expected: number[] } } {
  const counts = new Map<string, number[]>();
  expected.rows.forEach((r, i) => {
    const k = rowKey(r);
    const arr = counts.get(k) ?? [];
    arr.push(i);
    counts.set(k, arr);
  });
  const userBad: number[] = [];
  user.rows.forEach((r, i) => {
    const arr = counts.get(rowKey(r));
    if (arr && arr.length) arr.shift();
    else userBad.push(i);
  });
  const expBad: number[] = [];
  for (const arr of counts.values()) expBad.push(...arr);
  expBad.sort((a, b) => a - b);
  return { mismatchedRows: { user: userBad, expected: expBad } };
}

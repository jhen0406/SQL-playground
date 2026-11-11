import type { Exercise } from '../types';

type ExInput = Omit<Exercise, 'datasetId' | 'hints'> & Partial<Pick<Exercise, 'datasetId' | 'hints'>>;

/** 建立入門題（預設使用 shop 資料集） */
export function ex(e: ExInput): Exercise {
  return { datasetId: 'shop', hints: [], ...e };
}

/**
 * 產生「檢查資料表定義」的查詢：列出欄位（型別、NOT NULL、DEFAULT）與約束。
 * 用於 CREATE / ALTER TABLE、約束等題目。
 */
export function tableDefCheck(table: string): string {
  return `
SELECT 'column' AS kind,
       a.attname || ' ' || format_type(a.atttypid, a.atttypmod)
         || CASE WHEN a.attnotnull THEN ' NOT NULL' ELSE '' END
         || COALESCE(' DEFAULT ' || pg_get_expr(d.adbin, d.adrelid), '') AS definition
  FROM pg_attribute a
  LEFT JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
 WHERE a.attrelid = to_regclass('sandbox.${table}') AND a.attnum > 0 AND NOT a.attisdropped
UNION ALL
SELECT 'constraint', pg_get_constraintdef(oid)
  FROM pg_constraint
 WHERE conrelid = to_regclass('sandbox.${table}') AND contype IN ('p', 'u', 'c', 'f')
ORDER BY 1, 2`;
}

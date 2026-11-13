/**
 * 偵測標準解裡的 PostgreSQL 專屬語法。用在測試：出現這些語法的題目一定要附 MySQL 寫法（Exercise.mysql）。
 * 回傳命中的規則名稱；空陣列代表看起來和 MySQL 通用。
 */
const RULES: [string, RegExp][] = [
  ['::型別轉換', /::\s*[A-Za-z]/],
  ['FILTER', /\bFILTER\s*\(/i],
  ['正規表示式 ~', /\s~\*?\s*'/],
  ['ILIKE', /\bILIKE\b/i],
  ['STRING_AGG', /\bSTRING_AGG\s*\(/i],
  ['TO_CHAR', /\bTO_CHAR\s*\(/i],
  ['DATE_TRUNC', /\bDATE_TRUNC\s*\(/i],
  ['AGE', /\bAGE\s*\(/i],
  ['INTERVAL 字串', /\bINTERVAL\s+'/i],
  ['NULLS FIRST/LAST', /\bNULLS\s+(FIRST|LAST)\b/i],
  ['FULL JOIN', /\bFULL\s+(OUTER\s+)?JOIN\b/i],
  ['|| 串接', /\|\|/],
  ['SERIAL', /\bSERIAL\b/i],
  ['DISTINCT ON', /\bDISTINCT\s+ON\b/i],
  ['generate_series', /\bgenerate_series\s*\(/i],
  ['PERCENTILE_CONT', /\bPERCENTILE_CONT\b/i],
  ['PREPARE … AS / $1', /\bPREPARE\b[\s\S]*\bAS\b|\$\d/i],
  ['TRUNC', /\bTRUNC\s*\(/i],
  ['unnest / string_to_array', /\b(unnest|string_to_array)\s*\(/i],
  ['日期 ± 整數', /\b\w*(date|_at|day)\s*[+-]\s*\d+\b|DATE\s+'[^']+'\s*-\s*\w/i],
  ['日期相減', /\b\w*date\s*-\s*\w*(date|LAG)/i],
  ['DELETE 同表子查詢', /DELETE\s+FROM\s+(\w+)[\s\S]*\bFROM\s+\1\b/i],
  ['EXCEPT/INTERSECT ALL', /\b(EXCEPT|INTERSECT)\s+ALL\b/i],
];

export function pgOnlyFeatures(sql: string): string[] {
  return RULES.filter(([, re]) => re.test(sql)).map(([name]) => name);
}

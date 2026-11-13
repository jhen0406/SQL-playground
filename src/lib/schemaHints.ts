/** 練習頁資料表面板的提示：本題用到哪些表、題目提到哪些欄位（純函式，方便測試）。 */

/** 拿掉 SQL 的字串常值與註解，避免把 'customers' 這種字串誤判成表名 */
function stripSql(sql: string): string {
  return sql
    .replace(/--[^\n]*/g, ' ')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/'(?:[^']|'')*'/g, "''");
}

function words(text: string): Set<string> {
  return new Set((text.toLowerCase().match(/[a-z_][a-z0-9_]*/g) ?? []));
}

/** sql 中出現的表名，依 tableNames 的順序回傳 */
export function tablesUsed(sql: string, tableNames: string[]): string[] {
  const w = words(stripSql(sql));
  return tableNames.filter((t) => w.has(t.toLowerCase()));
}

/** text（題目、輸出欄位）中以完整單字出現的欄位名稱 */
export function mentionedColumns(text: string, columnNames: string[]): Set<string> {
  const w = words(text);
  return new Set(columnNames.filter((c) => w.has(c.toLowerCase())));
}

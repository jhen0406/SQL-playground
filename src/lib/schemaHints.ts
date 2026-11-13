/** 練習頁資料表面板的提示：題目提到哪些欄位（純函式，方便測試）。 */

function words(text: string): Set<string> {
  return new Set(text.toLowerCase().match(/[a-z_][a-z0-9_]*/g) ?? []);
}

/** text（題目、輸出欄位）中以完整單字出現的欄位名稱 */
export function mentionedColumns(text: string, columnNames: string[]): Set<string> {
  const w = words(text);
  return new Set(columnNames.filter((c) => w.has(c.toLowerCase())));
}

/** 重點筆記用的純文字比對工具（不碰 DOM，方便單元測試）。 */

/** needle 在 hay 中第 n 次（0 起算）出現的位置；找不到回傳 -1。 */
export function nthIndexOf(hay: string, needle: string, n: number): number {
  if (!needle) return -1;
  let from = 0;
  for (let i = 0; ; i++) {
    const at = hay.indexOf(needle, from);
    if (at < 0) return -1;
    if (i === n) return at;
    from = at + 1;
  }
}

/** 位於 start 的這段 needle，是 hay 中第幾次出現（0 起算）。 */
export function occurrenceAt(hay: string, needle: string, start: number): number {
  if (!needle) return 0;
  let count = 0;
  let from = 0;
  for (;;) {
    const at = hay.indexOf(needle, from);
    if (at < 0 || at >= start) return count;
    count++;
    from = at + 1;
  }
}

/** 找不到原本那一次時，退而求其次用第一次出現的位置（內容稍有修改時仍能標記）。 */
export function locate(hay: string, needle: string, occurrence: number): number {
  const at = nthIndexOf(hay, needle, occurrence);
  return at >= 0 ? at : hay.indexOf(needle);
}

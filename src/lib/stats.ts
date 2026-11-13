import { addDay, diffDays, type DayStr } from './date';

/** 統計需要的最小欄位（db.activities 的子集） */
export interface ActLike {
  day: DayStr;
  type: string;
  correct?: boolean;
}

export interface DayPoint {
  day: DayStr;
  /** 當天作答次數（練習、複習、精熟題） */
  attempts: number;
  /** 當天答對次數 */
  correct: number;
  /** 當天所有活動（含學完章節） */
  total: number;
}

const isAttempt = (a: ActLike) => a.correct !== undefined;

/** from..to（含頭尾）每一天一筆，沒有活動的日子補 0 */
export function dailySeries(acts: ActLike[], from: DayStr, to: DayStr): DayPoint[] {
  const n = diffDays(to, from) + 1;
  const out: DayPoint[] = Array.from({ length: Math.max(n, 0) }, (_, i) => ({ day: addDay(from, i), attempts: 0, correct: 0, total: 0 }));
  const idx = new Map(out.map((p, i) => [p.day, i]));
  for (const a of acts) {
    const i = idx.get(a.day);
    if (i === undefined) continue;
    out[i].total++;
    if (isAttempt(a)) {
      out[i].attempts++;
      if (a.correct) out[i].correct++;
    }
  }
  return out;
}

/** 連續學習天數：current = 到今天（今天還沒學就算到昨天）為止；longest = 歷史最長 */
export function streaks(days: Iterable<DayStr>, today: DayStr): { current: number; longest: number } {
  const set = new Set(days);
  let current = 0;
  let d = set.has(today) ? today : addDay(today, -1);
  while (set.has(d)) {
    current++;
    d = addDay(d, -1);
  }
  const sorted = [...set].sort();
  let longest = 0;
  let run = 0;
  let prev: DayStr | null = null;
  for (const x of sorted) {
    run = prev && diffDays(x, prev) === 1 ? run + 1 : 1;
    longest = Math.max(longest, run);
    prev = x;
  }
  return { current, longest: Math.max(longest, current) };
}

/** from..to 之間的正確率（0–1）；沒有作答時回傳 null */
export function accuracy(acts: ActLike[], from: DayStr, to: DayStr): number | null {
  let n = 0;
  let ok = 0;
  for (const a of acts) {
    if (a.day < from || a.day > to || !isAttempt(a)) continue;
    n++;
    if (a.correct) ok++;
  }
  return n === 0 ? null : ok / n;
}

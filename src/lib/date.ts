import { addDays, format, parseISO, differenceInCalendarDays } from 'date-fns';

/** 日期一律以本地日 'yyyy-MM-dd' 字串表示。 */
export type DayStr = string;

const OFFSET_KEY = 'sqlpg.debugDayOffset';

/** 測試用：可在設定頁「模擬日期」把今天往後推 N 天，用來檢查複習提醒。 */
export function getDayOffset(): number {
  try {
    return Number(globalThis.localStorage?.getItem(OFFSET_KEY) ?? 0) || 0;
  } catch {
    return 0;
  }
}

export function setDayOffset(n: number) {
  try {
    if (n) localStorage.setItem(OFFSET_KEY, String(n));
    else localStorage.removeItem(OFFSET_KEY);
  } catch {
    /* ignore */
  }
}

export function now(): Date {
  return addDays(new Date(), getDayOffset());
}

export function today(): DayStr {
  return toDay(now());
}

export function toDay(d: Date): DayStr {
  return format(d, 'yyyy-MM-dd');
}

export function fromDay(s: DayStr): Date {
  return parseISO(s);
}

export function addDay(s: DayStr, n: number): DayStr {
  return toDay(addDays(fromDay(s), n));
}

export function diffDays(a: DayStr, b: DayStr): number {
  return differenceInCalendarDays(fromDay(a), fromDay(b));
}

const WEEK = ['日', '一', '二', '三', '四', '五', '六'];
export function prettyDay(s: DayStr): string {
  const d = fromDay(s);
  return `${d.getMonth() + 1}月${d.getDate()}日（${WEEK[d.getDay()]}）`;
}

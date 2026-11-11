import { addDay, diffDays, type DayStr } from '../lib/date';

/**
 * 艾賓浩斯遺忘曲線複習排程。
 * 學習當天為第 1 天，預設在第 3、7、15、30、60 天複習，
 * 也就是距離學習日 +2、+6、+14、+29、+59 天。
 */
export const DEFAULT_OFFSETS = [2, 6, 14, 29, 59];

export interface ReviewItem {
  chapterId: string;
  /** 本輪排程的起算日（首次學習日，答錯後重設為答錯那天） */
  anchor: DayStr;
  /** 已完成的複習次數（本輪） */
  stage: number;
  due: DayStr;
  /** 全部階段完成 */
  done: boolean;
  history: { day: DayStr; correct: boolean }[];
}

export function createReviewItem(chapterId: string, learnedDay: DayStr, offsets = DEFAULT_OFFSETS): ReviewItem {
  return { chapterId, anchor: learnedDay, stage: 0, due: addDay(learnedDay, offsets[0]), done: false, history: [] };
}

/**
 * 完成一次複習。
 * - 答對：進入下一階段；下次日期 = 起算日 + 下一個間隔（若已過期，至少排到明天）。
 * - 答錯：以今天為新的起算日重新開始（回到第 3 天那一級）。
 */
export function completeReview(item: ReviewItem, day: DayStr, correct: boolean, offsets = DEFAULT_OFFSETS): ReviewItem {
  const history = [...item.history, { day, correct }];
  if (!correct) {
    return { ...item, anchor: day, stage: 0, due: addDay(day, offsets[0]), done: false, history };
  }
  const stage = item.stage + 1;
  if (stage >= offsets.length) {
    return { ...item, stage, done: true, history };
  }
  let due = addDay(item.anchor, offsets[stage]);
  if (diffDays(due, day) < 1) due = addDay(day, 1);
  return { ...item, stage, due, done: false, history };
}

export type ReviewStatus = 'overdue' | 'today' | 'upcoming' | 'done';

export function reviewStatus(item: ReviewItem, day: DayStr): ReviewStatus {
  if (item.done) return 'done';
  const d = diffDays(item.due, day);
  if (d < 0) return 'overdue';
  if (d === 0) return 'today';
  return 'upcoming';
}

/** 第幾天複習（以本輪起算日為第 1 天） */
export function dueDayNumber(item: ReviewItem): number {
  return diffDays(item.due, item.anchor) + 1;
}

/** 列出未來排程（含本次），用於「複習計畫」月曆 */
export function projectedDates(item: ReviewItem, offsets = DEFAULT_OFFSETS): DayStr[] {
  if (item.done) return [];
  const out = [item.due];
  for (let s = item.stage + 1; s < offsets.length; s++) out.push(addDay(item.anchor, offsets[s]));
  return out;
}

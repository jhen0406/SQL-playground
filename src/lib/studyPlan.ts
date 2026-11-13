import { addDay, diffDays, fromDay, toDay, type DayStr } from './date';

/**
 * 學習計畫（新章節的進度規劃，不含複習）。
 *   時間模式：每日／每週／每月學 count 章
 *   目標模式：goalDays 天內學完全部章節；每天依「剩餘章數 ÷ 剩餘天數」自動重排，截止日不變
 * 週從週日開始（與月曆一致）。
 */
export interface StudyPlan {
  enabled: boolean;
  mode: 'time' | 'goal';
  period: 'day' | 'week' | 'month';
  count: number;
  goalDays: number;
  /** 目標模式開始那天；截止日 = goalStart + goalDays - 1 */
  goalStart: DayStr | null;
}

export const DEFAULT_STUDY_PLAN: StudyPlan = {
  enabled: false,
  mode: 'time',
  period: 'week',
  count: 3,
  goalDays: 30,
  goalStart: null,
};

export interface PeriodView {
  kind: 'week' | 'month';
  start: DayStr;
  end: DayStr;
  target: number;
  done: number;
  /** 這個週期要學的章節（含本週期已完成的） */
  chapterIds: string[];
}

export interface PlanView {
  total: number;
  doneCount: number;
  remaining: number;
  allDone: boolean;
  /** 日模式、目標模式：今天起每天要學的章節（今天那天包含今天已完成的） */
  perDay: Map<DayStr, string[]>;
  /** 日模式、目標模式的今日目標 */
  today: { target: number; done: number; chapterIds: string[] } | null;
  /** 週／月模式的目前週期 */
  period: PeriodView | null;
  /** 週模式：從本週起每週（key = 週日）要學的章節 */
  weekBands: Map<DayStr, { target: number; chapterIds: string[] }>;
  /** 目標模式的截止日 */
  deadline: DayStr | null;
  /** 截止日（含）前還剩幾天，含今天 */
  daysLeft: number | null;
  /** 已過截止日但還沒學完 */
  overdue: boolean;
  /** 目標模式：今天的量比原本的平均速度重，代表進度落後 */
  behind: boolean;
  /** 預計全部學完的日子 */
  finishDay: DayStr | null;
}

export function weekStart(day: DayStr): DayStr {
  return addDay(day, -fromDay(day).getDay());
}

export function monthRange(day: DayStr): { start: DayStr; end: DayStr } {
  const d = fromDay(day);
  const start = toDay(new Date(d.getFullYear(), d.getMonth(), 1));
  const end = toDay(new Date(d.getFullYear(), d.getMonth() + 1, 0));
  return { start, end };
}

/**
 * @param chapterIds 依章節順序的全部章節 id
 * @param completed  章節 id → 完成日
 */
export function buildPlan(chapterIds: string[], completed: Map<string, DayStr>, today: DayStr, plan: StudyPlan): PlanView {
  const done = chapterIds.filter((id) => completed.has(id));
  const notDone = chapterIds.filter((id) => !completed.has(id));
  const view: PlanView = {
    total: chapterIds.length,
    doneCount: done.length,
    remaining: notDone.length,
    allDone: notDone.length === 0,
    perDay: new Map(),
    today: null,
    period: null,
    weekBands: new Map(),
    deadline: null,
    daysLeft: null,
    overdue: false,
    behind: false,
    finishDay: null,
  };
  if (!plan.enabled) return view;

  const doneIn = (from: DayStr, to: DayStr) => done.filter((id) => completed.get(id)! >= from && completed.get(id)! <= to);

  // ---- 每天配額的模式：目標模式、時間模式（日） ----
  if (plan.mode === 'goal' || plan.period === 'day') {
    const doneToday = doneIn(today, today);
    // 今天開始時還沒學的 = 今天已學完的 + 還沒學的（今天學完的算進今天的額度）
    const pool = [...doneToday, ...notDone];
    if (plan.mode === 'goal') {
      const start = plan.goalStart ?? today;
      const deadline = addDay(start, Math.max(1, plan.goalDays) - 1);
      const daysLeft = diffDays(deadline, today) + 1;
      view.deadline = deadline;
      view.daysLeft = Math.max(0, daysLeft);
      if (daysLeft <= 0) {
        view.overdue = notDone.length > 0;
        if (pool.length) view.perDay.set(today, pool);
      } else {
        let rest = pool.slice();
        for (let i = 0; i < daysLeft && rest.length; i++) {
          let n = Math.ceil(rest.length / (daysLeft - i));
          if (i === 0) n = Math.max(n, doneToday.length);
          view.perDay.set(addDay(today, i), rest.slice(0, n));
          rest = rest.slice(n);
        }
        const basePace = Math.ceil(chapterIds.length / Math.max(1, plan.goalDays));
        view.behind = (view.perDay.get(today)?.length ?? 0) > basePace;
      }
    } else {
      const per = Math.max(1, plan.count);
      let rest = pool.slice();
      for (let i = 0; rest.length; i++) {
        const n = i === 0 ? Math.max(per, doneToday.length) : per;
        view.perDay.set(addDay(today, i), rest.slice(0, n));
        rest = rest.slice(n);
      }
    }
    const todays = view.perDay.get(today) ?? [];
    view.today = { target: todays.length, done: doneToday.length, chapterIds: todays };
    const days = [...view.perDay.keys()];
    view.finishDay = view.allDone ? null : days[days.length - 1] ?? null;
    return view;
  }

  // ---- 週期配額的模式：時間模式（週／月） ----
  const per = Math.max(1, plan.count);
  const kind = plan.period;
  const range = kind === 'week' ? { start: weekStart(today), end: addDay(weekStart(today), 6) } : monthRange(today);
  const doneThis = doneIn(range.start, range.end);
  const thisTarget = Math.max(per, doneThis.length);
  let rest = notDone.slice();
  const firstNew = rest.slice(0, Math.max(0, thisTarget - doneThis.length));
  rest = rest.slice(firstNew.length);
  view.period = { kind, start: range.start, end: range.end, target: per, done: doneThis.length, chapterIds: [...doneThis, ...firstNew] };

  let lastEnd = range.end;
  if (kind === 'week') {
    view.weekBands.set(range.start, { target: per, chapterIds: view.period.chapterIds });
    let ws = addDay(range.start, 7);
    while (rest.length) {
      view.weekBands.set(ws, { target: per, chapterIds: rest.slice(0, per) });
      rest = rest.slice(per);
      lastEnd = addDay(ws, 6);
      ws = addDay(ws, 7);
    }
  } else {
    let next = addDay(range.end, 1);
    while (rest.length) {
      rest = rest.slice(per);
      lastEnd = monthRange(next).end;
      next = addDay(lastEnd, 1);
    }
  }
  view.finishDay = view.allDone ? null : lastEnd;
  return view;
}

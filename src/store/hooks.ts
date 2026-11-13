import { useEffect, useMemo, useState } from 'react';
import { chapters, mastery } from '../content';
import { today, type DayStr } from '../lib/date';
import { reviewStatus, type ReviewItem } from '../srs/schedule';
import { buildPlan, type PlanView } from '../lib/studyPlan';
import { db, getSettings, useLive, useSettings, type ChapterProgress, type MasteryState } from './db';

/** 讓「今天」在跨日或模擬日期改變時重新計算 */
export function useToday(): DayStr {
  const [d, setD] = useState(today());
  useEffect(() => {
    const id = window.setInterval(() => setD(today()), 60_000);
    const h = () => setD(today());
    window.addEventListener('sqlpg-day', h);
    return () => {
      window.clearInterval(id);
      window.removeEventListener('sqlpg-day', h);
    };
  }, []);
  return d;
}

export function useChapterProgress(): Map<string, ChapterProgress> {
  const rows = useLive(() => db.chapters.toArray(), [], []);
  return new Map((rows ?? []).map((r) => [r.chapterId, r]));
}

export function useReviews(): ReviewItem[] {
  return useLive(() => db.reviews.toArray(), [], []) ?? [];
}

export function useMasteryStates(): Map<string, MasteryState> {
  const rows = useLive(() => db.mastery.toArray(), [], []);
  return new Map((rows ?? []).map((r) => [r.problemId, r]));
}

export function dueReviews(items: ReviewItem[], day: DayStr) {
  const due = items.filter((i) => {
    const s = reviewStatus(i, day);
    return s === 'today' || s === 'overdue';
  });
  return due.sort((a, b) => a.due.localeCompare(b.due));
}

/** 章節是否可以進入：第一章永遠開放，其餘需要前一章完成 */
export function isChapterUnlocked(index: number, done: Map<string, ChapterProgress>): boolean {
  if (index === 0) return true;
  return done.has(chapters[index - 1].id) || done.has(chapters[index].id);
}

/** 題型組是否開放：前置章節全部學完，或在設定中手動解鎖 */
export function isPatternOpen(requires: string[], done: Map<string, ChapterProgress>, unlocked: boolean): boolean {
  return unlocked || requires.every((id) => done.has(id));
}

export function allChaptersDone(done: Map<string, ChapterProgress>): boolean {
  return chapters.every((c) => done.has(c.id));
}

/** 取得（或建立）今天的精熟每日題 */
export async function ensureDailySet(day: DayStr): Promise<string[]> {
  const existing = await db.daily.get(day);
  if (existing) return existing.problemIds;
  const { dailyCount } = await getSettings();
  const states = new Map((await db.mastery.toArray()).map((s) => [s.problemId, s]));
  const unsolved = mastery.filter((p) => !states.get(p.id)?.solved);
  const ids = unsolved.slice(0, Math.max(1, dailyCount)).map((p) => p.id);
  await db.daily.put({ day, problemIds: ids });
  return ids;
}

/** 已開放的精熟題：曾經被排入每日題、或已作答過的題目 */
export function useOpenedProblems(): Set<string> {
  const days = useLive(() => db.daily.toArray(), [], []);
  const states = useMasteryStates();
  const s = new Set<string>();
  for (const d of days ?? []) d.problemIds.forEach((id) => s.add(id));
  for (const id of states.keys()) s.add(id);
  return s;
}

/** 學習計畫的目前狀態（依設定、已完成章節與今天的日期計算） */
export function useStudyPlan(): PlanView {
  const day = useToday();
  const done = useChapterProgress();
  const { studyPlan } = useSettings();
  const key = [...done.values()].map((c) => c.chapterId + c.completedDay).join(',');
  return useMemo(
    () => buildPlan(chapters.map((c) => c.id), new Map([...done.values()].map((c) => [c.chapterId, c.completedDay])), day, studyPlan),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key, day, JSON.stringify(studyPlan)],
  );
}

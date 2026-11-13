import { describe, expect, it } from 'vitest';
import { buildPlan, DEFAULT_STUDY_PLAN, monthRange, weekStart, type StudyPlan } from '../src/lib/studyPlan';

const IDS = Array.from({ length: 10 }, (_, i) => `c${String(i + 1).padStart(2, '0')}`);
const plan = (p: Partial<StudyPlan>): StudyPlan => ({ ...DEFAULT_STUDY_PLAN, enabled: true, ...p });
const counts = (m: Map<string, string[]>) => [...m.values()].map((v) => v.length);

describe('學習計畫：目標模式', () => {
  it('可以整除時平均分配，總數等於全部章節', () => {
    const v = buildPlan(IDS, new Map(), '2026-11-10', plan({ mode: 'goal', goalDays: 5, goalStart: '2026-11-10' }));
    expect(counts(v.perDay)).toEqual([2, 2, 2, 2, 2]);
    expect(v.deadline).toBe('2026-11-14');
    expect(v.finishDay).toBe('2026-11-14');
    expect(v.today).toEqual({ target: 2, done: 0, chapterIds: ['c01', 'c02'] });
  });

  it('不能整除時前面的天數多分一章', () => {
    const v = buildPlan(IDS, new Map(), '2026-11-10', plan({ mode: 'goal', goalDays: 4, goalStart: '2026-11-10' }));
    expect(counts(v.perDay)).toEqual([3, 3, 2, 2]);
  });

  it('今天已學完的章節算進今天的額度，不會讓明天變少', () => {
    const done = new Map([['c01', '2026-11-10']]);
    const v = buildPlan(IDS, done, '2026-11-10', plan({ mode: 'goal', goalDays: 5, goalStart: '2026-11-10' }));
    expect(v.today).toEqual({ target: 2, done: 1, chapterIds: ['c01', 'c02'] });
    expect(counts(v.perDay)).toEqual([2, 2, 2, 2, 2]);
  });

  it('落後時自動把之後每天的量加重，截止日不變', () => {
    // 原本 5 天每天 2 章；兩天都沒學，第 3 天開始剩 10 章 / 3 天
    const v = buildPlan(IDS, new Map(), '2026-11-12', plan({ mode: 'goal', goalDays: 5, goalStart: '2026-11-10' }));
    expect(counts(v.perDay)).toEqual([4, 3, 3]);
    expect(v.daysLeft).toBe(3);
    expect(v.behind).toBe(true);
  });

  it('過了截止日：剩下的全部排在今天並標記逾期', () => {
    const v = buildPlan(IDS, new Map([['c01', '2026-11-11']]), '2026-11-20', plan({ mode: 'goal', goalDays: 5, goalStart: '2026-11-10' }));
    expect(v.overdue).toBe(true);
    expect(counts(v.perDay)).toEqual([9]);
  });

  it('全部學完', () => {
    const all = new Map(IDS.map((id) => [id, '2026-11-01']));
    const v = buildPlan(IDS, all, '2026-11-10', plan({ mode: 'goal', goalDays: 5, goalStart: '2026-11-10' }));
    expect(v.allDone).toBe(true);
    expect(v.finishDay).toBeNull();
    expect(v.perDay.size).toBe(0);
  });
});

describe('學習計畫：時間模式', () => {
  it('日模式：從今天起每天 count 章', () => {
    const v = buildPlan(IDS, new Map([['c01', '2026-11-01']]), '2026-11-10', plan({ mode: 'time', period: 'day', count: 4 }));
    expect(counts(v.perDay)).toEqual([4, 4, 1]);
    expect(v.today?.chapterIds).toEqual(['c02', 'c03', 'c04', 'c05']);
    expect(v.finishDay).toBe('2026-11-12');
  });

  it('週模式：週從週日開始，本週已完成的算進本週', () => {
    // 2026-11-11 是週三，本週 = 11/08（日）～ 11/14（六）
    const done = new Map([['c01', '2026-11-09'], ['c02', '2026-11-01']]);
    const v = buildPlan(IDS, done, '2026-11-11', plan({ mode: 'time', period: 'week', count: 3 }));
    expect(v.period).toMatchObject({ kind: 'week', start: '2026-11-08', end: '2026-11-14', target: 3, done: 1 });
    expect(v.period?.chapterIds).toEqual(['c01', 'c03', 'c04']);
    expect([...v.weekBands.keys()]).toEqual(['2026-11-08', '2026-11-15', '2026-11-22']);
    expect(v.finishDay).toBe('2026-11-28');
  });

  it('月模式：本月區間與預計完成月份', () => {
    const v = buildPlan(IDS, new Map(), '2026-11-11', plan({ mode: 'time', period: 'month', count: 4 }));
    expect(v.period).toMatchObject({ kind: 'month', start: '2026-11-01', end: '2026-11-30', target: 4, done: 0 });
    expect(v.finishDay).toBe('2027-01-31');
  });

  it('週與月的區間計算', () => {
    expect(weekStart('2026-11-08')).toBe('2026-11-08');
    expect(weekStart('2026-11-14')).toBe('2026-11-08');
    expect(monthRange('2026-02-15')).toEqual({ start: '2026-02-01', end: '2026-02-28' });
  });

  it('沒開啟時不排程', () => {
    const v = buildPlan(IDS, new Map(), '2026-11-10', DEFAULT_STUDY_PLAN);
    expect(v.today).toBeNull();
    expect(v.period).toBeNull();
    expect(v.perDay.size).toBe(0);
  });
});

import Dexie, { liveQuery, type Table } from 'dexie';
import { useEffect, useState } from 'react';
import type { ReviewItem } from '../srs/schedule';
import { DEFAULT_OFFSETS } from '../srs/schedule';
import { DEFAULT_STUDY_PLAN, type StudyPlan } from '../lib/studyPlan';

export type ActivityType = 'learn' | 'practice' | 'review' | 'mastery';

export interface Activity {
  id?: number;
  day: string; // yyyy-MM-dd
  ts: number;
  type: ActivityType;
  refId: string; // chapterId 或 problemId
  title: string;
  correct?: boolean;
  sql?: string;
  detail?: string;
}

export interface ChapterProgress {
  chapterId: string;
  completedDay: string;
  completedTs: number;
}

export interface Submission {
  id?: number;
  exerciseId: string;
  ts: number;
  day: string;
  sql: string;
  pass: boolean;
  summary: string;
  aiFeedback?: string;
}

export interface MasteryState {
  problemId: string;
  solved: boolean;
  attempts: number;
  firstSolvedDay?: string;
}

export interface DailySet {
  day: string;
  problemIds: string[];
}

export interface Draft {
  key: string;
  sql: string;
}

export interface Note {
  id?: number;
  chapterId: string;
  /** 0 = 概念說明, 1 = 範例實作 */
  step: number;
  /** 標記的原文 */
  text: string;
  /** 這段文字在該步驟內容中第幾次出現（還原標記位置用） */
  occurrence: number;
  comment?: string;
  ts: number;
  day: string;
}

export interface Settings {
  offsets: number[];
  notifications: boolean;
  masteryUnlocked: boolean;
  dailyCount: number;
  /** 頭像插圖編號（src/components/Avatars.tsx） */
  avatar: number;
  /** 學習計畫（新章節進度）：src/lib/studyPlan.ts */
  studyPlan: StudyPlan;
}

export const DEFAULT_SETTINGS: Settings = {
  offsets: DEFAULT_OFFSETS,
  notifications: true,
  masteryUnlocked: false,
  dailyCount: 2,
  avatar: 0,
  studyPlan: DEFAULT_STUDY_PLAN,
};

class AppDB extends Dexie {
  activities!: Table<Activity, number>;
  chapters!: Table<ChapterProgress, string>;
  reviews!: Table<ReviewItem, string>;
  submissions!: Table<Submission, number>;
  mastery!: Table<MasteryState, string>;
  daily!: Table<DailySet, string>;
  drafts!: Table<Draft, string>;
  kv!: Table<{ key: string; value: unknown }, string>;
  notes!: Table<Note, number>;

  constructor() {
    super('sql-playground');
    this.version(1).stores({
      activities: '++id, day, ts, type, refId',
      chapters: 'chapterId',
      reviews: 'chapterId, due',
      submissions: '++id, exerciseId, ts',
      mastery: 'problemId',
      daily: 'day',
      drafts: 'key',
      kv: 'key',
    });
    this.version(2).stores({ notes: '++id, chapterId, ts' });
  }
}

export const db = new AppDB();

/** Dexie liveQuery 的 React hook：資料變動時自動重新渲染。 */
export function useLive<T>(query: () => Promise<T> | T, deps: unknown[] = [], initial?: T): T | undefined {
  const [value, setValue] = useState<T | undefined>(initial);
  useEffect(() => {
    const sub = liveQuery(query).subscribe({ next: setValue, error: (e) => console.error(e) });
    return () => sub.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return value;
}

export async function getSettings(): Promise<Settings> {
  const row = await db.kv.get('settings');
  const saved = (row?.value as Partial<Settings>) ?? {};
  // studyPlan 是巢狀物件：舊資料沒有某些欄位時補上預設值
  return { ...DEFAULT_SETTINGS, ...saved, studyPlan: { ...DEFAULT_STUDY_PLAN, ...(saved.studyPlan ?? {}) } };
}

export async function saveSettings(patch: Partial<Settings>) {
  const cur = await getSettings();
  await db.kv.put({ key: 'settings', value: { ...cur, ...patch } });
}

export function useSettings(): Settings {
  return useLive(getSettings, [], DEFAULT_SETTINGS) ?? DEFAULT_SETTINGS;
}

export async function exportAll(): Promise<string> {
  const data: Record<string, unknown[]> = {};
  for (const t of db.tables) data[t.name] = await t.toArray();
  return JSON.stringify({ app: 'sql-playground', version: 1, exportedAt: new Date().toISOString(), data }, null, 2);
}

export async function importAll(json: string) {
  const parsed = JSON.parse(json) as { app?: string; data?: Record<string, unknown[]> };
  if (parsed.app !== 'sql-playground' || !parsed.data) throw new Error('不是有效的備份檔');
  await db.transaction('rw', db.tables, async () => {
    for (const t of db.tables) {
      await t.clear();
      const rows = parsed.data![t.name];
      if (rows?.length) await t.bulkAdd(rows as never[]);
    }
  });
}

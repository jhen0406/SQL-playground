import type { Chapter, Dataset, DrillPattern, DrillProblem, Exercise, MasteryProblem } from './types';
import { shop } from './datasets/shop';
import { ecommerce, hr, saas } from './datasets/business';
import { part1 } from './chapters/part1';
import { part2 } from './chapters/part2';
import { part3 } from './chapters/part3';
import { part4 } from './chapters/part4';
import { part5 } from './chapters/part5';
import { part6 } from './chapters/part6';
import { extraPractice } from './chapters/extraPractice';
import { mysqlSolutions } from './mysqlSolutions';
import { masteryProblems } from './mastery/problems';
import { drillDatasets } from './datasets/drills';
import { drillPatterns as patterns } from './drills/patterns';
import { drillProblems } from './drills/problems';

/** 合併 MySQL 寫法（src/content/mysqlSolutions.ts） */
function withMysql<T extends Exercise>(ex: T): T {
  const m = mysqlSolutions[ex.id];
  return m ? { ...ex, mysql: ex.mysql ?? m.mysql, mysqlNote: ex.mysqlNote ?? m.note } : ex;
}

export const datasets: Record<string, Dataset> = {
  shop,
  ecommerce,
  hr,
  saas,
  ...Object.fromEntries(drillDatasets.map((d) => [d.id, d])),
};

export const chapters: Chapter[] = [...part1, ...part2, ...part3, ...part4, ...part5, ...part6]
  .map((c) => (extraPractice[c.id] ? { ...c, morePractice: [...(c.morePractice ?? []), ...extraPractice[c.id]] } : c))
  .map((c) => ({ ...c, practice: withMysql(c.practice), morePractice: c.morePractice?.map(withMysql), review: withMysql(c.review) }))
  .sort((a, b) => a.order - b.order);

export const PART_LABELS: Record<Chapter['part'], string> = {
  basic: '第一部：SQL 基礎（w3schools 路線）',
  database: '第二部：資料庫與資料表',
  leetcode: '第三部：銜接 LeetCode 的進階技巧',
};

export const mastery: MasteryProblem[] = masteryProblems.map(withMysql);

/** 題型特訓：題型組與題目（題目依題型組順序排列） */
export const drillPatterns: DrillPattern[] = patterns;
export const drills: DrillProblem[] = patterns.flatMap((pt) => drillProblems.filter((p) => p.patternId === pt.id)).map(withMysql);

export function getDrill(id: string): DrillProblem | undefined {
  return drills.find((p) => p.id === id);
}

export function getPattern(id: string): DrillPattern | undefined {
  return drillPatterns.find((p) => p.id === id);
}

/** 本章全部練習題（第 1 題 + morePractice） */
export function chapterPractices(ch: Chapter): Exercise[] {
  return [ch.practice, ...(ch.morePractice ?? [])];
}

/** 複習輪流出題的題庫：複習題 + 各練習題 */
export function reviewPool(ch: Chapter): Exercise[] {
  return [ch.review, ...chapterPractices(ch)];
}

/** 第 n 次複習（從 0 起算）要出的題目 */
export function reviewExercise(ch: Chapter, n: number): Exercise {
  const pool = reviewPool(ch);
  return pool[((n % pool.length) + pool.length) % pool.length];
}

export type ExerciseSource = 'chapter' | 'mastery' | 'drill';

export interface ExerciseEntry {
  exercise: Exercise;
  source: ExerciseSource;
  /** 例如「第 5 章 · AND、OR、NOT」「精熟 · Medium」「題型特訓 · 補零」 */
  groupLabel: string;
  /** 題目在該組中的角色，例如「練習 2」「複習題」 */
  role: string;
}

let entryCache: ExerciseEntry[] | null = null;
/** 所有題目，依課程順序：章節（各練習、複習題）→ 精熟題 → 題型特訓 */
export function allExerciseEntries(): ExerciseEntry[] {
  if (entryCache) return entryCache;
  const out: ExerciseEntry[] = [];
  for (const c of chapters) {
    const g = `第 ${c.order} 章 · ${c.title}`;
    chapterPractices(c).forEach((e, i, arr) => out.push({ exercise: e, source: 'chapter', groupLabel: g, role: arr.length > 1 ? `練習 ${i + 1}` : '練習題' }));
    out.push({ exercise: c.review, source: 'chapter', groupLabel: g, role: '複習題' });
  }
  for (const p of mastery) out.push({ exercise: p, source: 'mastery', groupLabel: `精熟挑戰 · ${p.difficulty}`, role: p.topic });
  for (const d of drills) out.push({ exercise: d, source: 'drill', groupLabel: `題型特訓 · ${getPattern(d.patternId)?.title ?? ''}`, role: d.difficulty });
  entryCache = out;
  return out;
}

export function findExercise(id: string): ExerciseEntry | undefined {
  return allExerciseEntries().find((e) => e.exercise.id === id);
}

export function getChapter(id: string): Chapter | undefined {
  return chapters.find((c) => c.id === id);
}

export function getProblem(id: string): MasteryProblem | undefined {
  return mastery.find((p) => p.id === id);
}

export function getDataset(ex: Exercise): Dataset {
  const ds = datasets[ex.datasetId];
  if (!ds) throw new Error('Unknown dataset ' + ex.datasetId);
  return ds;
}

/** 章節 id 清單 → 「第 5–7 章」或「第 3、5 章」 */
export function chapterRange(ids: string[]): string {
  const nums = ids.map((id) => getChapter(id)?.order ?? 0).sort((a, b) => a - b);
  if (!nums.length) return '';
  const contiguous = nums.every((n, i) => i === 0 || n === nums[i - 1] + 1);
  return contiguous && nums.length > 1 ? `第 ${nums[0]}–${nums[nums.length - 1]} 章` : `第 ${nums.join('、')} 章`;
}

import type { Chapter, Dataset, DrillPattern, DrillProblem, Exercise, MasteryProblem } from './types';
import { shop } from './datasets/shop';
import { ecommerce, hr, saas } from './datasets/business';
import { part1 } from './chapters/part1';
import { part2 } from './chapters/part2';
import { part3 } from './chapters/part3';
import { part4 } from './chapters/part4';
import { masteryProblems } from './mastery/problems';
import { drillDatasets } from './datasets/drills';
import { drillPatterns as patterns } from './drills/patterns';
import { drillProblems } from './drills/problems';

export const datasets: Record<string, Dataset> = {
  shop,
  ecommerce,
  hr,
  saas,
  ...Object.fromEntries(drillDatasets.map((d) => [d.id, d])),
};

export const chapters: Chapter[] = [...part1, ...part2, ...part3, ...part4].sort((a, b) => a.order - b.order);

export const PART_LABELS: Record<Chapter['part'], string> = {
  basic: '第一部：SQL 基礎（w3schools 路線）',
  database: '第二部：資料庫與資料表',
  leetcode: '第三部：銜接 LeetCode 的進階技巧',
};

export const mastery: MasteryProblem[] = masteryProblems;

/** 題型特訓：題型組與題目（題目依題型組順序排列） */
export const drillPatterns: DrillPattern[] = patterns;
export const drills: DrillProblem[] = patterns.flatMap((pt) => drillProblems.filter((p) => p.patternId === pt.id));

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

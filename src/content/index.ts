import type { Chapter, Dataset, Exercise, MasteryProblem } from './types';
import { shop } from './datasets/shop';
import { ecommerce, hr, saas } from './datasets/business';
import { part1 } from './chapters/part1';
import { part2 } from './chapters/part2';
import { part3 } from './chapters/part3';
import { part4 } from './chapters/part4';
import { masteryProblems } from './mastery/problems';

export const datasets: Record<string, Dataset> = { shop, ecommerce, hr, saas };

export const chapters: Chapter[] = [...part1, ...part2, ...part3, ...part4].sort((a, b) => a.order - b.order);

export const PART_LABELS: Record<Chapter['part'], string> = {
  basic: '第一部：SQL 基礎（w3schools 路線）',
  database: '第二部：資料庫與資料表',
  leetcode: '第三部：銜接 LeetCode 的進階技巧',
};

export const mastery: MasteryProblem[] = masteryProblems;

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

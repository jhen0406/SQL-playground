import { describe, it, expect, beforeAll } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { createPGlite } from '../src/db/pglite';
import { runInSandbox } from '../src/db/sandbox';
import { gradeExercise, buildSetup, type Runner } from '../src/grading/grade';
import { chapters, mastery, drills, drillPatterns, datasets, getDataset } from '../src/content';
import type { Exercise } from '../src/content/types';
import { pgOnlyFeatures } from '../src/lib/pgOnly';

let db: PGlite;
let run: Runner;
beforeAll(async () => {
  db = createPGlite();
  await db.waitReady;
  run = (req) => runInSandbox(db, req);
});

const all: { where: string; ex: Exercise }[] = [
  ...chapters.flatMap((c) => [
    { where: `${c.id} practice`, ex: c.practice },
    ...(c.morePractice ?? []).map((p, i) => ({ where: `${c.id} practice ${i + 2}`, ex: p })),
    { where: `${c.id} review`, ex: c.review },
  ]),
  ...mastery.map((p) => ({ where: p.id, ex: p as Exercise })),
  ...drills.map((p) => ({ where: p.id, ex: p as Exercise })),
];

describe('content', () => {
  it('has unique ids', () => {
    const ids = all.map((a) => a.ex.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(chapters.map((c) => c.id)).size).toBe(chapters.length);
  });

  it('chapter examples run', async () => {
    for (const c of chapters) {
      for (const e of c.examples) {
        const out = await run({ setupSql: buildSetup(datasets.shop, {}, false), sql: e.sql });
        // 有些範例刻意示範錯誤（違反約束、外鍵）
        const intentional = /違反|外鍵|失敗|錯誤|拒絕/.test(e.explain);
        if (!out.ok && !intentional) throw new Error(`${c.id} example "${e.title}" failed: ${out.error}`);
      }
    }
  });

  it('drill patterns: template SQL runs and every pattern has problems', async () => {
    const ids = new Set(chapters.map((c) => c.id));
    for (const pt of drillPatterns) {
      expect(drills.some((d) => d.patternId === pt.id), `${pt.id} has no problems`).toBe(true);
      for (const r of pt.requires) expect(ids.has(r), `${pt.id} requires unknown chapter ${r}`).toBe(true);
      const out = await run({ setupSql: buildSetup(datasets[pt.datasetId], {}, false), sql: pt.templateSql });
      if (!out.ok) throw new Error(`${pt.id} template failed: ${out.error}`);
    }
    expect(drills.every((d) => drillPatterns.some((pt) => pt.id === d.patternId))).toBe(true);
  });

  it('drill datasets: hidden data loads', async () => {
    for (const ds of Object.values(datasets)) {
      if (!ds.hiddenExtraSql) continue;
      const out = await run({ setupSql: buildSetup(ds, {}, true), sql: 'SELECT 1' });
      if (!out.ok) throw new Error(`${ds.id} hidden setup failed: ${out.error}`);
    }
  });

  for (const { where, ex } of all) {
    it(`${where}: solution passes its own grading and returns rows`, async () => {
      const ds = getDataset(ex);
      const g = await gradeExercise(run, ds, ex, ex.solution);
      if (!g.pass) throw new Error(`${where}: ${g.summary}`);
      const visible = g.cases[0];
      expect(visible.expected!.rows.length, `${where} visible result is empty`).toBeGreaterThan(0);
    });
  }
});

describe('chapter helpers', () => {
  it('review rotates through review + practices', async () => {
    const { reviewExercise, reviewPool } = await import('../src/content');
    for (const c of chapters) {
      const pool = reviewPool(c);
      expect(reviewExercise(c, 0).id).toBe(c.review.id);
      const seen = new Set(pool.map((_, i) => reviewExercise(c, i).id));
      expect(seen.size).toBe(pool.length);
      expect(reviewExercise(c, pool.length).id).toBe(c.review.id);
    }
  });
});

describe('chapter order', () => {
  it('orders are 1..N without gaps', () => {
    expect(chapters.map((c) => c.order)).toEqual(chapters.map((_, i) => i + 1));
  });
});

describe('MySQL 寫法', () => {
  it('用到 PostgreSQL 專屬語法的題目都附 MySQL 寫法', () => {
    const missing = all
      .map(({ where, ex }) => ({ where, ex, f: pgOnlyFeatures(ex.solution) }))
      .filter(({ ex, f }) => f.length > 0 && !ex.mysql && !ex.inputTemplate)
      .map(({ where, f }) => `${where}：${f.join('、')}`);
    expect(missing).toEqual([]);
  });
  it('有 MySQL 寫法就有差異說明', () => {
    expect(all.filter(({ ex }) => ex.mysql && !ex.mysqlNote).map(({ where }) => where)).toEqual([]);
  });
});


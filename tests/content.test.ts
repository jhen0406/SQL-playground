import { describe, it, expect, beforeAll } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { createPGlite } from '../src/db/pglite';
import { runInSandbox } from '../src/db/sandbox';
import { gradeExercise, buildSetup, type Runner } from '../src/grading/grade';
import { chapters, mastery, datasets, getDataset } from '../src/content';
import type { Exercise } from '../src/content/types';

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
    { where: `${c.id} review`, ex: c.review },
  ]),
  ...mastery.map((p) => ({ where: p.id, ex: p as Exercise })),
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

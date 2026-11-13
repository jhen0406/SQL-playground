import { describe, it, expect, beforeAll } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { createPGlite } from '../src/db/pglite';
import { runInSandbox } from '../src/db/sandbox';

let db: PGlite;
beforeAll(async () => {
  db = createPGlite();
  await db.waitReady;
});

const setupSql = 'CREATE TABLE acc (id INT PRIMARY KEY, bal INT); INSERT INTO acc VALUES (1, 100), (2, 50);';
const check = 'SELECT id, bal FROM acc ORDER BY id';
const run = (sql: string) => runInSandbox(db, { setupSql, sql, checkQuery: check });

describe('沙盒的交易行為', () => {
  it('BEGIN … COMMIT 的改動會保留', async () => {
    const out = await run('BEGIN; UPDATE acc SET bal = bal - 30 WHERE id = 1; UPDATE acc SET bal = bal + 30 WHERE id = 2; COMMIT;');
    expect(out.ok && out.check?.rows).toEqual([[1, 70], [2, 80]]);
    expect(out.ok && out.rolledBack).toBe(false);
  });
  it('忘了 COMMIT：結束時自動 ROLLBACK，改動不保留', async () => {
    const out = await run('BEGIN; UPDATE acc SET bal = 0;');
    expect(out.ok && out.rolledBack).toBe(true);
    expect(out.ok && out.check?.rows).toEqual([[1, 100], [2, 50]]);
  });
  it('交易中出錯後，下一次執行仍然正常', async () => {
    const bad = await run('BEGIN; UPDATE acc SET bal = 0; SELECT 1 / 0;');
    expect(bad.ok).toBe(false);
    const next = await run('SELECT COUNT(*) FROM acc;');
    expect(next.ok && next.result?.rows).toEqual([[2]]);
  });
  it('ROLLBACK TO SAVEPOINT 只撤回後半段', async () => {
    const out = await run('BEGIN; UPDATE acc SET bal = 1 WHERE id = 1; SAVEPOINT s; UPDATE acc SET bal = 2 WHERE id = 2; ROLLBACK TO SAVEPOINT s; COMMIT;');
    expect(out.ok && out.check?.rows).toEqual([[1, 1], [2, 50]]);
  });
  it('沒有交易指令時照常自動提交', async () => {
    const out = await run('UPDATE acc SET bal = 7 WHERE id = 2;');
    expect(out.ok && out.check?.rows).toEqual([[1, 100], [2, 7]]);
  });
});

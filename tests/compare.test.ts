import { describe, it, expect } from 'vitest';
import { compareResults } from '../src/grading/compare';

const r = (columns: string[], rows: unknown[][]) => ({ columns, rows });

describe('compareResults', () => {
  it('ignores row order by default', () => {
    expect(compareResults(r(['a'], [[1], [2]]), r(['a'], [[2], [1]])).pass).toBe(true);
  });
  it('detects order when required', () => {
    const c = compareResults(r(['a'], [[1], [2]]), r(['a'], [[2], [1]]), { orderMatters: true });
    expect(c.pass).toBe(false);
    expect(c.reason).toContain('排序');
  });
  it('treats numeric strings and numbers equally, with tolerance', () => {
    expect(compareResults(r(['x'], [['3.50']]), r(['x'], [[3.5]])).pass).toBe(true);
    expect(compareResults(r(['x'], [['1.00000000000000000000']]), r(['x'], [[1]])).pass).toBe(true);
    expect(compareResults(r(['x'], [[0.33333]]), r(['x'], [['0.33333333']])).pass).toBe(true);
    expect(compareResults(r(['x'], [[0.34]]), r(['x'], [[0.33]])).pass).toBe(false);
  });
  it('handles NULLs and duplicates as a multiset', () => {
    expect(compareResults(r(['a'], [[null], [1], [1]]), r(['a'], [[1], [null], [1]])).pass).toBe(true);
    expect(compareResults(r(['a'], [[1], [1], [2]]), r(['a'], [[1], [2], [2]])).pass).toBe(false);
  });
  it('reports column count and row count mismatches', () => {
    expect(compareResults(r(['a', 'b'], [[1, 2]]), r(['a'], [[1]])).reason).toContain('欄位數量');
    expect(compareResults(r(['a'], [[1]]), r(['a'], [[1], [2]])).reason).toContain('列數');
  });
  it('checks column names only when strict', () => {
    expect(compareResults(r(['x'], [[1]]), r(['total'], [[1]])).pass).toBe(true);
    expect(compareResults(r(['x'], [[1]]), r(['total'], [[1]]), { strictColumns: true }).pass).toBe(false);
    expect(compareResults(r(['TOTAL'], [[1]]), r(['total'], [[1]]), { strictColumns: true }).pass).toBe(true);
  });
  it('fails when no result set', () => {
    expect(compareResults(null, r(['a'], [[1]])).pass).toBe(false);
  });
});

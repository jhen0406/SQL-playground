import { describe, expect, it } from 'vitest';
import { locate, nthIndexOf, occurrenceAt } from '../src/lib/textMatch';

describe('重點筆記文字定位', () => {
  const hay = 'SELECT a FROM t; SELECT b FROM t; SELECT c';
  it('nthIndexOf 找第 n 次出現', () => {
    expect(nthIndexOf(hay, 'SELECT', 0)).toBe(0);
    expect(nthIndexOf(hay, 'SELECT', 1)).toBe(17);
    expect(nthIndexOf(hay, 'SELECT', 2)).toBe(34);
    expect(nthIndexOf(hay, 'SELECT', 3)).toBe(-1);
    expect(nthIndexOf(hay, '', 0)).toBe(-1);
  });
  it('occurrenceAt 與 nthIndexOf 互為反函數', () => {
    for (let n = 0; n < 3; n++) {
      const at = nthIndexOf(hay, 'SELECT', n);
      expect(occurrenceAt(hay, 'SELECT', at)).toBe(n);
    }
  });
  it('重疊的字串也算得對', () => {
    expect(nthIndexOf('aaaa', 'aa', 2)).toBe(2);
    expect(occurrenceAt('aaaa', 'aa', 2)).toBe(2);
  });
  it('locate 找不到原本那一次時退回第一次出現', () => {
    expect(locate(hay, 'FROM t', 5)).toBe(9);
    expect(locate(hay, '不存在', 0)).toBe(-1);
  });
});

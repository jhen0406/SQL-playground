import { PGlite } from '@electric-sql/pglite';

// 日期 / 時間型別保持為字串（'2024-01-05'），避免時區轉換造成的誤差與顯示混亂。
const raw = (v: string) => v;
const RAW_TYPES = [1082 /* date */, 1114 /* timestamp */, 1184 /* timestamptz */, 1083 /* time */, 1186 /* interval */];

export function createPGlite(): PGlite {
  const parsers: Record<number, (v: string) => unknown> = {};
  for (const t of RAW_TYPES) parsers[t] = raw;
  return new PGlite({ parsers });
}

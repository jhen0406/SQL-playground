import type { Dataset, Exercise } from '../content/types';
import type { QueryResult, RunOutput, RunRequest } from '../db/sandbox';
import { compareResults, type CompareResult } from './compare';

export type Runner = (req: RunRequest) => Promise<RunOutput>;

export interface CaseResult {
  name: string;
  hidden: boolean;
  pass: boolean;
  error?: string;
  compare?: CompareResult;
  user?: QueryResult | null;
  expected?: QueryResult;
  durationMs?: number;
}

export interface GradeResult {
  pass: boolean;
  cases: CaseResult[];
  /** 給 AI 的簡短摘要 */
  summary: string;
}

export function buildSetup(ds: Dataset, ex: Pick<Exercise, 'extraSetupSql'>, hidden: boolean): string {
  return [ds.schemaSql, ds.seedSql, hidden ? ds.hiddenExtraSql ?? '' : '', ex.extraSetupSql ?? ''].join('\n');
}

export function hasHiddenCase(ds: Dataset, ex: Exercise): boolean {
  return (ex.useHidden ?? true) && !!ds.hiddenExtraSql;
}

export async function gradeExercise(run: Runner, ds: Dataset, ex: Exercise, userSql: string): Promise<GradeResult> {
  const variants: { name: string; hidden: boolean }[] = [{ name: '範例測資', hidden: false }];
  if (hasHiddenCase(ds, ex)) variants.push({ name: '隱藏測資', hidden: true });

  const cases: CaseResult[] = [];
  for (const v of variants) {
    const setupSql = buildSetup(ds, ex, v.hidden);
    const exp = await run({ setupSql, sql: ex.solution, checkQuery: ex.checkQuery, maxRows: 5000 });
    if (!exp.ok) {
      cases.push({ name: v.name, hidden: v.hidden, pass: false, error: '（平台錯誤）標準解執行失敗：' + exp.error });
      continue;
    }
    const usr = await run({ setupSql, sql: userSql, checkQuery: ex.checkQuery, maxRows: 5000 });
    if (!usr.ok) {
      cases.push({ name: v.name, hidden: v.hidden, pass: false, error: usr.error, expected: pick(exp, ex) ?? undefined });
      break; // 語法錯誤時不用再跑其他測資
    }
    const expected = pick(exp, ex)!;
    const user = pick(usr, ex);
    const cmp = compareResults(user, expected, { orderMatters: ex.orderMatters, strictColumns: ex.strictColumns });
    cases.push({ name: v.name, hidden: v.hidden, pass: cmp.pass, compare: cmp, user, expected, durationMs: usr.durationMs });
    if (!cmp.pass) break;
  }
  const pass = cases.length === variants.length && cases.every((c) => c.pass);
  return { pass, cases, summary: summarize(cases, pass) };
}

function pick(out: Extract<RunOutput, { ok: true }>, ex: Exercise): QueryResult | null {
  return ex.checkQuery ? out.check ?? null : out.result;
}

function summarize(cases: CaseResult[], pass: boolean): string {
  if (pass) return '所有測資通過。';
  const bad = cases.find((c) => !c.pass);
  if (!bad) return '未通過。';
  if (bad.error) return `${bad.name}：執行錯誤 — ${bad.error}`;
  return `${bad.name}：${bad.compare?.reason ?? '結果不符'}`;
}

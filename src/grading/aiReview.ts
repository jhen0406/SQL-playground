import type { Exercise } from '../content/types';
import type { GradeResult } from './grade';
import { formatCell } from '../components/ResultTable';
import type { QueryResult } from '../db/sandbox';

let healthPromise: Promise<boolean> | null = null;

/** 後端是否已設定 API key */
export function aiAvailable(): Promise<boolean> {
  if (!healthPromise) {
    healthPromise = fetch('/api/health')
      .then((r) => (r.ok ? r.json() : { ai: false }))
      .then((j: { ai?: boolean }) => !!j.ai)
      .catch(() => false);
  }
  return healthPromise;
}

function preview(r: QueryResult | null | undefined, max = 12): string {
  if (!r) return '(無)';
  if (r.columns.length === 0) return '(沒有回傳結果)';
  const lines = [r.columns.join(' | ')];
  for (const row of r.rows.slice(0, max)) lines.push(row.map(formatCell).join(' | '));
  if (r.rows.length > max) lines.push(`…共 ${r.rows.length} 列`);
  return lines.join('\n');
}

export async function requestAiReview(args: {
  exercise: Exercise;
  schemaText: string;
  userSql: string;
  grade: GradeResult;
}): Promise<string> {
  const { exercise, schemaText, userSql, grade } = args;
  const failed = grade.cases.find((c) => !c.pass);
  const shown = failed ?? grade.cases[0];
  const body = {
    title: exercise.title,
    prompt: exercise.prompt,
    schema: schemaText,
    userSql,
    passed: grade.pass,
    gradeSummary: grade.summary,
    userError: failed?.error ?? null,
    userOutput: shown && !shown.error ? preview(shown.user) : null,
    expectedOutput: shown ? preview(shown.expected) : null,
    referenceSql: exercise.solution,
    referenceNotes: exercise.explanation ?? null,
  };
  const res = await fetch('/api/review', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const j = (await res.json().catch(() => ({}))) as { feedback?: string; error?: string };
  if (!res.ok || !j.feedback) throw new Error(j.error ?? `AI 批改失敗（HTTP ${res.status}）`);
  return j.feedback;
}

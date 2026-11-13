import { db, getSettings, useLive, type Activity, type Note } from './db';
import { today } from '../lib/date';
import { createReviewItem, completeReview } from '../srs/schedule';

export async function logActivity(a: Omit<Activity, 'id' | 'day' | 'ts'>) {
  await db.activities.add({ ...a, day: today(), ts: Date.now() });
}

export async function recordSubmission(exerciseId: string, sql: string, pass: boolean, summary: string): Promise<number> {
  return db.submissions.add({ exerciseId, sql, pass, summary, ts: Date.now(), day: today() });
}

export async function attachAiFeedback(submissionId: number, aiFeedback: string) {
  await db.submissions.update(submissionId, { aiFeedback });
}

/** 入門章節練習題通過 → 標記章節完成並建立複習排程（只在第一次完成時建立）。 */
export async function completeChapter(chapterId: string, title: string) {
  const existing = await db.chapters.get(chapterId);
  if (existing) return false;
  const day = today();
  const { offsets } = await getSettings();
  await db.transaction('rw', db.chapters, db.reviews, db.activities, async () => {
    await db.chapters.put({ chapterId, completedDay: day, completedTs: Date.now() });
    await db.reviews.put(createReviewItem(chapterId, day, offsets));
    await db.activities.add({ day, ts: Date.now(), type: 'learn', refId: chapterId, title: `學完：${title}` });
  });
  return true;
}

export async function finishReview(chapterId: string, title: string, correct: boolean, sql: string) {
  const item = await db.reviews.get(chapterId);
  if (!item) return;
  const { offsets } = await getSettings();
  const next = completeReview(item, today(), correct, offsets);
  await db.reviews.put(next);
  await logActivity({ type: 'review', refId: chapterId, title: `複習：${title}`, correct, sql });
  return next;
}

export async function recordMastery(problemId: string, title: string, pass: boolean, sql: string) {
  await recordChallenge('mastery', problemId, title, pass, sql);
}

/** 題型特訓的作答狀態也存在 mastery 表（id 以 d- 開頭，不會和精熟題混在一起統計）。 */
export async function recordDrill(problemId: string, title: string, pass: boolean, sql: string) {
  await recordChallenge('drill', problemId, title, pass, sql);
}

async function recordChallenge(type: 'mastery' | 'drill', problemId: string, title: string, pass: boolean, sql: string) {
  const cur = (await db.mastery.get(problemId)) ?? { problemId, solved: false, attempts: 0 };
  const next = {
    ...cur,
    attempts: cur.attempts + 1,
    solved: cur.solved || pass,
    firstSolvedDay: cur.firstSolvedDay ?? (pass ? today() : undefined),
  };
  await db.mastery.put(next);
  await logActivity({ type, refId: problemId, title, correct: pass, sql });
}

export async function saveDraft(key: string, sql: string) {
  await db.drafts.put({ key, sql });
}

export async function loadDraft(key: string): Promise<string | undefined> {
  return (await db.drafts.get(key))?.sql;
}

// ---- 重點筆記 ----

export async function addNote(n: Omit<Note, 'id' | 'ts' | 'day'>): Promise<number> {
  return db.notes.add({ ...n, ts: Date.now(), day: today() });
}

export async function updateNoteComment(id: number, comment: string) {
  await db.notes.update(id, { comment: comment.trim() || undefined });
}

export async function deleteNote(id: number) {
  await db.notes.delete(id);
}

export function useNotes(chapterId?: string): Note[] {
  return (
    useLive(
      () => (chapterId ? db.notes.where('chapterId').equals(chapterId).sortBy('ts') : db.notes.orderBy('ts').toArray()),
      [chapterId],
      [] as Note[],
    ) ?? []
  );
}

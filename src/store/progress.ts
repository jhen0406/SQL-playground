import { db, getSettings, useLive, type Activity, type Note } from './db';
import { today } from '../lib/date';
import { createReviewItem, completeReview, RATING_LABEL, type ReviewItem, type ReviewRating } from '../srs/schedule';

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

/**
 * 記錄一次到期複習的結果。
 * - 答錯：rating 傳 false
 * - 答對：rating 傳使用者選的熟悉度（不熟悉仍算答對，只是排程照答錯處理）
 * 回傳更新後的排程、這次複習前的快照（改選熟悉度時用），以及活動紀錄 id。
 */
export async function finishReview(chapterId: string, title: string, rating: ReviewRating | false, sql: string) {
  const prev = await db.reviews.get(chapterId);
  if (!prev) return;
  const { offsets } = await getSettings();
  const next = completeReview(prev, today(), rating, offsets);
  await db.reviews.put(next);
  const activityId = await db.activities.add({
    day: today(),
    ts: Date.now(),
    type: 'review',
    refId: chapterId,
    title: `複習：${title}`,
    correct: rating !== false,
    sql,
    detail: rating === false ? undefined : `熟悉度：${RATING_LABEL[rating]}`,
  });
  return { next, prev, activityId };
}

/** 同一次複習改選熟悉度：從複習前的快照重新計算，並更新那筆活動紀錄 */
export async function rerateReview(prev: ReviewItem, rating: ReviewRating, activityId: number, day: string) {
  const { offsets } = await getSettings();
  const next = completeReview(prev, day, rating, offsets);
  await db.reviews.put(next);
  await db.activities.update(activityId, { detail: `熟悉度：${RATING_LABEL[rating]}` });
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

/** 收藏／取消收藏題目 */
export async function toggleFavorite(exerciseId: string) {
  if (await db.favorites.get(exerciseId)) await db.favorites.delete(exerciseId);
  else await db.favorites.put({ exerciseId, ts: Date.now() });
}


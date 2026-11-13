import { Link } from 'react-router-dom';
import { chapterPractices, chapters, PART_LABELS } from '../content';
import type { ChapterPart } from '../content/types';
import { reviewStatus } from '../srs/schedule';
import { isChapterUnlocked, useChapterProgress, usePassedExercises, useReviews, useToday } from '../store/hooks';
import { useSettings } from '../store/db';
import { CheckCircle2, Lock } from 'lucide-react';

export function LearnIndex() {
  const done = useChapterProgress();
  const reviews = new Map(useReviews().map((r) => [r.chapterId, r]));
  const day = useToday();
  const settings = useSettings();
  const passed = usePassedExercises();
  const parts: ChapterPart[] = ['basic', 'database', 'leetcode'];

  return (
    <div className="page">
      <h1>入門課程</h1>
      <p className="muted">
        依照 w3schools SQL 教學路線編排，再加上 LeetCode 必備的子查詢、CTE 與視窗函數。每章：<strong>概念說明 → 範例實作 → 練習題</strong>。內容較多的章節每個重點各有一題練習，全部答對即完成該章，並自動排入複習計畫。
      </p>
      <div className="progress-line">
        <div className="bar big">
          <div style={{ width: `${(done.size / chapters.length) * 100}%` }} />
        </div>
        <span className="small">
          {done.size} / {chapters.length} 章
        </span>
      </div>
      {parts.map((part) => (
        <section key={part} className="part">
          <h2>{PART_LABELS[part]}</h2>
          <div className="chapter-grid">
            {chapters
              .map((c, idx) => ({ c, idx }))
              .filter(({ c }) => c.part === part)
              .map(({ c, idx }) => {
                const unlocked = isChapterUnlocked(idx, done) || settings.masteryUnlocked;
                const isDone = done.has(c.id);
                const r = reviews.get(c.id);
                const st = r ? reviewStatus(r, day) : null;
                const ps = chapterPractices(c);
                const pDone = ps.filter((p) => passed.has(p.id)).length;
                const body = (
                  <>
                    <div className="ch-num">{String(c.order).padStart(2, '0')}</div>
                    <div className="grow">
                      <div className="ch-title">{c.title}</div>
                      <div className="muted small">{c.w3Topics}</div>
                      {ps.length > 1 && unlocked && <div className="muted small">練習 {pDone} / {ps.length}</div>}
                    </div>
                    <div className="ch-status">
                      {isDone && st === 'done' && <span className="tag tag-ok">已精熟</span>}
                      {isDone && (st === 'today' || st === 'overdue') && <span className="tag tag-warn">待複習</span>}
                      {isDone && st === 'upcoming' && <span className="tag tag-ok"><CheckCircle2 className="ic-sm" aria-hidden />完成</span>}
                      {!isDone && unlocked && <span className="tag">未完成</span>}
                      {!unlocked && <Lock className="ic-sm" aria-label="未解鎖" />}
                    </div>
                  </>
                );
                return unlocked ? (
                  <Link key={c.id} to={`/learn/${c.id}`} className={'chapter card ' + (isDone ? 'done' : '')}>
                    {body}
                  </Link>
                ) : (
                  <div key={c.id} className="chapter card locked" title="完成前一章後解鎖">
                    {body}
                  </div>
                );
              })}
          </div>
        </section>
      ))}
    </div>
  );
}

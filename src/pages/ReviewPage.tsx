import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getChapter, reviewExercise, reviewPool } from '../content';
import { Playground } from '../components/Playground';
import { Markdown } from '../lib/markdown';
import { prettyDay, today } from '../lib/date';
import { finishReview, rerateReview, useNotes } from '../store/progress';
import { NoteList } from './NotesPage';
import { dueReviews, useReviews, useToday } from '../store/hooks';
import { completeReview, DEFAULT_OFFSETS, dueDayNumber, RATING_LABEL, reviewStatus, type ReviewItem, type ReviewRating } from '../srs/schedule';
import { useSettings } from '../store/db';
import { ArrowRight, Highlighter } from 'lucide-react';

export function ReviewPage() {
  const { id = '' } = useParams();
  const ch = getChapter(id);
  const day = useToday();
  const reviews = useReviews();
  const nav = useNavigate();
  const item = reviews.find((r) => r.chapterId === id);
  const counted = useRef(false);
  const notes = useNotes(id);
  const [result, setResult] = useState<ReviewItem | null>(null);
  const [firstCorrect, setFirstCorrect] = useState<boolean | null>(null);
  // 答對後等使用者選熟悉度：snapshot 是這次複習前的排程，選了之後才寫入；改選時從快照重算
  const [pending, setPending] = useState<{ snapshot: ReviewItem; sql: string; day: string } | null>(null);
  const [rating, setRating] = useState<ReviewRating | null>(null);
  const activityId = useRef<number | null>(null);
  const settings = useSettings();
  // 輪流出題：依「已複習次數」決定題目，進入頁面時就固定，避免提交後中途換題
  const [pick, setPick] = useState<number | null>(null);

  useEffect(() => {
    counted.current = false;
    setResult(null);
    setFirstCorrect(null);
    setPick(null);
    setPending(null);
    setRating(null);
    activityId.current = null;
  }, [id]);
  useEffect(() => {
    if (item && pick === null) setPick(item.history.length);
  }, [item, pick]);

  if (!ch) return <div className="page">找不到章節。</div>;
  if (!item) return <div className="page">這一章還沒有學完，還沒有複習排程。<Link to={`/learn/${id}`}>前往學習</Link></div>;

  const exercise = reviewExercise(ch, pick ?? item.history.length);
  const poolSize = reviewPool(ch).length;
  const status = reviewStatus(item, day);
  const isDue = status === 'today' || status === 'overdue';
  const otherDue = dueReviews(reviews, day).filter((r) => r.chapterId !== id);

  const onGraded = async (g: { pass: boolean }, sql: string) => {
    // 只有本次複習的「第一次提交」會影響排程（答錯 → 重新從第 3 天開始）
    if (counted.current || !isDue) return;
    counted.current = true;
    setFirstCorrect(g.pass);
    if (g.pass) {
      // 答對：先請使用者選熟悉度，選了才更新排程
      setPending({ snapshot: item, sql, day: today() });
      return;
    }
    const r = await finishReview(ch.id, ch.title, false, sql);
    if (r) setResult(r.next);
  };

  const chooseRating = async (r: ReviewRating) => {
    if (!pending || r === rating) return;
    setRating(r);
    if (activityId.current === null) {
      const out = await finishReview(ch.id, ch.title, r, pending.sql);
      if (out) {
        activityId.current = out.activityId;
        setResult(out.next);
      }
    } else {
      setResult(await rerateReview(pending.snapshot, r, activityId.current, pending.day));
    }
  };
  const offsets = settings.offsets ?? DEFAULT_OFFSETS;
  const preview = (r: ReviewRating) => (pending ? completeReview(pending.snapshot, pending.day, r, offsets) : null);
  const RATING_HINT: Record<ReviewRating, string> = {
    good: '可以自己寫出來，下次照進度',
    ok: '寫得出來但不太確定，同一級再複習一次',
    again: '是猜對或看提示的，從頭開始複習',
  };

  return (
    <div className="page">
      <div className="crumbs small">
        <Link to="/plan">學習計畫</Link> / 複習
      </div>
      <h1>
        複習 · 第 {ch.order} 章 {ch.title}
      </h1>
      <p className="muted small">
        {isDue
          ? `這是第 ${dueDayNumber(item)} 天的複習${status === 'overdue' ? `（原定 ${prettyDay(item.due)}，已逾期）` : ''}。第一次提交的結果會決定下次複習時間。`
          : item.done
            ? '這一章已完成所有複習階段，你仍可以自由練習。'
            : `下次複習排在 ${prettyDay(item.due)}。現在練習不會影響排程。`}
      </p>

      {pending && (
        <div className="card rating-card" role="group" aria-label="熟悉度">
          <div className="rating-head">
            <strong>答對了！這題你有多熟？</strong>
            <span className="muted small">{rating ? '選錯了可以直接改選。' : '請選一個，才會記錄這次複習。'}</span>
          </div>
          <div className="rating-opts">
            {(['good', 'ok', 'again'] as ReviewRating[]).map((r) => {
              const p = preview(r);
              return (
                <button key={r} className={'rating-opt ' + r + (rating === r ? ' on' : '')} aria-pressed={rating === r} onClick={() => chooseRating(r)}>
                  <span className="rating-name">{RATING_LABEL[r]}</span>
                  <span className="small muted">{RATING_HINT[r]}</span>
                  <span className="small rating-next">{p && (p.done ? '完成全部複習' : `下次：${prettyDay(p.due)}`)}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {result && (
        <div className={'alert big-alert ' + (firstCorrect && rating !== 'again' ? 'alert-ok' : 'alert-warn')}>
          {firstCorrect
            ? result.done
              ? '這一章已完成全部複習階段，記憶已經很牢固。'
              : rating === 'again'
                ? `已記為不熟悉，排程重新開始：${prettyDay(result.due)} 再複習。`
                : rating === 'ok'
                  ? `已記為尚可，同一級再複習一次：${prettyDay(result.due)}。`
                  : `已記為熟悉。下次複習：${prettyDay(result.due)}（第 ${dueDayNumber(result)} 天）。`
            : `這次沒有一次答對，排程已重新開始：${prettyDay(result.due)} 再複習一次。可以繼續修改直到通過。`}
          {otherDue.length > 0 && (
            <button className="btn btn-primary btn-sm" onClick={() => nav(`/review/${otherDue[0].chapterId}`)}>
              下一個待複習：{getChapter(otherDue[0].chapterId)?.title} <ArrowRight className="ic-sm" aria-hidden />
            </button>
          )}
        </div>
      )}

      <details className="card summary-card" open>
        <summary>
          <strong>重點回顧</strong>
        </summary>
        <Markdown text={ch.summary} />
        <Link to={`/learn/${ch.id}`} className="small">
          重看完整章節 <ArrowRight className="ic-sm" aria-hidden />
        </Link>
      </details>

      {notes.length > 0 && (
        <details className="card summary-card" open>
          <summary>
            <Highlighter className="ic-sm" aria-hidden />
            <strong>我的重點筆記</strong>
            <span className="muted small">{notes.length} 則</span>
          </summary>
          <NoteList notes={notes} showJump />
        </details>
      )}

      <Playground
        key={exercise.id}
        exercise={exercise}
        mode="review"
        header={
          <div className="pg-head">
            <span className="tag tag-warn">複習題</span>
            {poolSize > 1 && <span className="muted small">本章 {poolSize} 題輪流出</span>}
            <h3>{exercise.title}</h3>
          </div>
        }
        onGraded={onGraded}
      />
    </div>
  );
}

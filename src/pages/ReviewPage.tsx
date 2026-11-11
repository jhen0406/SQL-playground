import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getChapter } from '../content';
import { Playground } from '../components/Playground';
import { Markdown } from '../lib/markdown';
import { prettyDay } from '../lib/date';
import { finishReview, useNotes } from '../store/progress';
import { NoteList } from './NotesPage';
import { dueReviews, useReviews, useToday } from '../store/hooks';
import { dueDayNumber, reviewStatus, type ReviewItem } from '../srs/schedule';
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

  useEffect(() => {
    counted.current = false;
    setResult(null);
    setFirstCorrect(null);
  }, [id]);

  if (!ch) return <div className="page">找不到章節。</div>;
  if (!item) return <div className="page">這一章還沒有學完，還沒有複習排程。<Link to={`/learn/${id}`}>前往學習</Link></div>;

  const status = reviewStatus(item, day);
  const isDue = status === 'today' || status === 'overdue';
  const otherDue = dueReviews(reviews, day).filter((r) => r.chapterId !== id);

  const onGraded = async (g: { pass: boolean }, sql: string) => {
    // 只有本次複習的「第一次提交」會影響排程（答錯 → 重新從第 3 天開始）
    if (counted.current || !isDue) return;
    counted.current = true;
    setFirstCorrect(g.pass);
    const next = await finishReview(ch.id, ch.title, g.pass, sql);
    if (next) setResult(next);
  };

  return (
    <div className="page">
      <div className="crumbs small">
        <Link to="/plan">複習計畫</Link> / 複習
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

      {result && (
        <div className={'alert big-alert ' + (firstCorrect ? 'alert-ok' : 'alert-warn')}>
          {firstCorrect
            ? result.done
              ? '答對了！這一章已完成全部複習階段，記憶已經很牢固。'
              : `答對了！下次複習：${prettyDay(result.due)}（第 ${dueDayNumber(result)} 天）。`
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
        exercise={ch.review}
        mode="review"
        header={
          <div className="pg-head">
            <span className="tag tag-warn">複習題</span>
            <h3>{ch.review.title}</h3>
          </div>
        }
        onGraded={onGraded}
      />
    </div>
  );
}

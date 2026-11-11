import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { chapters, datasets, getChapter } from '../content';
import { MiniRunner } from '../components/MiniRunner';
import { Playground } from '../components/Playground';
import { SchemaPanel } from '../components/SchemaPanel';
import { Highlighter } from '../components/Highlighter';
import { NoteList } from './NotesPage';
import { Markdown } from '../lib/markdown';
import { prettyDay } from '../lib/date';
import { completeChapter, logActivity, useNotes } from '../store/progress';
import { db } from '../store/db';
import { useChapterProgress } from '../store/hooks';
import { ArrowLeft, ArrowRight, CheckCircle2, Database, Highlighter as HighlighterIcon, PartyPopper } from 'lucide-react';

type Step = 0 | 1 | 2;
const STEPS = ['概念說明', '範例實作', '練習題'];

export function ChapterPage() {
  const { id = '' } = useParams();
  const ch = getChapter(id);
  const nav = useNavigate();
  const done = useChapterProgress();
  const [params, setParams] = useSearchParams();
  const initialStep = Number(params.get('step'));
  const [step, setStep] = useState<Step>(initialStep === 1 || initialStep === 2 ? initialStep : 0);
  const notes = useNotes(id);
  const [justDone, setJustDone] = useState<string | null>(null);

  useEffect(() => {
    setStep(0);
    setJustDone(null);
    window.scrollTo(0, 0);
  }, [id]);
  // 從筆記「回到章節」帶 ?step=N 進來時切到該步驟，然後把參數清掉
  const stepParam = params.get('step');
  useEffect(() => {
    if (stepParam === null) return;
    const s = Number(stepParam);
    setStep(s === 1 || s === 2 ? s : 0);
    setParams({}, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepParam, id]);

  if (!ch) return <div className="page">找不到章節。<Link to="/learn">回課程列表</Link></div>;
  const idx = chapters.indexOf(ch);
  const next = chapters[idx + 1];
  const prev = chapters[idx - 1];
  const isDone = done.has(ch.id);

  const onGraded = async (g: { pass: boolean; summary: string }, sql: string) => {
    await logActivity({ type: 'practice', refId: ch.practice.id, title: `練習：${ch.title}`, correct: g.pass, sql, detail: g.summary });
    if (g.pass) {
      const created = await completeChapter(ch.id, ch.title);
      if (created) {
        const r = await db.reviews.get(ch.id);
        if (r) setJustDone(prettyDay(r.due));
      }
    }
  };

  return (
    <div className="page chapter-page">
      <div className="crumbs small">
        <Link to="/learn">入門課程</Link> / 第 {ch.order} 章
      </div>
      <h1>
        第 {ch.order} 章 · {ch.title} {isDone && <span className="tag tag-ok"><CheckCircle2 className="ic-sm" aria-hidden />已完成</span>}
      </h1>
      <p className="muted small">對應 w3schools：{ch.w3Topics}</p>

      <div className="stepper" role="tablist">
        {STEPS.map((s, i) => (
          <button key={s} role="tab" aria-selected={step === i} className={step === i ? 'on' : ''} onClick={() => setStep(i as Step)}>
            <span className="step-n">{i + 1}</span>
            {s}
          </button>
        ))}
      </div>

      {step < 2 && (
        <div className="lesson-layout">
          <TablesAside />
      {step === 0 && (
        <div className="card lesson">
          <p className="hl-hint small muted inline-ic"><HighlighterIcon className="ic-sm" aria-hidden />反白任何文字，就能標記成重點筆記。</p>
          <Highlighter chapterId={ch.id} step={0}>
            <Markdown text={ch.concept} />
          </Highlighter>
          <div className="step-nav">
            <span />
            <button className="btn btn-primary" onClick={() => setStep(1)}>
              下一步：範例實作 <ArrowRight className="ic-sm" aria-hidden />
            </button>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="card lesson">
          <p className="muted">以下範例都可以直接修改、執行（Ctrl+Enter）。每次執行都會重置資料庫，放心亂試。</p>
          <Highlighter chapterId={ch.id} step={1}>
            {ch.examples.map((e, i) => (
              <MiniRunner key={ch.id + i} ds={datasets.shop} initialSql={e.sql} title={e.title} explain={e.explain} />
            ))}
          </Highlighter>
          <div className="step-nav">
            <button className="btn btn-ghost" onClick={() => setStep(0)}>
              <ArrowLeft className="ic-sm" aria-hidden /> 概念說明
            </button>
            <button className="btn btn-primary" onClick={() => setStep(2)}>
              下一步：練習題 <ArrowRight className="ic-sm" aria-hidden />
            </button>
          </div>
        </div>
      )}
        </div>
      )}

      {step === 2 && (
        <>
          {justDone && (
            <div className="alert alert-ok big-alert">
              <span className="inline-ic"><PartyPopper className="ic" aria-hidden /><span>恭喜完成本章！已排入複習計畫，第一次複習在 <strong>{justDone}</strong>（第 3 天）。</span></span>
              {next ? (
                <button className="btn btn-primary btn-sm" onClick={() => nav(`/learn/${next.id}`)}>
                  前往下一章：{next.title} <ArrowRight className="ic-sm" aria-hidden />
                </button>
              ) : (
                <Link className="btn btn-primary btn-sm" to="/mastery">
                  全部完成！前往精熟挑戰 <ArrowRight className="ic-sm" aria-hidden />
                </Link>
              )}
            </div>
          )}
          <Playground
            exercise={ch.practice}
            mode="practice"
            header={
              <div className="pg-head">
                <span className="tag">練習題</span>
                <h3>{ch.practice.title}</h3>
              </div>
            }
            onGraded={onGraded}
          />
        </>
      )}

      {notes.length > 0 && step < 2 && (
        <section className="card chapter-notes">
          <div className="card-title">
            <HighlighterIcon className="ic" aria-hidden />
            <h2>本章筆記</h2>
            <span className="muted small">{notes.length} 則</span>
            <span className="spacer" />
            <Link to="/notes" className="small">全部筆記</Link>
          </div>
          <NoteList notes={notes} />
        </section>
      )}

      <div className="chapter-foot">
        {prev ? <Link to={`/learn/${prev.id}`}><ArrowLeft className="ic-sm" aria-hidden /> 第 {prev.order} 章 {prev.title}</Link> : <span />}
        {next && (isDone ? <Link to={`/learn/${next.id}`}>第 {next.order} 章 {next.title} <ArrowRight className="ic-sm" aria-hidden /></Link> : <span className="muted small">完成練習題後解鎖下一章</span>)}
      </div>
    </div>
  );
}

/** 課程前兩步旁邊的資料表面板：桌機預設展開（右側），手機預設收合（內容上方） */
function TablesAside() {
  const [open, setOpen] = useState(() => window.matchMedia('(min-width: 1100px)').matches);
  return (
    <aside className="lesson-aside">
      <details className="card tables-drawer" open={open} onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}>
        <summary>
          <Database className="ic-sm" aria-hidden />
          <strong>資料表</strong>
          <span className="muted small">小商店資料庫</span>
        </summary>
        <SchemaPanel ds={datasets.shop} compact />
      </details>
    </aside>
  );
}

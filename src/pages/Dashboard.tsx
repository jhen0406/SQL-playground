import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, CalendarClock, CheckCircle2, Layers, Lock, RotateCcw, Sparkles, Target, Trophy } from 'lucide-react';
import { chapters, getChapter, getProblem, mastery, PART_LABELS } from '../content';
import { addDay, diffDays, prettyDay } from '../lib/date';
import { accuracy, dailySeries, streaks, type DayPoint } from '../lib/stats';
import { db, useLive, useSettings } from '../store/db';
import { allChaptersDone, dueReviews, ensureDailySet, useChapterProgress, useMasteryStates, useReviews, useToday } from '../store/hooks';
import { dueDayNumber } from '../srs/schedule';

const CHART_DAYS = 28;
const SPARK_DAYS = 14;

export function Dashboard() {
  const day = useToday();
  const done = useChapterProgress();
  const reviews = useReviews();
  const states = useMasteryStates();
  const settings = useSettings();
  const due = dueReviews(reviews, day);
  const next = chapters.find((c) => !done.has(c.id));
  const masteryOpen = allChaptersDone(done) || settings.masteryUnlocked;
  const [daily, setDaily] = useState<string[]>([]);
  useEffect(() => {
    if (masteryOpen) ensureDailySet(day).then(setDaily);
  }, [masteryOpen, day]);

  // 連續天數要看全部歷史；圖表只看近 28 天
  const acts = useLive(() => db.activities.toArray(), [], []) ?? [];
  const from = addDay(day, -(CHART_DAYS - 1));
  const series = dailySeries(acts, from, day);
  const spark = series.slice(-SPARK_DAYS);
  const streak = streaks(
    acts.map((a) => a.day),
    day,
  );
  const acc7 = accuracy(acts, addDay(day, -6), day);
  const accPrev = accuracy(acts, addDay(day, -13), addDay(day, -7));
  const learnedThisWeek = acts.filter((a) => a.type === 'learn' && a.day >= addDay(day, -6)).length;
  const solved = [...states.values()].filter((s) => s.solved).length;
  const overdue = due.filter((r) => r.due < day).length;
  const upcoming = reviews
    .filter((r) => !r.done && diffDays(r.due, day) > 0)
    .sort((a, b) => a.due.localeCompare(b.due))
    .slice(0, 4);
  const pct = done.size / chapters.length;

  const hour = new Date().getHours();
  const greet = hour < 11 ? '早安' : hour < 18 ? '午安' : '晚安';

  return (
    <div className="page dash">
      {/* 歡迎橫幅 */}
      <section className="card welcome" aria-labelledby="welcome-h">
        <div className="welcome-text">
          <span className="chip chip-accent">
            <Sparkles className="ic-sm" aria-hidden />
            {prettyDay(day)}
          </span>
          <h1 id="welcome-h">{greet}，今天也來練 SQL</h1>
          <p>
            {due.length > 0
              ? `有 ${due.length} 個章節到了複習時間，先複習再學新的，記得更牢。`
              : next
                ? done.size === 0
                  ? '從第一條 SELECT 開始，學完 34 章就能無縫接軌 LeetCode SQL 題。'
                  : `下一章：第 ${next.order} 章 · ${next.title}`
                : masteryOpen
                  ? '入門課程全部完成！每天的精熟挑戰題在等你。'
                  : '入門課程全部完成！'}
          </p>
          <div className="row">
            {due.length > 0 ? (
              <Link className="btn btn-primary" to={`/review/${due[0].chapterId}`}>
                <RotateCcw className="ic-sm" aria-hidden />
                先複習 {due.length} 章
              </Link>
            ) : next ? (
              <Link className="btn btn-primary" to={`/learn/${next.id}`}>
                {done.size === 0 ? '開始學習' : '繼續學習'}
                <ArrowRight className="ic-sm" aria-hidden />
              </Link>
            ) : (
              <Link className="btn btn-primary" to="/mastery">
                精熟挑戰
                <ArrowRight className="ic-sm" aria-hidden />
              </Link>
            )}
            {due.length > 0 && next && (
              <Link className="btn btn-glass" to={`/learn/${next.id}`}>
                第 {next.order} 章
              </Link>
            )}
          </div>
        </div>
        <ProgressRing pct={pct} label={`${done.size}/${chapters.length}`} sub="章節" />
      </section>

      {/* 四張統計卡 */}
      <div className="kpis">
        <Kpi
          label="完成章節"
          value={`${done.size}`}
          unit={`/ ${chapters.length}`}
          chip={<span className={'chip ' + (learnedThisWeek ? '' : 'chip-muted')}>本週 +{learnedThisWeek}</span>}
          spark={spark.map((p) => p.total)}
          sparkLabel="近 14 天每日活動數"
        />
        <Kpi
          label="連續學習"
          value={`${streak.current}`}
          unit="天"
          chip={<span className="chip chip-accent">最長 {streak.longest} 天</span>}
          spark={spark.map((p) => (p.total > 0 ? 1 : 0))}
          sparkLabel="近 14 天是否有學習"
          sparkKind="bars"
        />
        <Kpi
          label="近 7 天正確率"
          value={acc7 === null ? '—' : `${Math.round(acc7 * 100)}`}
          unit={acc7 === null ? '' : '%'}
          chip={<DeltaChip now={acc7} prev={accPrev} />}
          spark={spark.map((p) => p.attempts)}
          sparkLabel="近 14 天每日作答數"
        />
        <Kpi
          label="待複習"
          value={`${due.length}`}
          unit="章"
          chip={
            overdue > 0 ? (
              <span className="chip chip-warn">逾期 {overdue}</span>
            ) : upcoming[0] ? (
              <span className="chip chip-muted">下次 {upcoming[0].due.slice(5).replace('-', '/')}</span>
            ) : (
              <span className="chip chip-muted">尚無排程</span>
            )
          }
          tone={due.length ? 'warn' : undefined}
        />
      </div>

      {/* 每日學習量 + 各部分進度 */}
      <section className="card chart-card" aria-labelledby="act-h">
        <div className="card-title">
          <h2 id="act-h">每日學習量</h2>
          <span className="muted small">近 {CHART_DAYS} 天</span>
          <span className="spacer" />
          <span className="legend-inline small" aria-hidden>
            <span><i className="sw sw-1" />作答</span>
            <span><i className="sw sw-2" />答對</span>
          </span>
        </div>
        <ActivityChart data={series} />
        <details className="table-view small">
          <summary>以表格檢視</summary>
          <div className="result-scroll">
            <table className="result-table">
              <thead>
                <tr><th>日期</th><th>作答</th><th>答對</th><th>全部活動</th></tr>
              </thead>
              <tbody>
                {series.filter((p) => p.total > 0).reverse().map((p) => (
                  <tr key={p.day}><td>{p.day}</td><td className="num">{p.attempts}</td><td className="num">{p.correct}</td><td className="num">{p.total}</td></tr>
                ))}
                {series.every((p) => p.total === 0) && (
                  <tr><td colSpan={4} className="muted">近 {CHART_DAYS} 天沒有紀錄</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </details>
      </section>

      <section className="card parts-card" aria-labelledby="parts-h">
        <div className="card-title">
          <Layers className="ic" aria-hidden />
          <h2 id="parts-h">各部分進度</h2>
        </div>
        <ul className="part-bars">
          {(Object.keys(PART_LABELS) as (keyof typeof PART_LABELS)[]).map((part) => {
            const list = chapters.filter((c) => c.part === part);
            const n = list.filter((c) => done.has(c.id)).length;
            const [head, name] = PART_LABELS[part].split('：');
            return (
              <li key={part}>
                <div className="part-bar-top">
                  <span>
                    <span className="muted small">{head}</span>
                    <br />
                    <strong>{name}</strong>
                  </span>
                  <span className="mono small">{n}/{list.length}</span>
                </div>
                <div className="bar big-bar" role="progressbar" aria-valuenow={n} aria-valuemin={0} aria-valuemax={list.length} aria-label={`${PART_LABELS[part]} 進度`}>
                  <div style={{ width: `${(n / list.length) * 100}%` }} />
                </div>
              </li>
            );
          })}
          <li>
            <div className="part-bar-top">
              <span>
                <span className="muted small">精熟階段</span>
                <br />
                <strong>商業情境題</strong>
              </span>
              <span className="mono small">{solved}/{mastery.length}</span>
            </div>
            <div className="bar big-bar accent" role="progressbar" aria-valuenow={solved} aria-valuemin={0} aria-valuemax={mastery.length} aria-label="精熟題進度">
              <div style={{ width: `${(solved / mastery.length) * 100}%` }} />
            </div>
          </li>
        </ul>
      </section>

      {/* 今日任務 */}
      <section className="card tasks-card" aria-labelledby="tasks-h">
        <div className="card-title">
          <Target className="ic" aria-hidden />
          <h2 id="tasks-h">今日任務</h2>
        </div>
        <ul className="tasks">
          {due.map((r) => (
            <li key={r.chapterId}>
              <span className="task-ic warn" aria-hidden>
                <RotateCcw className="ic" />
              </span>
              <span className="grow">
                <strong>{getChapter(r.chapterId)?.title}</strong>
                <br />
                <span className="muted small">
                  第 {dueDayNumber(r)} 天複習{r.due < day ? ` · 已逾期 ${diffDays(day, r.due)} 天` : ''}
                </span>
              </span>
              <Link className="btn btn-primary btn-sm" to={`/review/${r.chapterId}`}>
                複習
              </Link>
            </li>
          ))}
          {next && (
            <li>
              <span className="task-ic" aria-hidden>
                <BookOpen className="ic" />
              </span>
              <span className="grow">
                <strong>
                  第 {next.order} 章 · {next.title}
                </strong>
                <br />
                <span className="muted small">新章節 · {next.w3Topics}</span>
              </span>
              <Link className="btn btn-secondary btn-sm" to={`/learn/${next.id}`}>
                {done.size === 0 ? '開始' : '繼續'}
              </Link>
            </li>
          )}
          {masteryOpen &&
            daily.map((id) => {
              const p = getProblem(id)!;
              const s = states.get(id);
              return (
                <li key={id}>
                  <span className={'task-ic' + (s?.solved ? ' ok' : ' accent')} aria-hidden>
                    {s?.solved ? <CheckCircle2 className="ic" /> : <Trophy className="ic" />}
                  </span>
                  <span className="grow">
                    <strong>{p.title}</strong>
                    <br />
                    <span className="small">
                      <span className={'tag diff-' + p.difficulty}>{p.difficulty}</span> <span className="muted">每日題 · {p.topic}</span>
                    </span>
                  </span>
                  <Link className="btn btn-secondary btn-sm" to={`/mastery/${id}`}>
                    {s?.solved ? '重做' : '挑戰'}
                  </Link>
                </li>
              );
            })}
          {!next && !masteryOpen && <li className="muted">全部章節已完成！</li>}
        </ul>
        {!masteryOpen && (
          <p className="muted small inline-ic">
            <Lock className="ic-sm" aria-hidden />
            完成全部 {chapters.length} 章後解鎖「精熟挑戰」：每天推出商業情境題，由淺入深。
          </p>
        )}
      </section>

      {/* 即將到來的複習 */}
      <section className="card upcoming-card" aria-labelledby="up-h">
        <div className="card-title">
          <CalendarClock className="ic" aria-hidden />
          <h2 id="up-h">即將到來的複習</h2>
        </div>
        {upcoming.length === 0 && <p className="muted small">目前沒有排程。學完一章後，平台會在第 3、7、15、30、60 天提醒你複習。</p>}
        <ul className="plain upcoming">
          {upcoming.map((r) => (
            <li key={r.chapterId}>
              <span className="up-date">
                <strong>{r.due.slice(8)}</strong>
                <span>{r.due.slice(5, 7)} 月</span>
              </span>
              <span className="grow">{getChapter(r.chapterId)?.title}</span>
              <span className="chip chip-accent">第 {dueDayNumber(r)} 天</span>
            </li>
          ))}
        </ul>
        <Link to="/plan" className="small inline-ic">
          查看完整複習計畫
          <ArrowRight className="ic-sm" aria-hidden />
        </Link>
      </section>
    </div>
  );
}

function DeltaChip({ now, prev }: { now: number | null; prev: number | null }) {
  if (now === null) return <span className="chip chip-muted">尚無作答</span>;
  if (prev === null) return <span className="chip chip-muted">前 7 天無資料</span>;
  const d = Math.round((now - prev) * 100);
  if (d === 0) return <span className="chip chip-muted">與前 7 天持平</span>;
  return (
    <span className={'chip ' + (d > 0 ? '' : 'chip-bad')}>
      {d > 0 ? '▲' : '▼'} {Math.abs(d)}%
    </span>
  );
}

function Kpi({
  label, value, unit, chip, spark, sparkLabel, sparkKind = 'line', tone,
}: {
  label: string;
  value: string;
  unit?: string;
  chip: React.ReactNode;
  spark?: number[];
  sparkLabel?: string;
  sparkKind?: 'line' | 'bars';
  tone?: 'warn';
}) {
  return (
    <div className={'card kpi ' + (tone ?? '')}>
      <div className="kpi-top">
        <span className="kpi-label">{label}</span>
        {chip}
      </div>
      <div className="kpi-v">
        {value}
        {unit && <span className="kpi-unit">{unit}</span>}
      </div>
      {spark && <Sparkline values={spark} kind={sparkKind} label={sparkLabel ?? ''} />}
    </div>
  );
}

/** 統計卡上的迷你圖（裝飾性，數值已寫在卡片上；完整數據在「每日學習量」圖表與表格） */
function Sparkline({ values, kind, label }: { values: number[]; kind: 'line' | 'bars'; label: string }) {
  const w = 120;
  const h = 32;
  const max = Math.max(1, ...values);
  if (kind === 'bars') {
    const bw = w / values.length;
    return (
      <svg className="spark" viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none" role="img" aria-label={label}>
        {values.map((v, i) => (
          <rect key={i} x={i * bw + 1} y={v ? 4 : h - 4} width={bw - 2} height={v ? h - 4 : 4} rx="2" className={v ? 'spark-on' : 'spark-off'} />
        ))}
      </svg>
    );
  }
  const pts = values.map((v, i) => [(i / (values.length - 1)) * w, h - 3 - (v / max) * (h - 6)] as const);
  const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  return (
    <svg className="spark" viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none" role="img" aria-label={label}>
      <path d={`${d} L${w},${h} L0,${h} Z`} className="spark-area" />
      <path d={d} className="spark-line" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [w, setW] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.round(e.contentRect.width)));
    ro.observe(el);
    setW(el.clientWidth);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

/** 每日學習量：作答（面積）＋答對（折線），十字準線 + tooltip */
function ActivityChart({ data }: { data: DayPoint[] }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const H = 220;
  const pad = { l: 32, r: 12, t: 12, b: 28 };
  const W = Math.max(width, 280);
  const iw = W - pad.l - pad.r;
  const ih = H - pad.t - pad.b;
  const rawMax = Math.max(...data.map((p) => p.attempts), 0);
  const step = rawMax <= 4 ? 1 : rawMax <= 10 ? 2 : rawMax <= 25 ? 5 : 10;
  const max = Math.max(step * 4, Math.ceil(rawMax / step) * step);
  const ticks = Array.from({ length: max / step + 1 }, (_, i) => i * step).filter((_, i, a) => a.length <= 6 || i % 2 === 0);
  const x = (i: number) => pad.l + (data.length <= 1 ? 0 : (i / (data.length - 1)) * iw);
  const y = (v: number) => pad.t + ih - (v / max) * ih;
  const line = (k: 'attempts' | 'correct') => data.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p[k]).toFixed(1)}`).join(' ');
  const area = `${line('attempts')} L${x(data.length - 1)},${y(0)} L${x(0)},${y(0)} Z`;
  const total = data.reduce((s, p) => s + p.attempts, 0);

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    const i = Math.round(((px - pad.l) / iw) * (data.length - 1));
    setHover(Math.min(data.length - 1, Math.max(0, i)));
  };
  const hp = hover !== null ? data[hover] : null;

  return (
    <div className="chart" ref={ref}>
      <svg
        width={W}
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`近 ${data.length} 天共作答 ${total} 次`}
        onPointerMove={onMove}
        onPointerLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id="act-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" className="grad-1-top" />
            <stop offset="100%" className="grad-1-bot" />
          </linearGradient>
        </defs>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} className={t === 0 ? 'axis-base' : 'grid'} />
            <text x={pad.l - 8} y={y(t)} className="axis-t" textAnchor="end" dominantBaseline="middle">{t}</text>
          </g>
        ))}
        {data.map((p, i) =>
          i % 7 === (data.length - 1) % 7 ? (
            <text key={p.day} x={x(i)} y={H - 8} className="axis-t" textAnchor={i === 0 ? 'start' : i === data.length - 1 ? 'end' : 'middle'}>
              {p.day.slice(5).replace('-', '/')}
            </text>
          ) : null,
        )}
        <path d={area} fill="url(#act-fill)" />
        <path d={line('attempts')} className="series-1" />
        <path d={line('correct')} className="series-2" />
        {hp && (
          <g>
            <line x1={x(hover!)} x2={x(hover!)} y1={pad.t} y2={pad.t + ih} className="crosshair" />
            <circle cx={x(hover!)} cy={y(hp.attempts)} r="4.5" className="dot-1" />
            <circle cx={x(hover!)} cy={y(hp.correct)} r="4.5" className="dot-2" />
          </g>
        )}
      </svg>
      {hp && (
        <div className="chart-tip" style={{ left: Math.min(Math.max(x(hover!), 70), W - 70) }} role="status">
          <strong>{prettyDay(hp.day)}</strong>
          <span><i className="sw sw-1" />作答 <b>{hp.attempts}</b></span>
          <span><i className="sw sw-2" />答對 <b>{hp.correct}</b></span>
        </div>
      )}
    </div>
  );
}

function ProgressRing({ pct, label, sub }: { pct: number; label: string; sub: string }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  return (
    <div className="ring" role="img" aria-label={`入門課程進度 ${Math.round(pct * 100)}%`}>
      <svg width="124" height="124" viewBox="0 0 124 124" aria-hidden>
        <circle className="ring-bg" cx="62" cy="62" r={r} fill="none" strokeWidth="10" />
        <circle className="ring-fg" cx="62" cy="62" r={r} fill="none" strokeWidth="10" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct)} />
      </svg>
      <div className="ring-label">
        <strong>{label}</strong>
        <span>{sub}</span>
      </div>
    </div>
  );
}

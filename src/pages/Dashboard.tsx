import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, CalendarClock, CheckCircle2, Flame, Lock, RotateCcw, Target, Trophy } from 'lucide-react';
import { chapters, getChapter, getProblem, mastery } from '../content';
import { addDay, diffDays, prettyDay } from '../lib/date';
import { db, useLive, useSettings } from '../store/db';
import { allChaptersDone, dueReviews, ensureDailySet, useChapterProgress, useMasteryStates, useReviews, useToday } from '../store/hooks';
import { dueDayNumber } from '../srs/schedule';

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

  const since = addDay(day, -27);
  const acts = useLive(() => db.activities.where('day').between(since, day, true, true).toArray(), [since, day], []) ?? [];
  const byDay = new Map<string, number>();
  acts.forEach((a) => byDay.set(a.day, (byDay.get(a.day) ?? 0) + 1));
  const streak = (() => {
    let n = 0;
    let d = byDay.has(day) ? day : addDay(day, -1);
    while (byDay.has(d)) {
      n++;
      d = addDay(d, -1);
    }
    return n;
  })();
  const solved = [...states.values()].filter((s) => s.solved).length;
  const upcoming = reviews
    .filter((r) => !r.done && diffDays(r.due, day) > 0)
    .sort((a, b) => a.due.localeCompare(b.due))
    .slice(0, 4);
  const pct = done.size / chapters.length;

  return (
    <div className="page">
      <div className="card hero">
        <ProgressRing pct={pct} label={`${done.size}/${chapters.length}`} sub="章節" />
        <div>
          <h1>{done.size === 0 ? '從第一條 SELECT 開始' : next ? `繼續第 ${next.order} 章：${next.title}` : '入門課程全部完成'}</h1>
          <p>{prettyDay(day)} · 目標：學完這裡，無縫接軌 LeetCode SQL 題</p>
        </div>
        <div className="hero-cta">
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
        </div>
      </div>

      <div className="stats">
        <Stat icon={<BookOpen className="ic" aria-hidden />} label="入門章節" value={`${done.size}/${chapters.length}`} pct={pct} />
        <Stat icon={<Trophy className="ic" aria-hidden />} label="精熟題" value={`${solved}/${mastery.length}`} pct={solved / mastery.length} />
        <Stat icon={<Flame className="ic" aria-hidden />} label="連續學習" value={`${streak} 天`} />
        <Stat icon={<CalendarClock className="ic" aria-hidden />} label="待複習" value={`${due.length} 章`} tone={due.length ? 'warn' : undefined} />
      </div>

      <div className="grid2">
        <div className="card">
          <div className="card-title">
            <Target className="ic" aria-hidden />
            <h2>今日任務</h2>
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
                    <span className={'task-ic' + (s?.solved ? ' ok' : '')} aria-hidden>
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
        </div>

        <div className="card">
          <div className="card-title">
            <Flame className="ic" aria-hidden />
            <h2>近 4 週學習熱度</h2>
          </div>
          <Heat byDay={byDay} day={day} />
          <div className="card-title mt">
            <CalendarClock className="ic" aria-hidden />
            <h2>即將到來的複習</h2>
          </div>
          {upcoming.length === 0 && <p className="muted small">目前沒有排程。學完一章後，平台會在第 3、7、15、30、60 天提醒你複習。</p>}
          <ul className="plain upcoming">
            {upcoming.map((r) => (
              <li key={r.chapterId}>
                <span className="mono small">{r.due.slice(5)}</span>
                <span className="grow">{getChapter(r.chapterId)?.title}</span>
                <span className="tag">第 {dueDayNumber(r)} 天</span>
              </li>
            ))}
          </ul>
          <Link to="/plan" className="small inline-ic">
            查看完整複習計畫
            <ArrowRight className="ic-sm" aria-hidden />
          </Link>
        </div>
      </div>
    </div>
  );
}

function ProgressRing({ pct, label, sub }: { pct: number; label: string; sub: string }) {
  const r = 38;
  const c = 2 * Math.PI * r;
  return (
    <div className="ring" role="img" aria-label={`進度 ${Math.round(pct * 100)}%`}>
      <svg width="88" height="88" viewBox="0 0 88 88" aria-hidden>
        <circle className="ring-bg" cx="44" cy="44" r={r} fill="none" strokeWidth="7" />
        <circle className="ring-fg" cx="44" cy="44" r={r} fill="none" strokeWidth="7" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct)} />
      </svg>
      <div className="ring-label">
        <strong>{label}</strong>
        <span>{sub}</span>
      </div>
    </div>
  );
}

function Stat({ icon, label, value, pct, tone }: { icon: ReactNode; label: string; value: string; pct?: number; tone?: 'warn' }) {
  return (
    <div className={'stat card ' + (tone ?? '')}>
      <div className="stat-top">
        <span className="muted small">{label}</span>
        <span className="stat-ic">{icon}</span>
      </div>
      <div className="stat-v">{value}</div>
      {pct !== undefined && (
        <div className="bar" role="progressbar" aria-valuenow={Math.round(pct * 100)} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
          <div style={{ width: `${Math.round(pct * 100)}%` }} />
        </div>
      )}
    </div>
  );
}

function Heat({ byDay, day }: { byDay: Map<string, number>; day: string }) {
  const days = Array.from({ length: 28 }, (_, i) => addDay(day, i - 27));
  const lv = (n: number) => (n === 0 ? 0 : n < 3 ? 1 : n < 6 ? 2 : 3);
  return (
    <>
      <div className="heat" role="img" aria-label={`近 28 天中有 ${days.filter((d) => byDay.has(d)).length} 天有學習紀錄`}>
        {days.map((d) => (
          <div key={d} className={'heat-c lv' + lv(byDay.get(d) ?? 0)} title={`${d}：${byDay.get(d) ?? 0} 筆活動`} />
        ))}
      </div>
      <div className="heat-legend small muted" aria-hidden>
        少 <span className="heat-c lv0" /> <span className="heat-c lv1" /> <span className="heat-c lv2" /> <span className="heat-c lv3" /> 多
      </div>
    </>
  );
}

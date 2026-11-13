import { useState } from 'react';
import { Link } from 'react-router-dom';
import { addMonths } from 'date-fns';
import { MonthCalendar } from '../components/Calendar';
import { chapterRange, chapters, getChapter } from '../content';
import { diffDays, fromDay, prettyDay, toDay, type DayStr } from '../lib/date';
import { monthRange } from '../lib/studyPlan';
import { dueDayNumber, projectedDates, reviewStatus } from '../srs/schedule';
import { useSettings } from '../store/db';
import { dueReviews, useChapterProgress, useReviews, useStudyPlan, useToday } from '../store/hooks';
import { BookOpen, CheckCircle2, ChevronLeft, ChevronRight, Settings as SettingsIcon } from 'lucide-react';

const PERIOD_WORD = { week: '本週', month: '本月' } as const;

export function PlanPage() {
  const day = useToday();
  const reviews = useReviews();
  const done = useChapterProgress();
  const { offsets, studyPlan } = useSettings();
  const view = useStudyPlan();
  const [month, setMonth] = useState<DayStr>(day);
  const [selected, setSelected] = useState<DayStr | null>(null);
  const due = dueReviews(reviews, day);

  // 預測每一天要複習哪些章節
  const plan = new Map<DayStr, string[]>();
  for (const r of reviews) {
    const dates = projectedDates(r, offsets);
    dates.forEach((d, i) => {
      // 已逾期的那次顯示在今天
      const key = i === 0 && d < day ? day : d;
      const arr = plan.get(key) ?? [];
      arr.push(r.chapterId);
      plan.set(key, arr);
    });
  }
  const upcoming = [...plan.entries()]
    .filter(([d]) => d > day && diffDays(d, day) <= 30)
    .sort(([a], [b]) => a.localeCompare(b));

  // 新章節：日模式與目標模式排在每一天；週模式在每週下方顯示帶狀提示；月模式只在月曆上方提醒
  const newPlan = view.perDay;
  const order = new Map(chapters.map((c, i) => [c.id, i]));
  const sortedItems = [...reviews].sort((a, b) => (order.get(a.chapterId) ?? 0) - (order.get(b.chapterId) ?? 0));
  const dayNums = offsets.map((o) => o + 1);
  const isCurrentMonth = monthRange(month).start === view.period?.start;
  const todayNew = view.today;
  const selNew = selected ? newPlan.get(selected) : undefined;
  const selReview = selected ? plan.get(selected) : undefined;

  return (
    <div className="page">
      <h1>學習計畫</h1>
      <p className="muted">
        {studyPlan.enabled ? (
          <>
            <strong>新章節</strong>依設定的{studyPlan.mode === 'goal' ? `目標（${studyPlan.goalDays} 天內學完）` : '時間計畫'}安排；
          </>
        ) : (
          <>
            還沒開啟新章節的學習計畫，可以到<Link to="/settings">設定</Link>開啟。
          </>
        )}
        <strong>複習</strong>依艾賓浩斯遺忘曲線：學完一章當天算第 1 天，之後在第 <strong>{dayNums.join('、')}</strong> 天各複習一次，第一次提交答錯就從第 {dayNums[0]} 天重新排程。
      </p>

      <div className="grid2">
        <div className="card">
          {studyPlan.enabled && !view.allDone && (
            <>
              {todayNew ? (
                <>
                  <h2>
                    今天要學（{todayNew.done}/{todayNew.target}）
                  </h2>
                  {view.overdue && <p className="small warn-text">已超過目標截止日，剩下的章節都排在今天。</p>}
                  <ul className="tasks">
                    {todayNew.chapterIds.map((id) => {
                      const c = getChapter(id)!;
                      const ok = done.has(id);
                      return (
                        <li key={id}>
                          <span className={'task-ic' + (ok ? ' ok' : '')} aria-hidden>
                            {ok ? <CheckCircle2 className="ic" /> : <BookOpen className="ic" />}
                          </span>
                          <span className="grow">
                            第 {c.order} 章 {c.title}
                          </span>
                          {ok ? (
                            <span className="chip">已完成</span>
                          ) : (
                            <Link className="btn btn-secondary btn-sm" to={`/learn/${id}`}>
                              開始
                            </Link>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </>
              ) : (
                view.period && (
                  <>
                    <h2>
                      {PERIOD_WORD[view.period.kind]}目標（{view.period.done}/{view.period.target}）
                    </h2>
                    <p className="small muted">
                      {prettyDay(view.period.start)} ～ {prettyDay(view.period.end)}：{chapterRange(view.period.chapterIds)}
                    </p>
                  </>
                )
              )}
              <hr className="soft-hr" />
            </>
          )}
          <h2>今天要複習（{due.length}）</h2>
          {due.length === 0 && <p className="muted">今天沒有到期的複習，保持得很好。</p>}
          <ul className="tasks">
            {due.map((r) => (
              <li key={r.chapterId}>
                <span className={'tag ' + (r.due < day ? 'tag-bad' : 'tag-warn')}>{r.due < day ? `逾期 ${diffDays(day, r.due)} 天` : '今天'}</span>
                <span className="grow">
                  第 {getChapter(r.chapterId)?.order} 章 {getChapter(r.chapterId)?.title}
                  <span className="muted small">（第 {dueDayNumber(r)} 天複習）</span>
                </span>
                <Link className="btn btn-primary btn-sm" to={`/review/${r.chapterId}`}>
                  複習
                </Link>
              </li>
            ))}
          </ul>
          <h3 className="mt">未來 30 天的複習</h3>
          {upcoming.length === 0 && <p className="muted small">沒有排程。</p>}
          <ul className="plain upcoming">
            {upcoming.map(([d, ids]) => (
              <li key={d}>
                <span className="mono small">{prettyDay(d)}</span>
                <span>{ids.map((id) => getChapter(id)?.title).join('、')}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="card">
          <div className="cal-head">
            <button className="btn btn-ghost btn-sm" onClick={() => setMonth(toDay(addMonths(fromDay(month), -1)))} aria-label="上個月">
              <ChevronLeft className="ic-sm" aria-hidden />
            </button>
            <strong>
              {fromDay(month).getFullYear()} 年 {fromDay(month).getMonth() + 1} 月
            </strong>
            <button className="btn btn-ghost btn-sm" onClick={() => setMonth(toDay(addMonths(fromDay(month), 1)))} aria-label="下個月">
              <ChevronRight className="ic-sm" aria-hidden />
            </button>
          </div>
          {view.period?.kind === 'month' && isCurrentMonth && !view.allDone && (
            <div className="cal-notice" role="status">
              本月須完成 <strong>{view.period.target}</strong> 章（已完成 {view.period.done}）：{chapterRange(view.period.chapterIds)}
            </div>
          )}
          <MonthCalendar
            month={month}
            selected={selected}
            onSelect={(d) => setSelected(d === selected ? null : d)}
            cellClass={(d) => [plan.has(d) ? 'has-plan' : '', newPlan.has(d) ? 'has-new' : ''].join(' ')}
            renderCell={(d) => {
              const r = plan.get(d);
              const n = newPlan.get(d);
              if (!r && !n) return null;
              return (
                <span className="cal-chips">
                  {n && <span className="cal-chip new">新 {n.length}</span>}
                  {r && <span className="cal-chip rev">複習 {r.length}</span>}
                </span>
              );
            }}
            weekBand={(ws) => {
              const b = view.weekBands.get(ws);
              if (!b || !b.chapterIds.length) return null;
              return (
                <span>
                  {ws === view.period?.start ? '本週' : '該週'}目標 {b.target} 章：{chapterRange(b.chapterIds)}
                </span>
              );
            }}
          />
          <div className="legend small muted">
            <span>
              <i className="sw sw-learn" />
              新章節
            </span>
            <span>
              <i className="sw sw-review" />
              複習
            </span>
          </div>
          {selected && (
            <div className="mt small cal-detail">
              <strong>{prettyDay(selected)}</strong>
              {!selNew && !selReview && <p className="muted">這天沒有安排。</p>}
              {selNew && (
                <p>
                  <span className="cal-chip new">新章節</span>{' '}
                  {selNew.map((id, i) => (
                    <span key={id}>
                      {i > 0 && '、'}
                      <Link to={`/learn/${id}`}>
                        第 {getChapter(id)?.order} 章 {getChapter(id)?.title}
                      </Link>
                    </span>
                  ))}
                </p>
              )}
              {selReview && (
                <p>
                  <span className="cal-chip rev">複習</span> {selReview.map((id) => getChapter(id)?.title).join('、')}
                </p>
              )}
            </div>
          )}
          {!studyPlan.enabled && (
            <p className="small mt">
              <Link to="/settings" className="inline-ic">
                <SettingsIcon className="ic-sm" aria-hidden />
                到設定開啟學習計畫，把新章節排進月曆
              </Link>
            </p>
          )}
        </div>
      </div>

      <div className="card mt">
        <h2>各章節記憶進度</h2>
        {sortedItems.length === 0 && <p className="muted">還沒有學完任何章節。</p>}
        <table className="plan-table">
          <thead>
            <tr>
              <th>章節</th>
              <th>進度</th>
              <th>下次複習</th>
            </tr>
          </thead>
          <tbody>
            {sortedItems.map((r) => {
              const st = reviewStatus(r, day);
              return (
                <tr key={r.chapterId}>
                  <td>
                    <Link to={`/review/${r.chapterId}`}>
                      {getChapter(r.chapterId)?.order}. {getChapter(r.chapterId)?.title}
                    </Link>
                  </td>
                  <td>
                    <span className="stages" title={`已完成 ${Math.min(r.stage, offsets.length)} / ${offsets.length} 次複習`}>
                      {offsets.map((_, i) => (
                        <i key={i} className={i < r.stage ? 'on' : ''} />
                      ))}
                    </span>
                  </td>
                  <td className="small">
                    {st === 'done' ? <span className="ok">已精熟</span> : <span className={st === 'overdue' ? 'bad' : st === 'today' ? 'warn-text' : ''}>{prettyDay(r.due)}</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

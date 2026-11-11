import { useState } from 'react';
import { Link } from 'react-router-dom';
import { addMonths } from 'date-fns';
import { MonthCalendar } from '../components/Calendar';
import { chapters, getChapter } from '../content';
import { diffDays, fromDay, prettyDay, toDay, type DayStr } from '../lib/date';
import { dueDayNumber, projectedDates, reviewStatus } from '../srs/schedule';
import { useSettings } from '../store/db';
import { dueReviews, useReviews, useToday } from '../store/hooks';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export function PlanPage() {
  const day = useToday();
  const reviews = useReviews();
  const { offsets } = useSettings();
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

  const order = new Map(chapters.map((c, i) => [c.id, i]));
  const sortedItems = [...reviews].sort((a, b) => (order.get(a.chapterId) ?? 0) - (order.get(b.chapterId) ?? 0));
  const dayNums = offsets.map((o) => o + 1);

  return (
    <div className="page">
      <h1>複習計畫</h1>
      <p className="muted">
        依艾賓浩斯遺忘曲線安排：學完一章當天算第 1 天，之後在第 <strong>{dayNums.join('、')}</strong> 天各複習一次。每次複習的第一次提交答錯，就從頭（第 {dayNums[0]} 天）重新排程。到期時平台會在頂部提醒，並發送瀏覽器通知（可在設定開關）。
      </p>

      <div className="grid2">
        <div className="card">
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
          <h3 className="mt">未來 30 天</h3>
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
          <MonthCalendar
            month={month}
            selected={selected}
            onSelect={(d) => setSelected(d === selected ? null : d)}
            cellClass={(d) => (plan.has(d) ? 'has-plan' : '')}
            renderCell={(d) => {
              const ids = plan.get(d);
              if (!ids) return null;
              return <span className="plan-count">{ids.length} 章</span>;
            }}
          />
          {selected && (
            <div className="mt small">
              <strong>{prettyDay(selected)}</strong>：{plan.get(selected)?.map((id) => getChapter(id)?.title).join('、') ?? '沒有複習排程'}
            </div>
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

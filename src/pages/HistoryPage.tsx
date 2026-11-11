import { useMemo, useState } from 'react';
import { endOfMonth, endOfWeek, startOfMonth, startOfWeek, addMonths, addWeeks, addDays } from 'date-fns';
import { MonthCalendar } from '../components/Calendar';
import { db, useLive, type Activity, type ActivityType } from '../store/db';
import { fromDay, prettyDay, toDay, type DayStr } from '../lib/date';
import { useToday } from '../store/hooks';
import { CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, List, XCircle } from 'lucide-react';

type Range = 'day' | 'week' | 'month';
type View = 'list' | 'calendar';

const TYPE_LABEL: Record<ActivityType, string> = { learn: '學完章節', practice: '章節練習', review: '複習', mastery: '精熟題' };
const TYPE_CLASS: Record<ActivityType, string> = { learn: 'tag-ok', practice: '', review: 'tag-warn', mastery: 'tag-blue' };

function bounds(range: Range, anchor: DayStr): [DayStr, DayStr] {
  const d = fromDay(anchor);
  if (range === 'day') return [anchor, anchor];
  if (range === 'week') return [toDay(startOfWeek(d)), toDay(endOfWeek(d))];
  return [toDay(startOfMonth(d)), toDay(endOfMonth(d))];
}

function shift(range: Range, anchor: DayStr, n: number): DayStr {
  const d = fromDay(anchor);
  if (range === 'day') return toDay(addDays(d, n));
  if (range === 'week') return toDay(addWeeks(d, n));
  return toDay(addMonths(d, n));
}

function rangeLabel(range: Range, [a, b]: [DayStr, DayStr]): string {
  const A = fromDay(a);
  if (range === 'day') return prettyDay(a);
  if (range === 'month') return `${A.getFullYear()} 年 ${A.getMonth() + 1} 月`;
  return `${a.replace(/-/g, '/')} – ${b.slice(5).replace(/-/g, '/')}`;
}

export function HistoryPage() {
  const day = useToday();
  const [range, setRange] = useState<Range>('week');
  const [view, setView] = useState<View>('list');
  const [anchor, setAnchor] = useState<DayStr>(day);
  const [selected, setSelected] = useState<DayStr | null>(null);
  const [from, to] = bounds(range, anchor);
  // 月曆模式需要整月資料
  const [qFrom, qTo] = view === 'calendar' && range !== 'week' ? bounds('month', anchor) : [from, to];
  const acts = useLive(() => db.activities.where('day').between(qFrom, qTo, true, true).toArray(), [qFrom, qTo], []) ?? [];
  const inRange = acts.filter((a) => a.day >= from && a.day <= to);

  const byDay = useMemo(() => {
    const m = new Map<DayStr, Activity[]>();
    for (const a of acts) {
      const arr = m.get(a.day) ?? [];
      arr.push(a);
      m.set(a.day, arr);
    }
    for (const arr of m.values()) arr.sort((x, y) => y.ts - x.ts);
    return m;
  }, [acts]);

  const graded = inRange.filter((a) => a.correct !== undefined);
  const stats = {
    total: inRange.length,
    learned: inRange.filter((a) => a.type === 'learn').length,
    reviews: inRange.filter((a) => a.type === 'review').length,
    mastery: new Set(inRange.filter((a) => a.type === 'mastery' && a.correct).map((a) => a.refId)).size,
    acc: graded.length ? Math.round((graded.filter((a) => a.correct).length / graded.length) * 100) : null,
    days: new Set(inRange.map((a) => a.day)).size,
  };

  return (
    <div className="page">
      <h1>學習紀錄</h1>
      <div className="toolbar">
        <div className="seg" role="group" aria-label="範圍">
          {(['day', 'week', 'month'] as Range[]).map((r) => (
            <button key={r} className={range === r ? 'on' : ''} onClick={() => { setRange(r); setSelected(null); }}>
              {{ day: '日', week: '週', month: '月' }[r]}
            </button>
          ))}
        </div>
        <div className="seg" role="group" aria-label="檢視">
          <button className={view === 'list' ? 'on' : ''} onClick={() => setView('list')}>
            <List className="ic-sm" aria-hidden /> 條列
          </button>
          <button className={view === 'calendar' ? 'on' : ''} onClick={() => setView('calendar')}>
            <CalendarDays className="ic-sm" aria-hidden /> 月曆
          </button>
        </div>
        <div className="spacer" />
        <div className="nav-range">
          <button className="btn btn-ghost btn-sm" onClick={() => setAnchor(shift(range, anchor, -1))} aria-label="上一段">
            <ChevronLeft className="ic-sm" aria-hidden />
          </button>
          <strong>{rangeLabel(range, [from, to])}</strong>
          <button className="btn btn-ghost btn-sm" onClick={() => setAnchor(shift(range, anchor, 1))} aria-label="下一段">
            <ChevronRight className="ic-sm" aria-hidden />
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => { setAnchor(day); setSelected(null); }}>
            今天
          </button>
        </div>
      </div>

      <div className="stats">
        <div className="stat card"><div className="muted small">活動數</div><div className="stat-v">{stats.total}</div></div>
        <div className="stat card"><div className="muted small">學習天數</div><div className="stat-v">{stats.days}</div></div>
        <div className="stat card"><div className="muted small">學完章節</div><div className="stat-v">{stats.learned}</div></div>
        <div className="stat card"><div className="muted small">複習次數</div><div className="stat-v">{stats.reviews}</div></div>
        <div className="stat card"><div className="muted small">解出精熟題</div><div className="stat-v">{stats.mastery}</div></div>
        <div className="stat card"><div className="muted small">提交正確率</div><div className="stat-v">{stats.acc === null ? '—' : stats.acc + '%'}</div></div>
      </div>

      {view === 'list' && <ActivityList byDay={byDay} from={from} to={to} />}

      {view === 'calendar' && range === 'week' && <WeekBoard from={from} byDay={byDay} today={day} />}

      {view === 'calendar' && range !== 'week' && (
        <div className="card">
          <MonthCalendar
            month={anchor}
            selected={range === 'day' ? anchor : selected}
            onSelect={(d) => (range === 'day' ? setAnchor(d) : setSelected(d === selected ? null : d))}
            cellClass={(d) => {
              const n = byDay.get(d)?.length ?? 0;
              return n === 0 ? '' : n < 3 ? 'lv1' : n < 6 ? 'lv2' : 'lv3';
            }}
            renderCell={(d) => <DayDots acts={byDay.get(d) ?? []} />}
          />
          <div className="legend small muted">
            <span><i className="dot-t learn" /> 學完章節</span>
            <span><i className="dot-t practice" /> 練習</span>
            <span><i className="dot-t review" /> 複習</span>
            <span><i className="dot-t mastery" /> 精熟題</span>
          </div>
          {(range === 'day' || selected) && (
            <div className="mt">
              <ActivityList byDay={byDay} from={range === 'day' ? anchor : selected!} to={range === 'day' ? anchor : selected!} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DayDots({ acts }: { acts: Activity[] }) {
  if (!acts.length) return null;
  const counts = new Map<ActivityType, number>();
  acts.forEach((a) => counts.set(a.type, (counts.get(a.type) ?? 0) + 1));
  return (
    <div className="day-dots">
      {[...counts.entries()].map(([t, n]) => (
        <span key={t} className={'dot-t ' + t} title={`${TYPE_LABEL[t]} ${n}`}>
          {n > 1 ? n : ''}
        </span>
      ))}
    </div>
  );
}

function WeekBoard({ from, byDay, today }: { from: DayStr; byDay: Map<DayStr, Activity[]>; today: DayStr }) {
  const days = Array.from({ length: 7 }, (_, i) => toDay(addDays(fromDay(from), i)));
  return (
    <div className="week-board">
      {days.map((d) => (
        <div key={d} className={'week-col card ' + (d === today ? 'today' : '')}>
          <div className="week-h">
            <strong>{prettyDay(d).replace(/^\d+月/, '')}</strong>
            <span className="muted small">{d.slice(5)}</span>
          </div>
          {(byDay.get(d) ?? []).map((a) => (
            <div key={a.id} className={'week-item ' + a.type} title={a.title}>
              <span className="muted small">{new Date(a.ts).toTimeString().slice(0, 5)}</span>
              <span className="week-title">{a.title}</span>
              {a.correct !== undefined && <span className={a.correct ? 'ok' : 'bad'} aria-label={a.correct ? '正確' : '錯誤'}>{a.correct ? <CheckCircle2 className="ic-sm" aria-hidden /> : <XCircle className="ic-sm" aria-hidden />}</span>}
            </div>
          ))}
          {!(byDay.get(d) ?? []).length && <div className="muted small">—</div>}
        </div>
      ))}
    </div>
  );
}

function ActivityList({ byDay, from, to }: { byDay: Map<DayStr, Activity[]>; from: DayStr; to: DayStr }) {
  const days = [...byDay.keys()].filter((d) => d >= from && d <= to).sort().reverse();
  if (!days.length) return <div className="card muted">這段期間沒有學習紀錄。</div>;
  return (
    <div className="activity-list">
      {days.map((d) => (
        <div key={d} className="card">
          <h3>
            {prettyDay(d)} <span className="muted small">· {byDay.get(d)!.length} 筆</span>
          </h3>
          <ul className="acts">
            {byDay.get(d)!.map((a) => (
              <li key={a.id}>
                <details>
                  <summary>
                    <span className="mono small muted">{new Date(a.ts).toTimeString().slice(0, 5)}</span>
                    <span className={'tag ' + TYPE_CLASS[a.type]}>{TYPE_LABEL[a.type]}</span>
                    <span className="grow">{a.title}</span>
                    {a.correct !== undefined && <span className={'inline-ic ' + (a.correct ? 'ok' : 'bad')}>{a.correct ? <CheckCircle2 className="ic-sm" aria-hidden /> : <XCircle className="ic-sm" aria-hidden />}{a.correct ? '正確' : '錯誤'}</span>}
                  </summary>
                  {a.sql ? (
                    <pre className="md-code">
                      <code>{a.sql}</code>
                    </pre>
                  ) : (
                    <p className="muted small">（無 SQL 紀錄）</p>
                  )}
                  {a.detail && <p className="small muted">{a.detail}</p>}
                </details>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

import { Fragment, type ReactNode } from 'react';
import { addDay, fromDay, toDay, today, type DayStr } from '../lib/date';

const WEEK = ['日', '一', '二', '三', '四', '五', '六'];

interface Props {
  /** 該月任一天 */
  month: DayStr;
  renderCell: (day: DayStr) => ReactNode;
  selected?: DayStr | null;
  onSelect?: (day: DayStr) => void;
  cellClass?: (day: DayStr) => string;
  /** 每週那一列下方的帶狀提示（橫跨 7 欄）；參數是該週的週日 */
  weekBand?: (weekStart: DayStr) => ReactNode;
}

/** 自製月曆格：週日開始，6 週 × 7 天。 */
export function MonthCalendar({ month, renderCell, selected, onSelect, cellClass, weekBand }: Props) {
  const first = fromDay(month.slice(0, 8) + '01');
  const start = addDay(toDay(first), -first.getDay());
  const m = first.getMonth();
  const t = today();
  const days: DayStr[] = Array.from({ length: 42 }, (_, i) => addDay(start, i));
  // 最後一週全在下個月就省略
  const trimmed = fromDay(days[35]).getMonth() !== m ? days.slice(0, 35) : days;
  return (
    <div className="cal">
      {WEEK.map((w) => (
        <div key={w} className="cal-wd">
          {w}
        </div>
      ))}
      {trimmed.map((d, i) => {
        const inMonth = fromDay(d).getMonth() === m;
        const cls = ['cal-cell', inMonth ? '' : 'out', d === t ? 'today' : '', d === selected ? 'sel' : '', cellClass?.(d) ?? ''].join(' ');
        const band = i % 7 === 6 ? weekBand?.(trimmed[i - 6]) : null;
        return (
          <Fragment key={d}>
            <button className={cls} onClick={() => onSelect?.(d)} aria-label={d}>
              <span className="cal-num">{fromDay(d).getDate()}</span>
              <div className="cal-body">{renderCell(d)}</div>
            </button>
            {band && <div className="cal-band">{band}</div>}
          </Fragment>
        );
      })}
    </div>
  );
}

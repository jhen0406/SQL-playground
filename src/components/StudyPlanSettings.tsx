import { useEffect, useState } from 'react';
import { CalendarCheck, Target } from 'lucide-react';
import { prettyDay } from '../lib/date';
import type { StudyPlan } from '../lib/studyPlan';
import { saveSettings, useSettings } from '../store/db';
import { useStudyPlan, useToday } from '../store/hooks';

const PERIOD_LABEL = { day: '天', week: '週', month: '月' } as const;

/** 設定頁「學習計畫」區塊 */
export function StudyPlanSettings() {
  const { studyPlan: p } = useSettings();
  const view = useStudyPlan();
  const day = useToday();
  const [countText, setCountText] = useState(String(p.count));
  const [daysText, setDaysText] = useState(String(p.goalDays));
  useEffect(() => setCountText(String(p.count)), [p.count]);
  useEffect(() => setDaysText(String(p.goalDays)), [p.goalDays]);

  const save = (patch: Partial<StudyPlan>) => saveSettings({ studyPlan: { ...p, ...patch } });
  const clamp = (v: string, min: number, max: number) => Math.min(max, Math.max(min, Math.round(Number(v) || min)));

  return (
    <section className="card">
      <h2>
        <CalendarCheck className="ic" aria-hidden />
        學習計畫
      </h2>
      <p className="muted small">規劃新章節的學習速度（不含複習）。開啟後，「學習計畫」頁的月曆和總覽的「目標進度」會依這裡的設定顯示。</p>
      <label className="check">
        <input
          type="checkbox"
          checked={p.enabled}
          onChange={(e) => save({ enabled: e.target.checked, goalStart: e.target.checked && p.mode === 'goal' ? day : p.goalStart })}
        />
        開啟學習計畫
      </label>

      {p.enabled && (
        <div className="plan-settings">
          <div className="seg" role="radiogroup" aria-label="計畫模式">
            <button role="radio" aria-checked={p.mode === 'time'} className={p.mode === 'time' ? 'on' : ''} onClick={() => save({ mode: 'time' })}>
              時間模式
            </button>
            <button role="radio" aria-checked={p.mode === 'goal'} className={p.mode === 'goal' ? 'on' : ''} onClick={() => save({ mode: 'goal', goalStart: day })}>
              目標模式
            </button>
          </div>

          {p.mode === 'time' ? (
            <div className="row plan-row">
              <label htmlFor="plan-period">每</label>
              <select id="plan-period" className="ui-input narrow" value={p.period} onChange={(e) => save({ period: e.target.value as StudyPlan['period'] })}>
                <option value="day">天</option>
                <option value="week">週</option>
                <option value="month">月</option>
              </select>
              <label htmlFor="plan-count">學</label>
              <input
                id="plan-count"
                className="ui-input narrow plan-num"
                type="number"
                min={1}
                max={34}
                value={countText}
                onChange={(e) => setCountText(e.target.value)}
                onBlur={() => save({ count: clamp(countText, 1, 34) })}
                onKeyDown={(e) => e.key === 'Enter' && save({ count: clamp(countText, 1, 34) })}
              />
              <span>章新章節（不含複習）</span>
            </div>
          ) : (
            <div className="row plan-row">
              <label htmlFor="plan-days">從今天起</label>
              <input
                id="plan-days"
                className="ui-input narrow plan-num"
                type="number"
                min={1}
                max={365}
                value={daysText}
                onChange={(e) => setDaysText(e.target.value)}
                onBlur={() => save({ goalDays: clamp(daysText, 1, 365), goalStart: day })}
                onKeyDown={(e) => e.key === 'Enter' && save({ goalDays: clamp(daysText, 1, 365), goalStart: day })}
              />
              <span>天內學完全部章節</span>
            </div>
          )}

          <div className="plan-preview small">
            <Target className="ic-sm" aria-hidden />
            {view.allDone ? (
              <span>入門章節已全部學完。</span>
            ) : p.mode === 'goal' ? (
              <span>
                截止日 <strong>{view.deadline && prettyDay(view.deadline)}</strong>，還剩 <strong>{view.remaining}</strong> 章、
                <strong>{view.daysLeft}</strong> 天，平均每天約 <strong>{view.daysLeft ? (view.remaining / view.daysLeft).toFixed(1) : view.remaining}</strong> 章。
                {view.overdue && <span className="warn-text"> 已超過截止日，剩下的章節都排在今天。</span>}
              </span>
            ) : (
              <span>
                每{PERIOD_LABEL[p.period]} {p.count} 章，還剩 <strong>{view.remaining}</strong> 章，預計 <strong>{view.finishDay && prettyDay(view.finishDay)}</strong> 全部學完。
              </span>
            )}
          </div>
          {p.mode === 'goal' && <p className="muted small">每天會依「剩下的章節 ÷ 剩下的天數」自動重新分配；某天沒學完，之後每天的量會變多，截止日不變。修改天數會從今天重新起算。</p>}
        </div>
      )}
    </section>
  );
}

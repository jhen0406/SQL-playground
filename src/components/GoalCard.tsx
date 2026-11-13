import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, CheckCircle2, Flag, Settings as SettingsIcon, Trophy } from 'lucide-react';
import { getChapter } from '../content';
import { diffDays, prettyDay } from '../lib/date';
import { useSettings } from '../store/db';
import { useChapterProgress, useStudyPlan, useToday } from '../store/hooks';

const PERIOD_WORD = { day: '今日', week: '本週', month: '本月' } as const;

/** 總覽的「目標進度」卡：今天（或本週、本月）要達成的目標與整體進度 */
export function GoalCard() {
  const { studyPlan: p } = useSettings();
  const view = useStudyPlan();
  const done = useChapterProgress();
  const day = useToday();

  if (!p.enabled) {
    return (
      <section className="card goal-card goal-off" aria-labelledby="goal-h">
        <Flag className="ic" aria-hidden />
        <div className="grow">
          <h2 id="goal-h">目標進度</h2>
          <p className="muted small">設定每天、每週或每月要學幾章，或在幾天內學完全部章節，這裡會顯示今天的目標與進度。</p>
        </div>
        <Link className="btn btn-secondary btn-sm" to="/settings">
          <SettingsIcon className="ic-sm" aria-hidden />
          開啟學習計畫
        </Link>
      </section>
    );
  }

  if (view.allDone) {
    return (
      <section className="card goal-card goal-off" aria-labelledby="goal-h">
        <Trophy className="ic" aria-hidden />
        <div className="grow">
          <h2 id="goal-h">目標進度</h2>
          <p className="muted small">入門課程 {view.total} 章已全部完成！接下來到精熟挑戰練習商業情境題。</p>
        </div>
        <Link className="btn btn-primary btn-sm" to="/mastery">
          精熟挑戰
          <ArrowRight className="ic-sm" aria-hidden />
        </Link>
      </section>
    );
  }

  // 今日（日模式、目標模式）或本週／本月（週、月模式）
  const cur = view.today ?? (view.period ? { target: view.period.target, done: view.period.done, chapterIds: view.period.chapterIds } : null);
  const word = p.mode === 'goal' ? '今日' : PERIOD_WORD[p.period];
  const reached = !!cur && cur.done >= cur.target;
  const pct = cur && cur.target ? Math.min(1, cur.done / cur.target) : 0;
  const daysToFinish = view.finishDay ? diffDays(view.finishDay, day) + 1 : null;

  return (
    <section className="card goal-card" aria-labelledby="goal-h">
      <div className="goal-now">
        <div className="kpi-top">
          <h2 id="goal-h" className="kpi-label">{word}目標</h2>
          {reached ? (
            <span className="chip">
              <CheckCircle2 className="ic-sm" aria-hidden />
              {word}目標達成
            </span>
          ) : view.overdue ? (
            <span className="chip chip-bad">已超過截止日</span>
          ) : view.behind ? (
            <span className="chip chip-warn">進度落後，需加快</span>
          ) : null}
        </div>
        <div className="kpi-v">
          {cur?.done ?? 0}
          <span className="kpi-unit">/ {cur?.target ?? 0} 章</span>
        </div>
        <div className="bar big-bar" role="progressbar" aria-valuenow={cur?.done ?? 0} aria-valuemin={0} aria-valuemax={cur?.target ?? 0} aria-label={`${word}目標進度`}>
          <div style={{ width: `${pct * 100}%` }} />
        </div>
      </div>

      <div className="goal-list">
        <div className="kpi-label">
          {word}要學{view.period && !view.today ? `（${prettyDay(view.period.start)} ～ ${prettyDay(view.period.end)}）` : ''}
        </div>
        {cur && cur.chapterIds.length > 0 ? (
          <ul className="goal-items">
            {cur.chapterIds.map((id) => {
              const c = getChapter(id)!;
              const ok = done.has(id);
              return (
                <li key={id} className={ok ? 'is-done' : ''}>
                  {ok ? <CheckCircle2 className="ic-sm ok" aria-label="已完成" /> : <BookOpen className="ic-sm" aria-hidden />}
                  <span className="grow">
                    第 {c.order} 章 {c.title}
                  </span>
                  {!ok && (
                    <Link className="btn btn-secondary btn-sm" to={`/learn/${id}`}>
                      開始
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="muted small">沒有安排。</p>
        )}
      </div>

      <div className="goal-overall">
        <div className="kpi-label">整體進度</div>
        <div className="goal-big">
          {view.doneCount}
          <span className="kpi-unit">/ {view.total} 章</span>
        </div>
        <dl className="goal-facts small">
          {p.mode === 'goal' ? (
            <>
              <dt>截止日</dt>
              <dd>{view.deadline && prettyDay(view.deadline)}</dd>
              <dt>剩下</dt>
              <dd>
                {view.daysLeft} 天・{view.remaining} 章
              </dd>
              <dt>平均每天</dt>
              <dd>約 {view.daysLeft ? (view.remaining / view.daysLeft).toFixed(1) : view.remaining} 章</dd>
            </>
          ) : (
            <>
              <dt>速度</dt>
              <dd>
                每{{ day: '天', week: '週', month: '月' }[p.period]} {p.count} 章
              </dd>
              <dt>預計學完</dt>
              <dd>{view.finishDay && prettyDay(view.finishDay)}</dd>
              <dt>還要</dt>
              <dd>
                約 {daysToFinish} 天・{view.remaining} 章
              </dd>
            </>
          )}
        </dl>
        <Link to="/plan" className="small inline-ic">
          看學習計畫月曆
          <ArrowRight className="ic-sm" aria-hidden />
        </Link>
      </div>
    </section>
  );
}

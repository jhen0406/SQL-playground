import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { chapters, getProblem, mastery } from '../content';
import type { Difficulty } from '../content/types';
import { Playground } from '../components/Playground';
import { recordMastery } from '../store/progress';
import { useSettings } from '../store/db';
import { allChaptersDone, ensureDailySet, useChapterProgress, useMasteryStates, useOpenedProblems, useToday } from '../store/hooks';
import { ArrowRight, CheckCircle2, Circle, CircleDot, ExternalLink, Lock } from 'lucide-react';

const DIFFS: Difficulty[] = ['Easy', 'Medium', 'Hard'];
const DIFF_ZH: Record<Difficulty, string> = { Easy: '簡單', Medium: '中等', Hard: '困難' };

function useMasteryOpen() {
  const done = useChapterProgress();
  const settings = useSettings();
  return { open: allChaptersDone(done) || settings.masteryUnlocked, doneCount: done.size };
}

export function MasteryIndex() {
  const { open, doneCount } = useMasteryOpen();
  const day = useToday();
  const states = useMasteryStates();
  const opened = useOpenedProblems();
  const [daily, setDaily] = useState<string[]>([]);
  useEffect(() => {
    if (open) ensureDailySet(day).then(setDaily);
  }, [open, day]);

  if (!open) {
    return (
      <div className="page">
        <h1>精熟挑戰</h1>
        <div className="card center-card">
          <div className="big-icon"><Lock className="ic-lg" aria-hidden /></div>
          <p>
            完成全部 <strong>{chapters.length}</strong> 章入門課程後解鎖（目前 {doneCount} / {chapters.length}）。
          </p>
          <p className="muted small">精熟階段改用真實商業情境：每月營收、顧客回購、商品排行、部門績效、留存分析……每天推出新題目，由淺入深。想提前挑戰可以到「設定」手動解鎖。</p>
          <Link to="/learn" className="btn btn-primary">
            繼續入門課程
          </Link>
        </div>
      </div>
    );
  }

  const solved = mastery.filter((p) => states.get(p.id)?.solved).length;
  return (
    <div className="page">
      <h1>精熟挑戰</h1>
      <p className="muted">
        商業情境題，難度 Easy → Medium → Hard。每天先提供資料表與範例資料，提交後才公布解法；AI 會解釋你的錯誤、展示更好的寫法並比較差異。已解 {solved} / {mastery.length} 題。
      </p>

      <div className="card daily">
        <h2>今日題目</h2>
        <div className="daily-list">
          {daily.map((id) => {
            const p = getProblem(id)!;
            const s = states.get(id);
            return (
              <Link key={id} to={`/mastery/${id}`} className="daily-item">
                <span className={'tag diff-' + p.difficulty}>{p.difficulty}</span>
                <span className="grow">
                  <strong>{p.title}</strong>
                  <span className="muted small"> · {p.topic}</span>
                </span>
                {s?.solved ? <span className="ok inline-ic"><CheckCircle2 className="ic-sm" aria-hidden />已解</span> : <span className="btn btn-primary btn-sm">開始</span>}
              </Link>
            );
          })}
          {daily.length === 0 && <p className="muted">太強了，全部題目都解完了！可以回頭重做，或直接去 LeetCode 刷題。</p>}
        </div>
        <p className="muted small">每天會依序推出尚未解出的題目（數量可在設定調整）。之前推出過的題目都會留在下方題庫中。</p>
      </div>

      {DIFFS.map((d) => (
        <section key={d} className="part">
          <h2>
            <span className={'tag diff-' + d}>{d}</span> {DIFF_ZH[d]}
          </h2>
          <div className="problem-list card">
            {mastery
              .filter((p) => p.difficulty === d)
              .map((p) => {
                const s = states.get(p.id);
                const isOpen = opened.has(p.id) || daily.includes(p.id);
                return isOpen ? (
                  <Link key={p.id} to={`/mastery/${p.id}`} className="problem-row">
                    <span className={'status-ic ' + (s?.solved ? 'solved' : s ? 'tried' : '')} aria-label={s?.solved ? '已解' : s ? '嘗試過' : '未作答'}>{s?.solved ? <CheckCircle2 className="ic-sm" /> : s ? <CircleDot className="ic-sm" /> : <Circle className="ic-sm" />}</span>
                    <span className="grow">{p.title}</span>
                    <span className="muted small">{p.topic}</span>
                    <span className="muted small hide-sm">{s ? `${s.attempts} 次提交` : ''}</span>
                  </Link>
                ) : (
                  <div key={p.id} className="problem-row locked">
                    <span className="status-ic"><Lock className="ic-sm" aria-label="未推出" /></span>
                    <span className="grow muted">{p.title}</span>
                    <span className="muted small">{p.topic}</span>
                    <span className="muted small hide-sm">之後推出</span>
                  </div>
                );
              })}
          </div>
        </section>
      ))}
    </div>
  );
}

export function MasteryProblemPage() {
  const { id = '' } = useParams();
  const p = getProblem(id);
  const { open } = useMasteryOpen();
  const opened = useOpenedProblems();
  const states = useMasteryStates();
  if (!p) return <div className="page">找不到題目。</div>;
  if (!open || (!opened.has(p.id) && !states.has(p.id))) {
    return (
      <div className="page">
        這題尚未推出。<Link to="/mastery">回精熟挑戰</Link>
      </div>
    );
  }
  const idx = mastery.indexOf(p);
  const nextP = mastery[idx + 1];
  const s = states.get(p.id);

  return (
    <div className="page">
      <div className="crumbs small">
        <Link to="/mastery">精熟挑戰</Link> / {p.difficulty}
      </div>
      <Playground
        exercise={p}
        mode="mastery"
        header={
          <div className="pg-head">
            <span className={'tag diff-' + p.difficulty}>{p.difficulty}</span>
            <span className="tag">{p.topic}</span>
            {s?.solved && <span className="tag tag-ok"><CheckCircle2 className="ic-sm" aria-hidden />已解</span>}
            <h3>{p.title}</h3>
          </div>
        }
        extraInfo={
          <div className="lc-ref small">
            <ExternalLink className="ic-sm" aria-hidden />
            <span className="muted">LeetCode 對應題型：</span>
            {p.leetcodeRef}
          </div>
        }
        onGraded={(g, sql) => recordMastery(p.id, p.title, g.pass, sql)}
      />
      {nextP && opened.has(nextP.id) && (
        <div className="chapter-foot">
          <span />
          <Link to={`/mastery/${nextP.id}`}>下一題：{nextP.title} <ArrowRight className="ic-sm" aria-hidden /></Link>
        </div>
      )}
    </div>
  );
}

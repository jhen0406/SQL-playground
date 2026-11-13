import { Link, useParams } from 'react-router-dom';
import { chapterRange, datasets, drillPatterns, drills, getDrill, getPattern } from '../content';
import type { DrillPattern } from '../content/types';
import { MiniRunner } from '../components/MiniRunner';
import { Playground } from '../components/Playground';
import { Markdown } from '../lib/markdown';
import { recordDrill } from '../store/progress';
import { useSettings } from '../store/db';
import { isPatternOpen, useChapterProgress, useMasteryStates } from '../store/hooks';
import { ArrowRight, CheckCircle2, ChevronDown, Circle, CircleDot, ExternalLink, Lock } from 'lucide-react';

function usePatternOpen() {
  const done = useChapterProgress();
  const settings = useSettings();
  return (pt: DrillPattern) => isPatternOpen(pt.requires, done, settings.masteryUnlocked);
}

export function DrillIndex() {
  const isOpen = usePatternOpen();
  const states = useMasteryStates();
  const solved = drills.filter((p) => states.get(p.id)?.solved).length;

  return (
    <div className="page">
      <h1>題型特訓</h1>
      <p className="muted">
        LeetCode SQL 常見的解題套路，一組一個題型：先看解題模板，再用 2–3 題練熟。學完該題型的前置章節就會開放。已解 {solved} / {drills.length} 題。
      </p>

      {drillPatterns.map((pt) => {
        const open = isOpen(pt);
        const items = drills.filter((p) => p.patternId === pt.id);
        const done = items.filter((p) => states.get(p.id)?.solved).length;
        return (
          <section key={pt.id} className="part">
            <h2 className="drill-h">
              {open ? null : <Lock className="ic-sm" aria-hidden />}
              {pt.title}
              <span className="muted small">{done} / {items.length}</span>
            </h2>
            <p className="muted small">
              {pt.summary}
              {!open && <> 學完{chapterRange(pt.requires)}後開放。</>}
            </p>
            {open && (
              <details className="card drill-template">
                <summary>
                  <ChevronDown className="ic-sm" aria-hidden /> 解題模板
                </summary>
                <Markdown text={pt.template} />
                <MiniRunner ds={datasets[pt.datasetId]} initialSql={pt.templateSql} title="試試看" explain="可以修改後再執行，觀察每一步的結果。" />
              </details>
            )}
            <div className="problem-list card">
              {items.map((p) => {
                const s = states.get(p.id);
                return open ? (
                  <Link key={p.id} to={`/drills/${p.id}`} className="problem-row">
                    <span className={'status-ic ' + (s?.solved ? 'solved' : s ? 'tried' : '')} aria-label={s?.solved ? '已解' : s ? '嘗試過' : '未作答'}>
                      {s?.solved ? <CheckCircle2 className="ic-sm" /> : s ? <CircleDot className="ic-sm" /> : <Circle className="ic-sm" />}
                    </span>
                    <span className="grow">{p.title}</span>
                    <span className={'tag diff-' + p.difficulty}>{p.difficulty}</span>
                    <span className="muted small hide-sm drill-ref">{p.leetcodeRef.split('.')[0]}</span>
                  </Link>
                ) : (
                  <div key={p.id} className="problem-row locked">
                    <span className="status-ic"><Lock className="ic-sm" aria-label="未開放" /></span>
                    <span className="grow muted">{p.title}</span>
                    <span className={'tag diff-' + p.difficulty}>{p.difficulty}</span>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}

export function DrillProblemPage() {
  const { id = '' } = useParams();
  const p = getDrill(id);
  const isOpen = usePatternOpen();
  const states = useMasteryStates();
  const pt = p && getPattern(p.patternId);
  if (!p || !pt) return <div className="page">找不到題目。</div>;
  if (!isOpen(pt)) {
    return (
      <div className="page">
        這題要在學完{chapterRange(pt.requires)}後開放。<Link to="/drills">回題型特訓</Link>
      </div>
    );
  }
  const idx = drills.indexOf(p);
  const nextP = drills[idx + 1];
  const nextPt = nextP && getPattern(nextP.patternId);
  const s = states.get(p.id);

  return (
    <div className="page">
      <div className="crumbs small">
        <Link to="/drills">題型特訓</Link> / {pt.title}
      </div>
      <Playground
        exercise={p}
        mode="drill"
        header={
          <div className="pg-head">
            <span className={'tag diff-' + p.difficulty}>{p.difficulty}</span>
            <span className="tag">{pt.title}</span>
            {s?.solved && <span className="tag tag-ok"><CheckCircle2 className="ic-sm" aria-hidden />已解</span>}
            <h3>{p.title}</h3>
          </div>
        }
        extraInfo={
          <>
            <div className="lc-ref small">
              <ExternalLink className="ic-sm" aria-hidden />
              <span className="muted">LeetCode 對應題：</span>
              {p.leetcodeRef}
            </div>
            <details className="drill-template inline">
              <summary>
                <ChevronDown className="ic-sm" aria-hidden /> 解題模板：{pt.title}
              </summary>
              <Markdown text={pt.template} />
            </details>
          </>
        }
        onGraded={(g, sql) => recordDrill(p.id, p.title, g.pass, sql)}
      />
      {nextP && nextPt && isOpen(nextPt) && (
        <div className="chapter-foot">
          <span />
          <Link to={`/drills/${nextP.id}`}>下一題：{nextP.title} <ArrowRight className="ic-sm" aria-hidden /></Link>
        </div>
      )}
    </div>
  );
}

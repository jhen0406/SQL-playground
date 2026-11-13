import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Exercise } from '../content/types';
import { getDataset } from '../content';
import { runSql } from '../db/engine';
import type { RunOutput } from '../db/sandbox';
import { buildSetup, gradeExercise, hasHiddenCase, type GradeResult } from '../grading/grade';
import { aiAvailable, requestAiReview } from '../grading/aiReview';
import { Markdown } from '../lib/markdown';
import { mentionedColumns, tablesUsed } from '../lib/schemaHints';
import { loadDraft, saveDraft, recordSubmission, attachAiFeedback } from '../store/progress';
import { db, useLive } from '../store/db';
import { ResultTable } from './ResultTable';
import { SchemaPanel, useTables } from './SchemaPanel';
import { SqlEditor } from './SqlEditor';
import { BookOpenCheck, Bot, CheckCircle2, Database, Eye, Lightbulb, Loader2, Lock, Play, RotateCcw, Send, Terminal, XCircle } from 'lucide-react';

export type PlaygroundMode = 'practice' | 'review' | 'mastery';

interface Props {
  exercise: Exercise;
  mode: PlaygroundMode;
  /** 題目上方的標題列（難度、標籤…） */
  header?: ReactNode;
  /** 題目敘述下方的額外內容（例如 LeetCode 對照） */
  extraInfo?: ReactNode;
  /** 每次提交判題完成後呼叫 */
  onGraded?: (g: GradeResult, sql: string) => void | Promise<void>;
}

type OutTab = 'run' | 'grade' | 'ai';
type LeftTab = 'desc' | 'subs';
const SPLIT_KEY = 'sqlpg.splitRatio';
const clampSplit = (v: number) => Math.min(80, Math.max(20, Math.round(v)));

const STARTER = '-- 在這裡輸入你的 SQL\n-- Ctrl+Enter 執行、Ctrl+Shift+Enter 提交\n\n';

export function Playground({ exercise, mode, header, extraInfo, onGraded }: Props) {
  const ds = getDataset(exercise);
  const draftKey = `${mode}:${exercise.id}`;
  const [sql, setSql] = useState<string>('');
  const [loaded, setLoaded] = useState(false);
  const [leftTab, setLeftTab] = useState<LeftTab>('desc');
  const [outTab, setOutTab] = useState<OutTab>('run');
  const [running, setRunning] = useState<'run' | 'submit' | null>(null);
  const [runOut, setRunOut] = useState<RunOutput | null>(null);
  const [grade, setGrade] = useState<GradeResult | null>(null);
  const [hintLevel, setHintLevel] = useState(0);
  const [showSolution, setShowSolution] = useState(false);
  const [ai, setAi] = useState<{ status: 'idle' | 'loading' | 'done' | 'error' | 'off'; text?: string }>({ status: 'idle' });
  const [aiOn, setAiOn] = useState(false);
  const { tables } = useTables(ds, exercise);
  // 資料表面板提示：入門題標出本題用到的表；所有題目都標出題目提到的欄位
  const schemaHints = useMemo(() => {
    if (!tables) return { focus: undefined, mark: undefined };
    const allCols = [...new Set(tables.flatMap((t) => t.columns.map((c) => c.name)))];
    const used = mode === 'mastery' ? [] : tablesUsed(`${exercise.solution}
${exercise.checkQuery ?? ''}`, tables.map((t) => t.name));
    return {
      focus: used.length ? used : undefined,
      mark: mentionedColumns(`${exercise.prompt}
${exercise.expectedColumns ?? ''}`, allCols),
    };
  }, [tables, exercise, mode]);
  // 題目 / 資料表上下分割的比例（%），記在 localStorage
  const [split, setSplit] = useState(() => {
    try {
      const v = Number(localStorage.getItem(SPLIT_KEY));
      return v >= 20 && v <= 80 ? v : 45;
    } catch {
      return 45;
    }
  });
  const saveSplit = (v: number) => {
    const c = clampSplit(v);
    setSplit(c);
    try {
      localStorage.setItem(SPLIT_KEY, String(c));
    } catch {
      /* ignore */
    }
  };
  const splitRef = useRef<HTMLDivElement>(null);
  const onSplitDown = (e: React.PointerEvent) => {
    e.preventDefault();
    const el = splitRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const move = (ev: PointerEvent) => saveSplit(((ev.clientY - rect.top) / rect.height) * 100);
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      document.body.classList.remove('is-resizing');
    };
    document.body.classList.add('is-resizing');
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };
  const saveTimer = useRef<number>();

  const subs = useLive(() => db.submissions.where('exerciseId').equals(exercise.id).reverse().sortBy('ts'), [exercise.id], []);
  const submitted = (subs?.length ?? 0) > 0;

  useEffect(() => {
    let alive = true;
    setLoaded(false);
    setRunOut(null);
    setGrade(null);
    setHintLevel(0);
    setShowSolution(false);
    setAi({ status: 'idle' });
    setOutTab('run');
    setLeftTab('desc');
    loadDraft(draftKey).then((d) => {
      if (!alive) return;
      setSql(d ?? STARTER);
      setLoaded(true);
    });
    aiAvailable().then((v) => alive && setAiOn(v));
    return () => {
      alive = false;
    };
  }, [draftKey]);

  const onChange = (v: string) => {
    setSql(v);
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => void saveDraft(draftKey, v), 400);
  };

  const schemaText = useMemo(
    () => (tables ?? []).map((t) => `${t.name}(${t.columns.map((c) => `${c.name} ${c.type}${c.pk ? ' PK' : ''}`).join(', ')})`).join('\n'),
    [tables],
  );

  const doRun = useCallback(async () => {
    if (running) return;
    setRunning('run');
    setOutTab('run');
    const out = await runSql({ setupSql: buildSetup(ds, exercise, false), sql, maxRows: 500 });
    setRunOut(out);
    setRunning(null);
  }, [running, ds, exercise, sql]);

  const doSubmit = useCallback(async () => {
    if (running) return;
    setRunning('submit');
    setOutTab('grade');
    const g = await gradeExercise(runSql, ds, exercise, sql);
    setGrade(g);
    const subId = await recordSubmission(exercise.id, sql, g.pass, g.summary);
    await onGraded?.(g, sql);
    setRunning(null);
    if (g.pass && mode !== 'mastery') setShowSolution(true);
    if (mode === 'mastery') {
      setShowSolution(true);
      if (aiOn) {
        setAi({ status: 'loading' });
        setOutTab('ai');
        try {
          const text = await requestAiReview({ exercise, schemaText, userSql: sql, grade: g });
          setAi({ status: 'done', text });
          await attachAiFeedback(subId, text);
        } catch (e) {
          setAi({ status: 'error', text: (e as Error).message });
        }
      } else {
        setAi({ status: 'off' });
      }
    }
  }, [running, ds, exercise, sql, onGraded, mode, aiOn, schemaText]);

  const restoreSubmission = (s: string) => {
    onChange(s);
  };

  return (
    <div className="pg">
      <section className="pg-left card">
        {header}
        <div className="tabs" role="tablist">
          <button role="tab" aria-selected={leftTab === 'desc'} className={leftTab === 'desc' ? 'on' : ''} onClick={() => setLeftTab('desc')}>
            題目
          </button>
          <button role="tab" aria-selected={leftTab === 'subs'} className={leftTab === 'subs' ? 'on' : ''} onClick={() => setLeftTab('subs')}>
            提交紀錄{subs && subs.length ? `（${subs.length}）` : ''}
          </button>
        </div>
        {leftTab === 'desc' ? (
          <div className="pg-split-wrap" ref={splitRef} style={{ ['--split' as string]: `${split}%` }}>
            <div className="pg-q">
              <Markdown text={exercise.prompt} />
              {exercise.expectedColumns && (
                <p className="small">
                  <span className="muted">輸出欄位：</span>
                  <code>{exercise.expectedColumns}</code>
                  {exercise.strictColumns && <span className="badge">欄名需一致</span>}
                  {exercise.orderMatters && <span className="badge">需依指定順序</span>}
                </p>
              )}
              {exercise.checkQuery && <p className="small muted">這是修改資料／結構的題目：判題時會在你的 SQL 執行完後檢查資料表的最終狀態。</p>}
              {extraInfo}
              {exercise.hints.length > 0 && (
                <div className="hints">
                  {exercise.hints.slice(0, hintLevel).map((h, i) => (
                    <div key={i} className="hint">
                      <span className="hint-n">提示 {i + 1}</span> <Markdown text={h} />
                    </div>
                  ))}
                  {hintLevel < exercise.hints.length && (
                    <button className="btn btn-ghost btn-sm" onClick={() => setHintLevel(hintLevel + 1)}>
                      <Lightbulb className="ic-sm" aria-hidden /> {hintLevel === 0 ? '給我一點提示' : '再給一個提示'}（{hintLevel}/{exercise.hints.length}）
                    </button>
                  )}
                </div>
              )}
              <SolutionBox exercise={exercise} show={showSolution} canReveal={submitted} onReveal={() => setShowSolution(true)} mode={mode} />
            </div>
            <div
              className="pg-split"
              role="separator"
              aria-orientation="horizontal"
              aria-label="調整題目與資料表的高度"
              aria-valuemin={20}
              aria-valuemax={80}
              aria-valuenow={split}
              tabIndex={0}
              onPointerDown={onSplitDown}
              onKeyDown={(e) => {
                if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  saveSplit(split - 5);
                } else if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  saveSplit(split + 5);
                }
              }}
            />
            <div className="pg-schema">
              <div className="pg-schema-head">
                <Database className="ic-sm" aria-hidden />
                <strong>資料表</strong>
                <span className="muted small" title={ds.description}>{ds.name}</span>
              </div>
              <SchemaPanel ds={ds} ex={exercise} focus={schemaHints.focus} mark={schemaHints.mark} />
            </div>
          </div>
        ) : (
        <div className="pg-left-body">
          {leftTab === 'subs' && (
            <div className="subs">
              {!subs?.length && <p className="muted">還沒有提交紀錄。</p>}
              {subs?.map((s) => (
                <details key={s.id} className="sub">
                  <summary>
                    <span className={'inline-ic ' + (s.pass ? 'ok' : 'bad')}>{s.pass ? <CheckCircle2 className="ic-sm" aria-hidden /> : <XCircle className="ic-sm" aria-hidden />}{s.pass ? '通過' : '未通過'}</span>
                    <span className="muted small">{new Date(s.ts).toLocaleString('zh-TW')}</span>
                  </summary>
                  <pre className="md-code">
                    <code>{s.sql}</code>
                  </pre>
                  <p className="small">{s.summary}</p>
                  {s.aiFeedback && (
                    <details>
                      <summary className="small">AI 批改紀錄</summary>
                      <Markdown text={s.aiFeedback} />
                    </details>
                  )}
                  <button className="btn btn-ghost btn-sm" onClick={() => restoreSubmission(s.sql)}>
                    載入這份 SQL 到編輯器
                  </button>
                </details>
              ))}
            </div>
          )}
        </div>
        )}
      </section>

      <section className="pg-right">
        <div className="card pg-editor">
          <div className="pg-toolbar">
            <span className="engine-chip"><span className="live" aria-hidden />PostgreSQL 16 · {ds.name}</span>
            <div className="spacer" />
            <button className="btn btn-ghost btn-sm" onClick={() => onChange(STARTER)} title="清空編輯器">
              <RotateCcw className="ic-sm" aria-hidden />
              重置
            </button>
            <button className="btn btn-secondary" onClick={doRun} title="執行（Ctrl+Enter）" disabled={!!running || !loaded}>
              {running === 'run' ? <Loader2 className="ic-sm spin" aria-hidden /> : <Play className="ic-sm" aria-hidden />}
              {running === 'run' ? '執行中' : '執行'}
              
            </button>
            <button className="btn btn-primary" onClick={doSubmit} title="提交（Ctrl+Shift+Enter）" disabled={!!running || !loaded}>
              {running === 'submit' ? <Loader2 className="ic-sm spin" aria-hidden /> : <Send className="ic-sm" aria-hidden />}
              {running === 'submit' ? '判題中' : '提交'}
            </button>
          </div>
          {loaded ? <SqlEditor value={sql} onChange={onChange} onRun={doRun} onSubmit={doSubmit} height={280} /> : <div style={{ height: 280 }} className="muted u-center">載入中…</div>}
        </div>

        <div className="card pg-output">
          <div className="tabs" role="tablist">
            <button role="tab" aria-selected={outTab === 'run'} className={outTab === 'run' ? 'on' : ''} onClick={() => setOutTab('run')}>
              執行結果
            </button>
            <button role="tab" aria-selected={outTab === 'grade'} className={outTab === 'grade' ? 'on' : ''} onClick={() => setOutTab('grade')}>
              判題結果
              {grade && <span className={grade.pass ? 'dot ok' : 'dot bad'} />}
            </button>
            {mode === 'mastery' && (
              <button role="tab" aria-selected={outTab === 'ai'} className={outTab === 'ai' ? 'on' : ''} onClick={() => setOutTab('ai')}>
                AI 批改
              </button>
            )}
          </div>
          <div className="pg-output-body">
            {outTab === 'run' && <RunView out={runOut} running={running === 'run'} />}
            {outTab === 'grade' && <GradeView grade={grade} running={running === 'submit'} hidden={hasHiddenCase(ds, exercise)} />}
            {outTab === 'ai' && <AiView state={ai} />}
          </div>
        </div>
      </section>
    </div>
  );
}

function RunView({ out, running }: { out: RunOutput | null; running: boolean }) {
  if (running) return <Empty icon={<Loader2 className="ic-lg spin" aria-hidden />} text="執行中…" />;
  if (!out) return <Empty icon={<Terminal className="ic-lg" aria-hidden />} text="按「執行」在範例資料上試跑你的 SQL（不會判對錯），準備好再按「提交」。" />;
  if (!out.ok) return <div className="alert alert-bad mono pre">{out.error}</div>;
  return (
    <div>
      <div className="muted small">
        執行成功 · {out.durationMs.toFixed(1)} ms{out.statements > 1 ? ` · ${out.statements} 個指令（顯示最後一個查詢結果）` : ''}
      </div>
      {out.result ? <ResultTable result={out.result} /> : <div className="muted">沒有結果。</div>}
    </div>
  );
}

function GradeView({ grade, running, hidden }: { grade: GradeResult | null; running: boolean; hidden: boolean }) {
  if (running) return <div className="muted">判題中：在範例測資{hidden ? '與隱藏測資' : ''}上執行你的 SQL 與標準解並比對結果…</div>;
  if (!grade) return <Empty icon={<BookOpenCheck className="ic-lg" aria-hidden />} text="提交後會在這裡顯示判題結果：範例測資與隱藏測資都要通過。" />;
  const bad = grade.cases.find((c) => !c.pass);
  return (
    <div className="grade">
      <div className={'verdict ' + (grade.pass ? 'ok' : 'bad')}>
        <span className="verdict-main">
          {grade.pass ? <CheckCircle2 className="ic-lg" aria-hidden /> : <XCircle className="ic-lg" aria-hidden />}
          {grade.pass ? '答案正確' : bad?.error ? '執行錯誤' : '答案錯誤'}
        </span>
        <span className="cases">
          {grade.cases.map((c) => (
            <span key={c.name} className={'case ' + (c.pass ? 'ok' : 'bad')}>
              {c.pass ? <CheckCircle2 className="ic-sm" aria-hidden /> : <XCircle className="ic-sm" aria-hidden />} {c.name}
            </span>
          ))}
        </span>
      </div>
      {grade.pass && <p className="muted small">所有測資通過！左側「題目」頁已顯示參考解答，可以比較你的寫法。</p>}
      {bad && (
        <>
          {bad.error ? (
            <div className="alert alert-bad mono pre">{bad.error}</div>
          ) : (
            <>
              <div className="alert alert-warn">
                {bad.hidden && <strong>隱藏測資未通過：</strong>}
                {bad.compare?.reason}
              </div>
              <div className="diff">
                <div>
                  <h4>你的輸出</h4>
                  {bad.user ? <ResultTable result={bad.user} highlight={bad.compare?.mismatchedRows?.user} maxHeight={260} /> : <div className="muted">(無)</div>}
                </div>
                <div>
                  <h4>預期輸出</h4>
                  {bad.expected && <ResultTable result={bad.expected} highlight={bad.compare?.mismatchedRows?.expected} maxHeight={260} />}
                </div>
              </div>
              <p className="muted small">標示紅色的列代表在另一邊找不到相同的列。</p>
            </>
          )}
        </>
      )}
    </div>
  );
}

function AiView({ state }: { state: { status: string; text?: string } }) {
  if (state.status === 'idle') return <Empty icon={<Bot className="ic-lg" aria-hidden />} text="提交後，AI 會解釋錯誤、展示更好的解法並說明差異。" />;
  if (state.status === 'loading') return <Empty icon={<Loader2 className="ic-lg spin" aria-hidden />} text="AI 正在批改你的查詢…（約 10–30 秒）" />;
  if (state.status === 'off')
    return (
      <div className="alert alert-info">
        尚未設定 AI 批改（後端沒有 <code>ANTHROPIC_API_KEY</code>）。目前已在左側顯示內建的參考解答與常見錯誤。設定方式請見 README。
      </div>
    );
  if (state.status === 'error') return <div className="alert alert-bad">{state.text}</div>;
  return <Markdown text={state.text ?? ''} className="ai" />;
}

function SolutionBox({ exercise, show, canReveal, onReveal, mode }: { exercise: Exercise; show: boolean; canReveal: boolean; onReveal: () => void; mode: PlaygroundMode }) {
  if (!show) {
    if (!canReveal) return <p className="muted small solution-locked"><Lock className="ic-sm" aria-hidden /> 參考解答會在你提交後開放。</p>;
    return (
      <button
        className="btn btn-ghost btn-sm"
        onClick={() => {
          if (confirm('確定要看參考解答嗎？建議先多試幾次或看提示。')) onReveal();
        }}
      >
        <Eye className="ic-sm" aria-hidden /> 看參考解答
      </button>
    );
  }
  return (
    <div className="solution">
      <h4>參考解答</h4>
      <pre className="md-code">
        <code>{exercise.solution}</code>
      </pre>
      {exercise.explanation && <Markdown text={exercise.explanation} />}
      {exercise.commonMistakes && exercise.commonMistakes.length > 0 && (
        <>
          <h4>常見錯誤</h4>
          <ul>
            {exercise.commonMistakes.map((m, i) => (
              <li key={i}>
                <Markdown text={m} />
              </li>
            ))}
          </ul>
        </>
      )}
      {mode === 'mastery' && <p className="muted small">寫法不只一種：結果正確即可。AI 批改分頁會針對你的寫法說明差異。</p>}
    </div>
  );
}

function Empty({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <div className="empty-state">
      {icon}
      <span className="small">{text}</span>
    </div>
  );
}

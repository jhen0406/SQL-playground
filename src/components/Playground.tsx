import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Exercise } from '../content/types';
import { getDataset } from '../content';
import { runSql } from '../db/engine';
import type { RunOutput } from '../db/sandbox';
import { buildSetup, effectiveSql, gradeExercise, hasHiddenCase, type GradeResult } from '../grading/grade';
import { aiAvailable, requestAiReview } from '../grading/aiReview';
import { Markdown } from '../lib/markdown';
import { loadDraft, saveDraft, recordSubmission, attachAiFeedback } from '../store/progress';
import { db, useLive } from '../store/db';
import { ResultTable } from './ResultTable';
import { SchemaPanel, useTables } from './SchemaPanel';
import { SqlEditor } from './SqlEditor';
import { BookOpenCheck, Bot, CheckCircle2, Database, Eye, Lightbulb, Loader2, Lock, Play, RotateCcw, Send, Terminal, XCircle } from 'lucide-react';

export type PlaygroundMode = 'practice' | 'review' | 'mastery' | 'drill';

/** 精熟題與題型特訓：提交後即開放解答，並提供 AI 批改 */
const isChallenge = (m: PlaygroundMode) => m === 'mastery' || m === 'drill';

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

const STARTER = '-- 在這裡輸入你的 SQL\n-- Ctrl+Enter 執行、Ctrl+Shift+Enter 提交\n\n';
/** 表單輸入題的起始內容：一般使用者會輸入的值 */
const INPUT_STARTER = 'Alice';

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
      setSql(d ?? (exercise.inputTemplate ? INPUT_STARTER : STARTER));
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
    const out = await runSql({ setupSql: buildSetup(ds, exercise, false), sql: effectiveSql(exercise, sql), maxRows: 500 });
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
    if (g.pass && !isChallenge(mode)) setShowSolution(true);
    if (isChallenge(mode)) {
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
          <div className="pg-desc">
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
            <div className="pg-schema">
              <div className="pg-schema-head">
                <Database className="ic-sm" aria-hidden />
                <strong>資料表</strong>
                <span className="muted small" title={ds.description}>{ds.name}</span>
              </div>
              <SchemaPanel ds={ds} ex={exercise} />
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
            <button className="btn btn-ghost btn-sm" onClick={() => onChange(exercise.inputTemplate ? INPUT_STARTER : STARTER)} title="清空編輯器">
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
          {exercise.inputTemplate && (
            <div className="input-tpl">
              <p className="small muted">這題模擬一個<strong>用字串拼接 SQL</strong> 的網站。你在下方輸入的是「輸入框的內容」，程式會把它原封不動放進 <code>{'{{input}}'}</code>：</p>
              <pre className="md-code"><code>{exercise.inputTemplate}</code></pre>
            </div>
          )}
          {loaded ? <SqlEditor value={sql} onChange={onChange} onRun={doRun} onSubmit={doSubmit} height={exercise.inputTemplate ? 120 : 280} plain={!!exercise.inputTemplate} /> : <div style={{ height: 280 }} className="muted u-center">載入中…</div>}
          {exercise.inputTemplate && loaded && (
            <div className="input-tpl">
              <p className="small muted">實際送進資料庫的 SQL：</p>
              <pre className="md-code"><code>{effectiveSql(exercise, sql)}</code></pre>
            </div>
          )}
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
            {isChallenge(mode) && (
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
      {out.rolledBack && <div className="alert alert-warn small">交易沒有 COMMIT，執行結束時已自動 ROLLBACK：剛才的改動都不會保留。</div>}
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

type Dialect = 'pg' | 'mysql';
const DIALECT_KEY = 'sqlpg.solutionDialect';
function readDialect(): Dialect {
  try {
    return localStorage.getItem(DIALECT_KEY) === 'mysql' ? 'mysql' : 'pg';
  } catch {
    return 'pg';
  }
}

function SolutionBox({ exercise, show, canReveal, onReveal, mode }: { exercise: Exercise; show: boolean; canReveal: boolean; onReveal: () => void; mode: PlaygroundMode }) {
  const [dialect, setDialect] = useState<Dialect>(readDialect);
  const pickDialect = (d: Dialect) => {
    setDialect(d);
    try {
      localStorage.setItem(DIALECT_KEY, d);
    } catch {
      /* 無痕模式等情況存不了，不影響使用 */
    }
  };
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
      <div className="solution-head">
        <h4>{exercise.inputTemplate ? '參考輸入' : '參考解答'}</h4>
        <div className="seg seg-sm" role="tablist" aria-label="SQL 方言">
          {(['pg', 'mysql'] as Dialect[]).map((d) => (
            <button key={d} role="tab" aria-selected={dialect === d} className={dialect === d ? 'on' : ''} onClick={() => pickDialect(d)}>
              {d === 'pg' ? 'PostgreSQL' : 'MySQL'}
            </button>
          ))}
        </div>
      </div>
      {dialect === 'pg' || exercise.mysql ? (
        <pre className="md-code">
          <code>{dialect === 'mysql' ? exercise.mysql : exercise.solution}</code>
        </pre>
      ) : (
        <p className="muted small">MySQL 的寫法和 PostgreSQL 相同，可以直接用在 LeetCode。</p>
      )}
      {dialect === 'mysql' && exercise.mysqlNote && <p className="small mysql-note">{exercise.mysqlNote}</p>}
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
      {isChallenge(mode) && <p className="muted small">寫法不只一種：結果正確即可。AI 批改分頁會針對你的寫法說明差異。</p>}
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

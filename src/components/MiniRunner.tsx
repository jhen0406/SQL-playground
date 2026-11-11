import { useState } from 'react';
import type { Dataset } from '../content/types';
import { runSql } from '../db/engine';
import type { RunOutput } from '../db/sandbox';
import { buildSetup } from '../grading/grade';
import { ResultTable } from './ResultTable';
import { SqlEditor } from './SqlEditor';
import { Loader2, Play, SquareTerminal } from 'lucide-react';

/** 課程中的「可執行範例」：可以修改後再執行。 */
export function MiniRunner({ ds, initialSql, title, explain }: { ds: Dataset; initialSql: string; title: string; explain: string }) {
  const [sql, setSql] = useState(initialSql);
  const [out, setOut] = useState<RunOutput | null>(null);
  const [busy, setBusy] = useState(false);
  const lines = Math.min(12, Math.max(3, sql.split('\n').length + 1));

  const run = async () => {
    setBusy(true);
    setOut(await runSql({ setupSql: buildSetup(ds, {}, false), sql, maxRows: 200 }));
    setBusy(false);
  };

  return (
    <div className="mini">
      <div className="mini-head">
        <strong>
          <SquareTerminal className="ic-sm" aria-hidden />
          {title}
        </strong>
        <div className="spacer" />
        {sql !== initialSql && (
          <button className="btn btn-ghost btn-sm" onClick={() => setSql(initialSql)}>
            還原
          </button>
        )}
        <button className="btn btn-secondary btn-sm" onClick={run} disabled={busy}>
          {busy ? <Loader2 className="ic-sm spin" aria-hidden /> : <Play className="ic-sm" aria-hidden />}
          {busy ? '執行中' : '執行'}
        </button>
      </div>
      <SqlEditor value={sql} onChange={setSql} onRun={run} height={lines * 21 + 20} />
      <p className="small muted mini-explain">{explain}</p>
      {out && (
        <div className="mini-out">
          {out.ok ? (
            out.result ? <ResultTable result={out.result} maxHeight={240} /> : <div className="muted small">已執行。</div>
          ) : (
            <div className="alert alert-bad mono pre">{out.error}</div>
          )}
        </div>
      )}
    </div>
  );
}

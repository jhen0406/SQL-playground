import { useEffect, useState } from 'react';
import type { Dataset, Exercise } from '../content/types';
import type { TableInfo } from '../db/sandbox';
import { describeSetup } from '../db/engine';
import { buildSetup } from '../grading/grade';
import { ResultTable } from './ResultTable';
import { setEditorIdentifiers } from './SqlEditor';
import { ChevronDown, ChevronRight, KeyRound, Table2 } from 'lucide-react';

const cache = new Map<string, TableInfo[]>();

/** information_schema 的型別名稱很長，顯示成常見寫法（滑鼠移上去可看完整名稱） */
const TYPE_SHORT: Record<string, string> = {
  'character varying': 'varchar',
  character: 'char',
  'timestamp without time zone': 'timestamp',
  'timestamp with time zone': 'timestamptz',
  'double precision': 'double',
};
function shortType(t: string): string {
  return TYPE_SHORT[t] ?? t;
}

export function useTables(ds: Dataset, ex?: Pick<Exercise, 'extraSetupSql'>) {
  const key = ds.id + '|' + (ex?.extraSetupSql ?? '');
  const [tables, setTables] = useState<TableInfo[] | null>(cache.get(key) ?? null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    const cached = cache.get(key);
    if (cached) {
      setTables(cached);
      setEditorIdentifiers(cached.map((t) => t.name), cached.flatMap((t) => t.columns.map((c) => c.name)));
      return;
    }
    setTables(null);
    describeSetup(buildSetup(ds, ex ?? {}, false))
      .then((t) => {
        cache.set(key, t);
        if (!alive) return;
        setTables(t);
        setEditorIdentifiers(t.map((x) => x.name), t.flatMap((x) => x.columns.map((c) => c.name)));
      })
      .catch((e) => alive && setError(String(e.message ?? e)));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return { tables, error };
}

export function SchemaPanel({ ds, ex, compact }: { ds: Dataset; ex?: Pick<Exercise, 'extraSetupSql'>; compact?: boolean }) {
  const { tables, error } = useTables(ds, ex);
  const [open, setOpen] = useState<string | null>(null);
  if (error) return <div className="alert alert-bad">資料庫載入失敗：{error}</div>;
  if (!tables) return <div className="muted">正在啟動 PostgreSQL…（第一次載入約需數秒）</div>;
  return (
    <div className="schema">
      {!compact && <p className="muted small">{ds.description}</p>}
      {tables.map((t) => (
        <div key={t.name} className="schema-table">
          <button className="schema-head" onClick={() => setOpen(open === t.name ? null : t.name)} aria-expanded={open === t.name}>
            <Table2 className="ic-sm" aria-hidden />
            <span className="schema-name">{t.name}</span>
            <span className="muted small">{t.rowCount} 列</span>
            <span className="chev">{open === t.name ? <ChevronDown className="ic-sm" aria-hidden /> : <ChevronRight className="ic-sm" aria-hidden />}</span>
          </button>
          <table className="schema-cols">
            <tbody>
              {t.columns.map((c) => (
                <tr key={c.name}>
                  <td className="mono">
                    {c.name}
                    {c.pk && <span className="badge badge-key inline-ic" title="Primary Key"><KeyRound size={11} aria-hidden />PK</span>}
                  </td>
                  <td className="mono muted" title={c.type}>{shortType(c.type)}</td>
                  <td className="muted small">{c.nullable ? '' : 'NOT NULL'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {open === t.name && (
            <div className="schema-sample">
              <ResultTable result={t.sample} maxHeight={260} caption={t.rowCount > t.sample.rows.length ? `範例資料（前 ${t.sample.rows.length} 列，共 ${t.rowCount} 列）` : '範例資料'} />
            </div>
          )}
        </div>
      ))}
      <p className="muted small">點表名可展開範例資料。判題時還會用一份你看不到的「隱藏測資」再測一次，請不要針對範例資料寫死答案。</p>
    </div>
  );
}

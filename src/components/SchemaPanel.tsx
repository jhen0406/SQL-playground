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

interface SchemaPanelProps {
  ds: Dataset;
  ex?: Pick<Exercise, 'extraSetupSql'>;
  /** 課程頁旁邊的精簡版：點表名展開範例資料（維持原本行為） */
  compact?: boolean;
  /** 題目提到的欄位：以青綠粗體 + 星號標示 */
  mark?: Set<string>;
}

export function SchemaPanel({ ds, ex, compact, mark }: SchemaPanelProps) {
  const { tables, error } = useTables(ds, ex);
  // compact：哪張表展開了範例資料；一般模式：哪些表收合、哪些表打開範例資料
  const [open, setOpen] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [samples, setSamples] = useState<Set<string>>(new Set());
  useEffect(() => {
    // 換題目時重設：全部展開、範例資料收起
    setCollapsed(new Set());
    setSamples(new Set());
  }, [tables]);

  if (error) return <div className="alert alert-bad">資料庫載入失敗：{error}</div>;
  if (!tables) return <div className="muted">正在啟動 PostgreSQL…（第一次載入約需數秒）</div>;

  const toggle = (set: Set<string>, name: string) => {
    const next = new Set(set);
    if (next.has(name)) next.delete(name);
    else next.add(name);
    return next;
  };

  const cols = (t: (typeof tables)[number]) => (
    <table className="schema-cols">
      <tbody>
        {t.columns.map((c) => {
          const marked = mark?.has(c.name);
          return (
            <tr key={c.name} className={marked ? 'col-mark' : undefined}>
              <td className="mono" title={marked ? '題目有提到' : undefined}>
                {marked && <span className="col-star" aria-label="題目有提到">★</span>}
                {c.name}
                {c.pk && <span className="badge badge-key inline-ic" title="Primary Key"><KeyRound size={11} aria-hidden />PK</span>}
              </td>
              <td className="mono muted" title={c.type}>{shortType(c.type)}</td>
              <td className="muted small">{c.nullable ? '' : 'NOT NULL'}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
  const sample = (t: (typeof tables)[number]) => (
    <div className="schema-sample">
      <ResultTable result={t.sample} maxHeight={260} caption={t.rowCount > t.sample.rows.length ? `範例資料（前 ${t.sample.rows.length} 列，共 ${t.rowCount} 列）` : '範例資料'} />
    </div>
  );

  if (compact) {
    return (
      <div className="schema">
        {tables.map((t) => (
          <div key={t.name} className="schema-table">
            <button className="schema-head" onClick={() => setOpen(open === t.name ? null : t.name)} aria-expanded={open === t.name}>
              <Table2 className="ic-sm" aria-hidden />
              <span className="schema-name">{t.name}</span>
              <span className="muted small">{t.rowCount} 列</span>
              <span className="chev">{open === t.name ? <ChevronDown className="ic-sm" aria-hidden /> : <ChevronRight className="ic-sm" aria-hidden />}</span>
            </button>
            {cols(t)}
            {open === t.name && sample(t)}
          </div>
        ))}
        <p className="muted small">點表名可展開範例資料。判題時還會用一份你看不到的「隱藏測資」再測一次，請不要針對範例資料寫死答案。</p>
      </div>
    );
  }

  return (
    <div className="schema">
      {tables.map((t) => {
        const isOpen = !collapsed.has(t.name);
        return (
          <div key={t.name} className="schema-table">
            <button className="schema-head" onClick={() => setCollapsed(toggle(collapsed, t.name))} aria-expanded={isOpen}>
              <span className="chev">{isOpen ? <ChevronDown className="ic-sm" aria-hidden /> : <ChevronRight className="ic-sm" aria-hidden />}</span>
              <Table2 className="ic-sm" aria-hidden />
              <span className="schema-name">{t.name}</span>
              <span className="muted small">{t.rowCount} 列</span>
            </button>
            {isOpen && (
              <>
                {cols(t)}
                <button className="btn btn-ghost btn-sm schema-toggle" onClick={() => setSamples(toggle(samples, t.name))} aria-expanded={samples.has(t.name)}>
                  {samples.has(t.name) ? <ChevronDown className="ic-sm" aria-hidden /> : <ChevronRight className="ic-sm" aria-hidden />}
                  範例資料（{t.rowCount} 列）
                </button>
                {samples.has(t.name) && sample(t)}
              </>
            )}
          </div>
        );
      })}
      <p className="muted small">判題時還會用一份你看不到的「隱藏測資」再測一次，請不要針對範例資料寫死答案。</p>
    </div>
  );
}

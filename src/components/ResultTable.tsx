import type { QueryResult } from '../db/sandbox';

export function formatCell(v: unknown): string {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'string') {
    // numeric 的長尾 0：'1.00000000000000000000' → '1.0000…' 太長，截短顯示
    if (/^-?\d+\.\d{7,}$/.test(v)) return String(Math.round(Number(v) * 1e6) / 1e6);
    return v;
  }
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

interface Props {
  result: QueryResult;
  /** 要標示為錯誤的列 */
  highlight?: number[];
  maxHeight?: number;
  caption?: string;
}

export function ResultTable({ result, highlight, maxHeight = 320, caption }: Props) {
  const hl = new Set(highlight ?? []);
  if (result.columns.length === 0) {
    return <div className="muted small">指令已執行{result.affectedRows !== undefined ? `，影響 ${result.affectedRows} 列` : ''}（沒有回傳查詢結果）。</div>;
  }
  return (
    <div className="result-wrap">
      {caption && <div className="result-caption">{caption}</div>}
      <div className="result-scroll" style={{ maxHeight }}>
        <table className="result-table">
          <thead>
            <tr>
              <th className="rownum">#</th>
              {result.columns.map((c, i) => (
                <th key={i}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {result.rows.map((r, i) => (
              <tr key={i} className={hl.has(i) ? 'row-bad' : undefined}>
                <td className="rownum">{i + 1}</td>
                {r.map((v, j) => (
                  <td key={j} className={v === null ? 'null' : typeof v === 'number' ? 'num' : undefined}>
                    {formatCell(v)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="result-foot">{result.rows.length} 列</div>
    </div>
  );
}

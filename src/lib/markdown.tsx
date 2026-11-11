import { Fragment, type ReactNode } from 'react';

/**
 * 輕量 Markdown 渲染器（內容是自己寫的，加上 AI 回覆）。
 * 支援：標題、段落、清單、引言、程式碼區塊（``` 或 ~~~）、表格、**粗體**、`行內程式碼`。
 * 不使用 dangerouslySetInnerHTML，所有文字都經 React 轉義。
 */
export function Markdown({ text, className }: { text: string; className?: string }) {
  return <div className={'md ' + (className ?? '')}>{renderBlocks(text.replace(/\r\n/g, '\n').trim())}</div>;
}

function renderBlocks(src: string): ReactNode[] {
  const lines = src.split('\n');
  const out: ReactNode[] = [];
  let i = 0;
  let key = 0;
  while (i < lines.length) {
    const line = lines[i];
    // 程式碼區塊
    const fence = /^\s*(```|~~~)\s*(\w*)\s*$/.exec(line);
    if (fence) {
      const buf: string[] = [];
      i++;
      while (i < lines.length && !new RegExp('^\\s*' + fence[1] + '\\s*$').test(lines[i])) buf.push(lines[i++]);
      i++;
      out.push(
        <pre key={key++} className="md-code">
          <code>{buf.join('\n')}</code>
        </pre>,
      );
      continue;
    }
    if (!line.trim()) {
      i++;
      continue;
    }
    const h = /^(#{1,4})\s+(.*)$/.exec(line);
    if (h) {
      const level = Math.min(h[1].length + 1, 5);
      const Tag = ('h' + level) as 'h2';
      out.push(<Tag key={key++}>{inline(h[2])}</Tag>);
      i++;
      continue;
    }
    // 表格
    if (line.trim().startsWith('|') && i + 1 < lines.length && /^\s*\|?\s*:?-{2,}/.test(lines[i + 1])) {
      const head = splitRow(line);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) rows.push(splitRow(lines[i++]));
      out.push(
        <div key={key++} className="md-table-wrap">
          <table className="md-table">
            <thead>
              <tr>{head.map((c, j) => <th key={j}>{inline(c)}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map((r, ri) => (
                <tr key={ri}>{r.map((c, j) => <td key={j}>{inline(c)}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }
    if (/^\s*>/.test(line)) {
      const buf: string[] = [];
      while (i < lines.length && /^\s*>/.test(lines[i])) buf.push(lines[i++].replace(/^\s*>\s?/, ''));
      out.push(<blockquote key={key++}>{renderBlocks(buf.join('\n'))}</blockquote>);
      continue;
    }
    if (/^\s*([-*]|\d+\.)\s+/.test(line)) {
      const ordered = /^\s*\d+\./.test(line);
      const items: string[] = [];
      while (i < lines.length && /^\s*([-*]|\d+\.)\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*([-*]|\d+\.)\s+/, ''));
        i++;
        // 續行
        while (i < lines.length && /^\s{2,}\S/.test(lines[i]) && !/^\s*([-*]|\d+\.)\s+/.test(lines[i])) {
          items[items.length - 1] += ' ' + lines[i].trim();
          i++;
        }
      }
      const L = ordered ? 'ol' : 'ul';
      out.push(<L key={key++}>{items.map((t, j) => <li key={j}>{inline(t)}</li>)}</L>);
      continue;
    }
    // 段落
    const buf: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^\s*(```|~~~|#{1,4}\s|>|[-*]\s|\d+\.\s|\|)/.test(lines[i])
    ) {
      buf.push(lines[i++]);
    }
    if (buf.length === 0) {
      buf.push(lines[i++]);
    }
    out.push(<p key={key++}>{inline(buf.join(' '))}</p>);
  }
  return out;
}

function splitRow(line: string): string[] {
  let s = line.trim();
  if (s.startsWith('|')) s = s.slice(1);
  if (s.endsWith('|')) s = s.slice(0, -1);
  // 反引號內的 | 不視為分隔
  const cells: string[] = [];
  let cur = '';
  let inCode = false;
  for (const ch of s) {
    if (ch === '`') inCode = !inCode;
    if (ch === '|' && !inCode) {
      cells.push(cur.trim());
      cur = '';
    } else cur += ch;
  }
  cells.push(cur.trim());
  return cells;
}

function inline(text: string): ReactNode {
  const parts: ReactNode[] = [];
  const re = /(`[^`]+`)|(\*\*[^*]+\*\*)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith('`')) parts.push(<code key={k++}>{tok.slice(1, -1)}</code>);
    else parts.push(<strong key={k++}>{inline(tok.slice(2, -2))}</strong>);
    last = m.index + tok.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <Fragment>{parts}</Fragment>;
}

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Highlighter as HighlighterIcon, MessageSquarePlus, X } from 'lucide-react';
import { addNote, useNotes } from '../store/progress';
import { locate, occurrenceAt } from '../lib/textMatch';

/** 不能標記的區塊：程式編輯器、執行結果、按鈕、導覽 */
const EXCLUDE = '.editor-frame, .mini-out, .mini-head, button, .step-nav, .hl-toolbar, .hl-toast';
const HL_NAME = 'sqlpg-note';
const MAX_LEN = 400;

interface TextIndex {
  nodes: Text[];
  starts: number[];
  text: string;
}

/** 把容器內可標記的文字節點串成一個字串，並記住每個節點的起點 */
function buildIndex(root: HTMLElement): TextIndex {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => (n.parentElement?.closest(EXCLUDE) && root.contains(n.parentElement.closest(EXCLUDE)) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
  });
  const nodes: Text[] = [];
  const starts: number[] = [];
  let text = '';
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    nodes.push(n as Text);
    starts.push(text.length);
    text += (n as Text).data;
  }
  return { nodes, starts, text };
}

function makeRange(idx: TextIndex, start: number, end: number): Range | null {
  let s = -1;
  let e = -1;
  for (let i = 0; i < idx.nodes.length; i++) {
    const a = idx.starts[i];
    const b = a + idx.nodes[i].data.length;
    if (s < 0 && start >= a && start < b) s = i;
    if (end > a && end <= b) {
      e = i;
      break;
    }
  }
  if (s < 0 || e < 0) return null;
  const r = document.createRange();
  r.setStart(idx.nodes[s], start - idx.starts[s]);
  r.setEnd(idx.nodes[e], end - idx.starts[e]);
  return r;
}

/** 目前的選取範圍 → 容器文字中的 [start, end) */
function selectionOffsets(root: HTMLElement, idx: TextIndex): { start: number; end: number } | null {
  const sel = window.getSelection();
  if (!sel || sel.isCollapsed || sel.rangeCount === 0) return null;
  const range = sel.getRangeAt(0);
  if (!root.contains(range.commonAncestorContainer)) return null;
  let start = -1;
  let end = -1;
  idx.nodes.forEach((node, i) => {
    if (!range.intersectsNode(node)) return;
    const ls = node === range.startContainer ? range.startOffset : 0;
    const le = node === range.endContainer ? range.endOffset : node.data.length;
    if (le <= ls) return;
    if (start < 0) start = idx.starts[i] + ls;
    end = idx.starts[i] + le;
  });
  if (start < 0 || end <= start) return null;
  // 去掉頭尾空白
  while (start < end && /\s/.test(idx.text[start])) start++;
  while (end > start && /\s/.test(idx.text[end - 1])) end--;
  return end > start ? { start, end } : null;
}

const supportsHighlight = () => typeof CSS !== 'undefined' && 'highlights' in CSS && typeof (window as unknown as { Highlight?: unknown }).Highlight === 'function';

interface Pending {
  text: string;
  occurrence: number;
  x: number;
  y: number;
  below: boolean;
}

/**
 * 包住課程內容：反白文字後出現「標記重點」，已標記的文字以底色顯示
 * （使用 CSS Custom Highlight API，不改動 React 管理的 DOM）。
 */
export function Highlighter({ chapterId, step, children }: { chapterId: string; step: number; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const allNotes = useNotes(chapterId);
  const notes = allNotes.filter((n) => n.step === step);
  const [pending, setPending] = useState<Pending | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [comment, setComment] = useState('');
  const [toast, setToast] = useState(false);
  const expandedRef = useRef(false);
  expandedRef.current = expanded;

  // 畫出已標記的文字
  const notesKey = notes.map((n) => `${n.id}:${n.occurrence}:${n.text}`).join('|');
  const paint = useCallback(() => {
    const root = ref.current;
    if (!root || !supportsHighlight()) return;
    const idx = buildIndex(root);
    const ranges = notes
      .map((n) => {
        const at = locate(idx.text, n.text, n.occurrence);
        return at < 0 ? null : makeRange(idx, at, at + n.text.length);
      })
      .filter((r): r is Range => !!r);
    const H = (window as unknown as { Highlight: new (...r: Range[]) => unknown }).Highlight;
    (CSS as unknown as { highlights: Map<string, unknown> }).highlights.set(HL_NAME, new H(...ranges));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notesKey]);

  useLayoutEffect(() => {
    paint();
  });
  useEffect(
    () => () => {
      if (supportsHighlight()) (CSS as unknown as { highlights: Map<string, unknown> }).highlights.delete(HL_NAME);
    },
    [],
  );

  // 偵測反白
  useEffect(() => {
    let timer = 0;
    const onChange = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        if (expandedRef.current) return;
        const root = ref.current;
        if (!root) return;
        const idx = buildIndex(root);
        const off = selectionOffsets(root, idx);
        if (!off || off.end - off.start > MAX_LEN) {
          setPending(null);
          return;
        }
        const text = idx.text.slice(off.start, off.end);
        const rect = window.getSelection()!.getRangeAt(0).getBoundingClientRect();
        if (rect.bottom < 0 || rect.top > window.innerHeight) {
          setPending(null);
          return;
        }
        const below = rect.top < 70;
        setPending({
          text,
          occurrence: occurrenceAt(idx.text, text, off.start),
          x: Math.min(Math.max(rect.left + rect.width / 2, 120), window.innerWidth - 120),
          y: below ? rect.bottom + 8 : rect.top - 8,
          below,
        });
      }, 120);
    };
    // 捲動時跟著選取範圍重新定位（選取範圍捲出畫面時，浮動按鈕也會一起消失）
    document.addEventListener('selectionchange', onChange);
    window.addEventListener('scroll', onChange, true);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('selectionchange', onChange);
      window.removeEventListener('scroll', onChange, true);
    };
  }, []);

  const close = () => {
    setPending(null);
    setExpanded(false);
    setComment('');
  };

  const save = async () => {
    if (!pending) return;
    await addNote({ chapterId, step, text: pending.text, occurrence: pending.occurrence, comment: comment.trim() || undefined });
    window.getSelection()?.removeAllRanges();
    close();
    setToast(true);
    window.setTimeout(() => setToast(false), 2500);
  };

  return (
    <div ref={ref} className="hl-root">
      {children}
      {pending && (
        <div
          className={'hl-toolbar' + (pending.below ? ' below' : '')}
          style={{ left: pending.x, top: pending.y }}
          onMouseDown={(e) => {
            if (!(e.target as HTMLElement).closest('input')) e.preventDefault();
          }}
          role="dialog"
          aria-label="標記重點"
        >
          {expanded ? (
            <form
              className="hl-form"
              onSubmit={(e) => {
                e.preventDefault();
                save();
              }}
            >
              <label className="sr-only" htmlFor="hl-comment">註解（選填）</label>
              <input id="hl-comment" className="ui-input" autoFocus placeholder="寫一句提醒自己的話（選填）" value={comment} onChange={(e) => setComment(e.target.value)} maxLength={200} />
              <button type="submit" className="btn btn-primary btn-sm">儲存</button>
              <button type="button" className="btn btn-ghost btn-sm btn-icon" onClick={close} aria-label="取消">
                <X className="ic-sm" aria-hidden />
              </button>
            </form>
          ) : (
            <>
              <button className="btn btn-primary btn-sm" onClick={save}>
                <HighlighterIcon className="ic-sm" aria-hidden />
                標記重點
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => setExpanded(true)}>
                <MessageSquarePlus className="ic-sm" aria-hidden />
                加註解
              </button>
            </>
          )}
        </div>
      )}
      {toast && (
        <div className="hl-toast" role="status">
          已加到重點筆記 · <Link to="/notes">查看全部</Link>
        </div>
      )}
    </div>
  );
}

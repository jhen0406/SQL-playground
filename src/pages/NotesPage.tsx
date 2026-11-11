import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, Highlighter, NotebookPen, Pencil, Search, Trash2, X } from 'lucide-react';
import { chapters, getChapter } from '../content';
import { prettyDay } from '../lib/date';
import type { Note } from '../store/db';
import { deleteNote, updateNoteComment, useNotes } from '../store/progress';

const STEP_LABEL = ['概念說明', '範例實作'];

export function NotesPage() {
  const notes = useNotes();
  const [q, setQ] = useState('');

  const groups = useMemo(() => {
    const kw = q.trim().toLowerCase();
    const hit = (n: Note) => !kw || n.text.toLowerCase().includes(kw) || (n.comment ?? '').toLowerCase().includes(kw);
    return chapters
      .map((ch) => ({ ch, items: notes.filter((n) => n.chapterId === ch.id && hit(n)) }))
      .filter((g) => g.items.length > 0);
  }, [notes, q]);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>重點筆記</h1>
          <p className="muted">在課程內容反白文字、按「標記重點」，就會收集到這裡。複習某一章時，也會看到那一章的筆記。</p>
        </div>
        {notes.length > 0 && (
          <label className="notes-search">
            <Search className="ic-sm" aria-hidden />
            <span className="sr-only">搜尋筆記</span>
            <input className="input" type="search" placeholder="搜尋標記文字或註解" value={q} onChange={(e) => setQ(e.target.value)} />
          </label>
        )}
      </div>

      {notes.length === 0 ? (
        <div className="card empty-state">
          <NotebookPen className="ic-lg" aria-hidden />
          <strong>還沒有筆記</strong>
          <span className="small">上課時用滑鼠（或手指長按）反白一段文字，按「標記重點」就能收藏。</span>
          <Link className="btn btn-primary btn-sm" to="/learn">前往入門課程</Link>
        </div>
      ) : groups.length === 0 ? (
        <div className="card empty-state">找不到符合「{q}」的筆記。</div>
      ) : (
        groups.map(({ ch, items }) => (
          <section key={ch.id} className="card note-group">
            <div className="card-title">
              <Highlighter className="ic" aria-hidden />
              <h2>第 {ch.order} 章 · {ch.title}</h2>
              <span className="muted small">{items.length} 則</span>
            </div>
            <NoteList notes={items} showJump />
          </section>
        ))
      )}
    </div>
  );
}

/** 筆記清單（筆記頁、章節頁底部、複習頁共用） */
export function NoteList({ notes, showJump }: { notes: Note[]; showJump?: boolean }) {
  return (
    <ul className="note-list">
      {notes.map((n) => (
        <NoteItem key={n.id} note={n} showJump={showJump} />
      ))}
    </ul>
  );
}

function NoteItem({ note, showJump }: { note: Note; showJump?: boolean }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(note.comment ?? '');
  const save = async () => {
    await updateNoteComment(note.id!, draft);
    setEditing(false);
  };
  const remove = async () => {
    if (confirm('刪除這則筆記？')) await deleteNote(note.id!);
  };
  return (
    <li className="note-item">
      <blockquote className="note-quote">{note.text}</blockquote>
      {editing ? (
        <form
          className="note-edit"
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          <label className="sr-only" htmlFor={`note-c-${note.id}`}>註解</label>
          <input id={`note-c-${note.id}`} className="input" autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={200} placeholder="寫一句提醒自己的話" />
          <button type="submit" className="btn btn-primary btn-sm btn-icon" aria-label="儲存註解"><Check className="ic-sm" aria-hidden /></button>
          <button type="button" className="btn btn-ghost btn-sm btn-icon" aria-label="取消" onClick={() => { setDraft(note.comment ?? ''); setEditing(false); }}>
            <X className="ic-sm" aria-hidden />
          </button>
        </form>
      ) : (
        note.comment && <p className="note-comment">{note.comment}</p>
      )}
      <div className="note-meta small muted">
        <span>{STEP_LABEL[note.step] ?? ''} · {prettyDay(note.day)}</span>
        <span className="spacer" />
        {showJump && getChapter(note.chapterId) && (
          <Link to={`/learn/${note.chapterId}?step=${note.step}`} className="inline-ic">
            回到章節 <ArrowRight className="ic-sm" aria-hidden />
          </Link>
        )}
        {!editing && (
          <button className="btn btn-ghost btn-sm btn-icon" aria-label={note.comment ? '編輯註解' : '加註解'} title={note.comment ? '編輯註解' : '加註解'} onClick={() => setEditing(true)}>
            <Pencil className="ic-sm" aria-hidden />
          </button>
        )}
        <button className="btn btn-ghost btn-sm btn-icon" aria-label="刪除筆記" title="刪除筆記" onClick={remove}>
          <Trash2 className="ic-sm" aria-hidden />
        </button>
      </div>
    </li>
  );
}

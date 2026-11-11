import { useEffect, useRef } from 'react';
import Editor, { loader, type BeforeMount, type OnMount } from '@monaco-editor/react';
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import 'monaco-editor/esm/vs/basic-languages/sql/sql.contribution';
import 'monaco-editor/esm/vs/editor/contrib/suggest/browser/suggestController';
import 'monaco-editor/esm/vs/editor/contrib/wordHighlighter/browser/wordHighlighter';
import 'monaco-editor/esm/vs/editor/contrib/bracketMatching/browser/bracketMatching';
import 'monaco-editor/esm/vs/editor/contrib/comment/browser/comment';
import 'monaco-editor/esm/vs/editor/contrib/find/browser/findController';
import 'monaco-editor/esm/vs/editor/contrib/linesOperations/browser/linesOperations';
import 'monaco-editor/esm/vs/editor/contrib/clipboard/browser/clipboard';
import 'monaco-editor/esm/vs/editor/contrib/contextmenu/browser/contextmenu';
import 'monaco-editor/esm/vs/editor/contrib/multicursor/browser/multicursor';
import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import { useTheme } from '../lib/theme';

// 使用本機打包的 Monaco（不依賴 CDN，離線也能用）
(self as unknown as { MonacoEnvironment: unknown }).MonacoEnvironment = {
  getWorker: () => new EditorWorker(),
};
loader.config({ monaco });

const KEYWORDS = [
  'SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'NOT', 'IN', 'IS', 'NULL', 'LIKE', 'ILIKE', 'BETWEEN', 'ORDER BY', 'GROUP BY',
  'HAVING', 'LIMIT', 'OFFSET', 'DISTINCT', 'AS', 'JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'FULL JOIN', 'INNER JOIN', 'ON',
  'UNION', 'UNION ALL', 'EXISTS', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'WITH', 'RECURSIVE', 'OVER', 'PARTITION BY',
  'INSERT INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE FROM', 'CREATE TABLE', 'ALTER TABLE', 'DROP TABLE', 'CREATE VIEW',
  'CREATE INDEX', 'PRIMARY KEY', 'REFERENCES', 'DEFAULT', 'CHECK', 'UNIQUE',
  'COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'ROUND', 'COALESCE', 'NULLIF', 'CAST', 'CONCAT', 'UPPER', 'LOWER', 'LENGTH',
  'SUBSTRING', 'TRIM', 'TO_CHAR', 'DATE_TRUNC', 'EXTRACT', 'ROW_NUMBER', 'RANK', 'DENSE_RANK', 'LAG', 'LEAD',
  'STRING_AGG', 'PERCENTILE_CONT', 'INTERVAL', 'ASC', 'DESC', 'NULLS LAST',
];

// 目前題目的表名/欄位名，給自動完成使用
let currentIdents: { tables: string[]; columns: string[] } = { tables: [], columns: [] };
let providerRegistered = false;
function ensureProvider() {
  if (providerRegistered) return;
  providerRegistered = true;
  monaco.languages.registerCompletionItemProvider('sql', {
    provideCompletionItems(model, position) {
      const word = model.getWordUntilPosition(position);
      const range = { startLineNumber: position.lineNumber, endLineNumber: position.lineNumber, startColumn: word.startColumn, endColumn: word.endColumn };
      const K = monaco.languages.CompletionItemKind;
      return {
        suggestions: [
          ...currentIdents.tables.map((t) => ({ label: t, kind: K.Class, insertText: t, range, detail: 'table' })),
          ...currentIdents.columns.map((c) => ({ label: c, kind: K.Field, insertText: c, range, detail: 'column' })),
          ...KEYWORDS.map((k) => ({ label: k, kind: K.Keyword, insertText: k, range })),
        ],
      };
    },
  });
}

let themesDefined = false;
/** 與 styles.css 設計 token 一致的編輯器主題（#151 Coding Challenge 配色） */
function defineThemes(m: typeof monaco) {
  if (themesDefined) return;
  themesDefined = true;
  m.editor.defineTheme('sqlpg-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'keyword', foreground: '4ADE80', fontStyle: 'bold' },
      { token: 'operator', foreground: 'CBD5E1' },
      { token: 'string', foreground: 'FBBF24' },
      { token: 'number', foreground: '7DD3FC' },
      { token: 'comment', foreground: '64748B', fontStyle: 'italic' },
      { token: 'predefined', foreground: 'C4B5FD' },
    ],
    colors: {
      'editor.background': '#0F172A',
      'editor.lineHighlightBackground': '#131C2E',
      'editorLineNumber.foreground': '#475569',
      'editorLineNumber.activeForeground': '#94A3B8',
      'editorCursor.foreground': '#4ADE80',
      'editor.selectionBackground': '#22C55E33',
      'editorGutter.background': '#0F172A',
    },
  });
  m.editor.defineTheme('sqlpg-light', {
    base: 'vs',
    inherit: true,
    rules: [
      { token: 'keyword', foreground: '15803D', fontStyle: 'bold' },
      { token: 'string', foreground: 'B45309' },
      { token: 'number', foreground: '0369A1' },
      { token: 'comment', foreground: '64748B', fontStyle: 'italic' },
      { token: 'predefined', foreground: '7C3AED' },
    ],
    colors: {
      'editor.background': '#FFFFFF',
      'editor.lineHighlightBackground': '#F1F5F9',
      'editorLineNumber.foreground': '#94A3B8',
      'editorCursor.foreground': '#15803D',
      'editor.selectionBackground': '#22C55E2E',
    },
  });
}

export function setEditorIdentifiers(tables: string[], columns: string[]) {
  currentIdents = { tables, columns: [...new Set(columns)] };
}

interface Props {
  value: string;
  onChange: (v: string) => void;
  onRun?: () => void;
  onSubmit?: () => void;
  height?: number | string;
  readOnly?: boolean;
}

export function SqlEditor({ value, onChange, onRun, onSubmit, height = 260, readOnly }: Props) {
  const theme = useTheme();
  const runRef = useRef(onRun);
  const submitRef = useRef(onSubmit);
  useEffect(() => {
    runRef.current = onRun;
    submitRef.current = onSubmit;
  }, [onRun, onSubmit]);

  const handleBeforeMount: BeforeMount = (m) => defineThemes(m as unknown as typeof monaco);

  const handleMount: OnMount = (editor, m) => {
    ensureProvider();
    editor.addCommand(m.KeyMod.CtrlCmd | m.KeyCode.Enter, () => runRef.current?.());
    editor.addCommand(m.KeyMod.CtrlCmd | m.KeyMod.Shift | m.KeyCode.Enter, () => submitRef.current?.());
  };

  return (
    <div className="editor-frame">
      <Editor
        height={height}
        language="sql"
        theme={theme === 'dark' ? 'sqlpg-dark' : 'sqlpg-light'}
        beforeMount={handleBeforeMount}
        value={value}
        onChange={(v) => onChange(v ?? '')}
        onMount={handleMount}
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          fontFamily: "'JetBrains Mono', 'Cascadia Code', Consolas, monospace",
          lineNumbers: 'on',
          fontLigatures: false,
          scrollBeyondLastLine: false,
          wordWrap: 'on',
          tabSize: 2,
          automaticLayout: true,
          readOnly,
          renderLineHighlight: 'line',
          padding: { top: 10, bottom: 10 },
          quickSuggestions: { other: true, comments: false, strings: false },
        }}
      />
    </div>
  );
}

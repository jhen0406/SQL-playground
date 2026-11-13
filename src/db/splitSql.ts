/**
 * 把一段 SQL 切成一條一條的陳述式（以分號分隔），會略過字串、識別字、註解與 $$ 字串裡的分號。
 * 用途：含交易指令的 SQL 要逐條執行，才會和一般 SQL 工具一樣「BEGIN 之前的指令各自自動提交」。
 */
export function splitSql(sql: string): string[] {
  const out: string[] = [];
  let start = 0;
  let i = 0;
  const n = sql.length;
  while (i < n) {
    const ch = sql[i];
    const next = sql[i + 1];
    if (ch === "'" || ch === '"') {
      // 字串 / 識別字：連續兩個引號代表跳脫
      i++;
      while (i < n) {
        if (sql[i] === ch) {
          if (sql[i + 1] === ch) i += 2;
          else break;
        } else i++;
      }
      i++;
    } else if (ch === '-' && next === '-') {
      while (i < n && sql[i] !== '\n') i++;
    } else if (ch === '/' && next === '*') {
      const end = sql.indexOf('*/', i + 2);
      i = end < 0 ? n : end + 2;
    } else if (ch === '$') {
      const m = /^\$[A-Za-z_]*\$/.exec(sql.slice(i));
      if (m) {
        const end = sql.indexOf(m[0], i + m[0].length);
        i = end < 0 ? n : end + m[0].length;
      } else i++;
    } else if (ch === ';') {
      out.push(sql.slice(start, i + 1));
      i++;
      start = i;
    } else i++;
  }
  out.push(sql.slice(start));
  return out.filter((s) => s.replace(/--[^\n]*|\/\*[\s\S]*?\*\//g, '').trim().length > 0);
}

/** 是否含交易控制指令 */
export function hasTxControl(sql: string): boolean {
  return /\b(BEGIN|START\s+TRANSACTION|COMMIT|ROLLBACK|SAVEPOINT|END\s+TRANSACTION)\b/i.test(sql);
}

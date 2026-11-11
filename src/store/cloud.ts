import { createClient, type Session } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import { db, exportAll, importAll } from './db';

/**
 * 帳號與雲端同步（Supabase）。
 * 本機 IndexedDB 仍是主要儲存；登入後，整份資料（exportAll 的 JSON）會同步成雲端的一份快照：
 *   - 本機有變動 → 約 3 秒後上傳
 *   - 登入 / 回到分頁 → 雲端較新就下載
 * 沒有設定 VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY 時整個功能停用，App 以訪客模式運作。
 */

const URL_ = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
export const supabase = URL_ && KEY ? createClient(URL_, KEY) : null;
export const cloudEnabled = !!supabase;

const TABLE = 'user_data';
const LS_OWNER = 'sqlpg.owner'; // 本機資料屬於哪個 user id
const LS_DIRTY = 'sqlpg.dirty'; // 本機有尚未上傳的變動
const LS_SYNCED = 'sqlpg.lastSyncedAt'; // 最後同步時間（ISO）
/** 不觸發同步的表（草稿變動太頻繁） */
const NO_SYNC_TABLES = new Set(['drafts']);

export type SyncState = 'off' | 'idle' | 'syncing' | 'error' | 'conflict';

interface CloudStatus {
  session: Session | null;
  state: SyncState;
  error: string | null;
  lastSyncedAt: string | null;
}

const ls = {
  get: (k: string) => {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  set: (k: string, v: string | null) => {
    try {
      if (v === null) localStorage.removeItem(k);
      else localStorage.setItem(k, v);
    } catch {
      /* ignore */
    }
  },
};

let status: CloudStatus = { session: null, state: cloudEnabled ? 'idle' : 'off', error: null, lastSyncedAt: ls.get(LS_SYNCED) };
const listeners = new Set<(s: CloudStatus) => void>();
function setStatus(patch: Partial<CloudStatus>) {
  status = { ...status, ...patch };
  listeners.forEach((l) => l(status));
}

export function useCloud(): CloudStatus {
  const [s, setS] = useState(status);
  useEffect(() => {
    listeners.add(setS);
    setS(status);
    return () => {
      listeners.delete(setS);
    };
  }, []);
  return s;
}

const uid = () => status.session?.user.id ?? null;

// ---- 偵測本機變動 ----

let suppress = 0; // 從雲端匯入時不要觸發上傳
let timer: number | undefined;

function onLocalChange() {
  if (suppress > 0 || !uid() || ls.get(LS_OWNER) !== uid()) return;
  ls.set(LS_DIRTY, '1');
  window.clearTimeout(timer);
  timer = window.setTimeout(() => void push(), 3000);
}

let hooked = false;
function hookTables() {
  if (hooked) return;
  hooked = true;
  for (const t of db.tables) {
    if (NO_SYNC_TABLES.has(t.name)) continue;
    t.hook('creating', onLocalChange);
    t.hook('updating', onLocalChange);
    t.hook('deleting', onLocalChange);
  }
}

/** 匯入備份、清除資料等整批操作後呼叫，確保會上傳 */
export const markChanged = () => onLocalChange();

// ---- 上傳 / 下載 ----

async function snapshot(): Promise<unknown> {
  return JSON.parse(await exportAll());
}

export async function push(): Promise<void> {
  const id = uid();
  if (!supabase || !id) return;
  window.clearTimeout(timer);
  setStatus({ state: 'syncing', error: null });
  const now = new Date().toISOString();
  const { error } = await supabase.from(TABLE).upsert({ user_id: id, data: await snapshot(), updated_at: now });
  if (error) {
    setStatus({ state: 'error', error: error.message });
    return;
  }
  ls.set(LS_DIRTY, null);
  ls.set(LS_SYNCED, now);
  setStatus({ state: 'idle', lastSyncedAt: now });
}

async function pullRow(id: string): Promise<{ data: unknown; updated_at: string } | null> {
  const { data, error } = await supabase!.from(TABLE).select('data, updated_at').eq('user_id', id).maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

async function applyRemote(row: { data: unknown; updated_at: string }) {
  suppress++;
  try {
    await importAll(JSON.stringify(row.data));
  } finally {
    suppress--;
  }
  ls.set(LS_DIRTY, null);
  ls.set(LS_SYNCED, row.updated_at);
  setStatus({ state: 'idle', lastSyncedAt: row.updated_at, error: null });
}

async function clearLocal() {
  suppress++;
  try {
    await db.transaction('rw', db.tables, async () => {
      for (const t of db.tables) await t.clear();
    });
  } finally {
    suppress--;
  }
}

/** 本機是否有學習資料（設定、草稿不算） */
export async function hasLocalData(): Promise<boolean> {
  for (const t of db.tables) {
    if (t.name === 'kv' || t.name === 'drafts') continue;
    if ((await t.count()) > 0) return true;
  }
  return false;
}

/**
 * 登入後決定本機和雲端以誰為準。
 *   雲端沒資料            → 上傳本機（訪客期間的紀錄歸到這個帳號）
 *   本機就是這個帳號的     → 本機有未上傳變動就上傳，否則雲端較新就下載
 *   本機是空的            → 下載雲端
 *   本機是別人/訪客的紀錄  → conflict，交給使用者選
 */
export async function reconcile(): Promise<SyncState> {
  const id = uid();
  if (!supabase || !id) return status.state;
  setStatus({ state: 'syncing', error: null });
  try {
    const remote = await pullRow(id);
    const owner = ls.get(LS_OWNER);
    if (!remote) {
      ls.set(LS_OWNER, id);
      await push();
    } else if (owner === id) {
      if (ls.get(LS_DIRTY)) await push();
      else if (remote.updated_at !== ls.get(LS_SYNCED)) await applyRemote(remote);
      else setStatus({ state: 'idle' });
    } else if (!(await hasLocalData())) {
      await applyRemote(remote);
      ls.set(LS_OWNER, id);
    } else {
      setStatus({ state: 'conflict' });
    }
  } catch (e) {
    setStatus({ state: 'error', error: (e as Error).message });
  }
  return status.state;
}

/** 解決衝突：'cloud' = 用雲端紀錄取代本機；'local' = 用本機紀錄覆蓋雲端 */
export async function resolveConflict(choice: 'cloud' | 'local') {
  const id = uid();
  if (!supabase || !id) return;
  try {
    if (choice === 'local') {
      ls.set(LS_OWNER, id);
      await push();
    } else {
      const remote = await pullRow(id);
      if (remote) await applyRemote(remote);
      else await clearLocal();
      ls.set(LS_OWNER, id);
    }
  } catch (e) {
    setStatus({ state: 'error', error: (e as Error).message });
  }
}

// ---- 帳號 ----

function zhError(msg: string): string {
  if (/invalid login credentials/i.test(msg)) return 'Email 或密碼錯誤。';
  if (/email not confirmed/i.test(msg)) return '這個 Email 還沒有完成驗證，請到信箱點確認連結。';
  if (/already registered/i.test(msg)) return '這個 Email 已經註冊過了，請直接登入。';
  if (/password should be at least/i.test(msg)) return '密碼至少要 6 個字元。';
  if (/valid email|invalid format/i.test(msg)) return 'Email 格式不正確。';
  if (/failed to fetch|network/i.test(msg)) return '連不上 Supabase，請檢查網路或 .env 的網址。';
  return msg;
}

export async function signIn(email: string, password: string) {
  if (!supabase) throw new Error('尚未設定雲端');
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(zhError(error.message));
}

/** 回傳 true 代表已直接登入；false 代表需要先到信箱確認 */
export async function signUp(email: string, password: string): Promise<boolean> {
  if (!supabase) throw new Error('尚未設定雲端');
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw new Error(zhError(error.message));
  return !!data.session;
}

/** 登出：先把未上傳的變動傳上去，再清空本機，避免下一個人看到紀錄 */
export async function signOut() {
  if (!supabase) return;
  if (ls.get(LS_DIRTY) && ls.get(LS_OWNER) === uid()) await push();
  await supabase.auth.signOut();
  await clearLocal();
  ls.set(LS_OWNER, null);
  ls.set(LS_DIRTY, null);
  ls.set(LS_SYNCED, null);
  setStatus({ lastSyncedAt: null, state: 'idle', error: null });
}

// ---- 啟動 ----

let started = false;
export function initCloud() {
  if (!supabase || started) return;
  started = true;
  hookTables();
  supabase.auth.onAuthStateChange((event, session) => {
    const prev = uid();
    setStatus({ session });
    // 登入（或重新整理後恢復登入）時對一次帳
    if (session && session.user.id !== prev && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
      // 不能在 callback 裡直接 await supabase 呼叫（會卡住 auth lock）
      window.setTimeout(() => void reconcile(), 0);
    }
  });
  // 回到這個分頁時，抓別的裝置的更新
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && uid() && status.state === 'idle') void reconcile();
  });
}

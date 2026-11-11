import type { RunOutput, RunRequest, TableInfo } from './sandbox';

/**
 * 瀏覽器端的 SQL 執行器：PGlite 跑在 Web Worker 中，UI 不會卡住；
 * 超過時間限制（例如無窮遞迴 CTE）就終止 worker 並重建。
 */
const TIMEOUT_MS = 10_000;

type Pending = { resolve: (v: unknown) => void; reject: (e: Error) => void; timer: number };

let worker: Worker | null = null;
let seq = 0;
const pending = new Map<number, Pending>();

function getWorker(): Worker {
  if (worker) return worker;
  worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
  worker.onmessage = (e: MessageEvent<{ id: number; ok: boolean; data?: unknown; error?: string }>) => {
    const p = pending.get(e.data.id);
    if (!p) return;
    pending.delete(e.data.id);
    clearTimeout(p.timer);
    if (e.data.ok) p.resolve(e.data.data);
    else p.reject(new Error(e.data.error));
  };
  return worker;
}

function restartWorker(reason: string) {
  worker?.terminate();
  worker = null;
  for (const [, p] of pending) {
    clearTimeout(p.timer);
    p.reject(new Error(reason));
  }
  pending.clear();
}

function call<T>(type: 'run' | 'describe', payload: unknown, timeoutMs = TIMEOUT_MS): Promise<T> {
  const w = getWorker();
  const id = ++seq;
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      restartWorker(`執行逾時（超過 ${timeoutMs / 1000} 秒）。請檢查是否有無窮遞迴或過大的 CROSS JOIN。`);
    }, timeoutMs);
    pending.set(id, { resolve: resolve as (v: unknown) => void, reject, timer });
    w.postMessage({ id, type, payload });
  });
}

export async function runSql(req: RunRequest): Promise<RunOutput> {
  try {
    return await call<RunOutput>('run', req);
  } catch (e) {
    return { ok: false, error: (e as Error).message, durationMs: TIMEOUT_MS };
  }
}

export function describeSetup(setupSql: string): Promise<TableInfo[]> {
  // 第一次啟動 PGlite 需要載入 wasm，給較長時間
  return call<TableInfo[]>('describe', { setupSql }, 30_000);
}

/** 預熱：在使用者打開題目前先啟動資料庫 */
export function warmUp() {
  void describeSetup('SELECT 1;').catch(() => undefined);
}

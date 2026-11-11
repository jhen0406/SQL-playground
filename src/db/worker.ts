/// <reference lib="webworker" />
import { createPGlite } from './pglite';
import { runInSandbox, describeDataset, type RunRequest } from './sandbox';

const db = createPGlite();

type Msg =
  | { id: number; type: 'run'; payload: RunRequest }
  | { id: number; type: 'describe'; payload: { setupSql: string } };

// 一次只處理一個請求，保證 sandbox schema 不被同時改動
let queue: Promise<void> = Promise.resolve();

self.onmessage = (e: MessageEvent<Msg>) => {
  const msg = e.data;
  queue = queue.then(async () => {
    try {
      await db.waitReady;
      if (msg.type === 'run') {
        const out = await runInSandbox(db, msg.payload);
        (self as unknown as Worker).postMessage({ id: msg.id, ok: true, data: out });
      } else {
        const out = await describeDataset(db, msg.payload.setupSql);
        (self as unknown as Worker).postMessage({ id: msg.id, ok: true, data: out });
      }
    } catch (err) {
      (self as unknown as Worker).postMessage({ id: msg.id, ok: false, error: String((err as Error)?.message ?? err) });
    }
  });
};

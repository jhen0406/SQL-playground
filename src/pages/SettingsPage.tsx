import { useEffect, useRef, useState } from 'react';
import { db, exportAll, importAll, saveSettings, useSettings } from '../store/db';
import { cloudEnabled, markChanged } from '../store/cloud';
import { DEFAULT_OFFSETS } from '../srs/schedule';
import { getDayOffset, setDayOffset } from '../lib/date';
import { applyTheme, getStoredTheme } from '../lib/theme';
import { aiAvailable } from '../grading/aiReview';

export function SettingsPage() {
  const s = useSettings();
  const [offsetsText, setOffsetsText] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [perm, setPerm] = useState<string>('Notification' in window ? Notification.permission : 'unsupported');
  const [ai, setAi] = useState<boolean | null>(null);
  const [theme, setTheme] = useState(getStoredTheme() ?? 'system');
  const [dayOffset, setOffsetState] = useState(getDayOffset());
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => setOffsetsText(s.offsets.map((o) => o + 1).join(', ')), [s.offsets]);
  useEffect(() => {
    aiAvailable().then(setAi);
  }, []);

  const flash = (m: string) => {
    setMsg(m);
    window.setTimeout(() => setMsg(null), 3000);
  };

  const saveOffsets = async () => {
    const days = offsetsText.split(/[,，\s]+/).map(Number).filter((n) => Number.isInteger(n) && n >= 2);
    const sorted = [...new Set(days)].sort((a, b) => a - b);
    if (!sorted.length) return flash('請輸入至少一個大於等於 2 的天數');
    await saveSettings({ offsets: sorted.map((d) => d - 1) });
    flash('已儲存（新學的章節會套用新排程）');
  };

  const askPermission = async () => {
    if (!('Notification' in window)) return;
    const p = await Notification.requestPermission();
    setPerm(p);
    if (p === 'granted') new Notification('SQL 練功房', { body: '通知已開啟，到期複習時會提醒你。' });
  };

  const doExport = async () => {
    const json = await exportAll();
    const blob = new Blob([json], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `sql-playground-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const doImport = async (f: File) => {
    try {
      await importAll(await f.text());
      markChanged();
      flash('匯入完成');
    } catch (e) {
      flash('匯入失敗：' + (e as Error).message);
    }
  };

  const resetAll = async () => {
    if (!confirm('確定要清除所有學習紀錄、進度與設定嗎？此動作無法復原（建議先匯出備份）。')) return;
    await Promise.all(db.tables.map((t) => t.clear()));
    markChanged();
    flash('已清除所有資料');
  };

  const changeDayOffset = (n: number) => {
    setDayOffset(n);
    setOffsetState(n);
    window.dispatchEvent(new Event('sqlpg-day'));
  };

  return (
    <div className="page settings">
      <h1>設定</h1>
      {msg && <div className="alert alert-info">{msg}</div>}

      <section className="card">
        <h2>複習排程（艾賓浩斯遺忘曲線）</h2>
        <p className="muted small">學完當天為第 1 天。輸入要複習的「第幾天」，以逗號分隔。預設：{DEFAULT_OFFSETS.map((o) => o + 1).join(', ')}</p>
        <div className="row">
          <input className="input" value={offsetsText} onChange={(e) => setOffsetsText(e.target.value)} aria-label="複習天數" />
          <button className="btn btn-primary" onClick={saveOffsets}>
            儲存
          </button>
          <button className="btn btn-ghost" onClick={() => setOffsetsText(DEFAULT_OFFSETS.map((o) => o + 1).join(', '))}>
            還原預設
          </button>
        </div>
      </section>

      <section className="card">
        <h2>複習提醒</h2>
        <label className="check">
          <input type="checkbox" checked={s.notifications} onChange={(e) => saveSettings({ notifications: e.target.checked })} />
          到期時發送瀏覽器通知（平台開著時每天第一次開啟、以及之後每 3 小時提醒一次）
        </label>
        <p className="small">
          瀏覽器通知權限：<strong>{{ granted: '已允許', denied: '已封鎖（請到瀏覽器網站設定開啟）', default: '尚未詢問', unsupported: '此瀏覽器不支援' }[perm] ?? perm}</strong>
          {perm === 'default' && (
            <button className="btn btn-secondary btn-sm" onClick={askPermission}>
              允許通知
            </button>
          )}
        </p>
        <p className="muted small">無論是否開啟通知，只要有到期的複習，頁面頂部都會顯示提醒橫幅。</p>
      </section>

      <section className="card">
        <h2>精熟挑戰</h2>
        <label className="check">
          <input type="checkbox" checked={s.masteryUnlocked} onChange={(e) => saveSettings({ masteryUnlocked: e.target.checked })} />
          手動解鎖全部內容（不必按順序完成章節，也可以提前進入精熟挑戰）
        </label>
        <div className="row">
          <span>每天推出題數</span>
          <select className="input narrow" value={s.dailyCount} onChange={(e) => saveSettings({ dailyCount: Number(e.target.value) })}>
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {n} 題
              </option>
            ))}
          </select>
          <span className="muted small">（從明天的題目開始生效）</span>
        </div>
        <p className="small">
          AI 批改：{ai === null ? '檢查中…' : ai ? <span className="ok">已啟用</span> : <span className="warn-text">未啟用（後端未設定 ANTHROPIC_API_KEY，將顯示內建解析）</span>}
        </p>
      </section>

      <section className="card">
        <h2>外觀</h2>
        <div className="seg">
          {(['system', 'light', 'dark'] as const).map((t) => (
            <button
              key={t}
              className={theme === t ? 'on' : ''}
              onClick={() => {
                setTheme(t);
                applyTheme(t === 'system' ? null : t);
              }}
            >
              {{ system: '跟隨系統', light: '淺色', dark: '深色' }[t]}
            </button>
          ))}
        </div>
      </section>

      <section className="card">
        <h2>資料備份</h2>
        <p className="muted small">
          {cloudEnabled ? '學習紀錄存在這個瀏覽器中；登入帳號後會自動同步到雲端。也可以另外匯出一份 JSON 備份。' : '所有學習紀錄都存在這台電腦的瀏覽器中。換電腦或清除瀏覽器資料前，請先匯出備份。'}
        </p>
        <div className="row">
          <button className="btn btn-secondary" onClick={doExport}>
            匯出備份（JSON）
          </button>
          <button className="btn btn-secondary" onClick={() => fileRef.current?.click()}>
            匯入備份
          </button>
          <input ref={fileRef} type="file" accept="application/json" hidden onChange={(e) => e.target.files?.[0] && doImport(e.target.files[0])} />
          <button className="btn btn-danger" onClick={resetAll}>
            清除所有資料
          </button>
        </div>
      </section>

      <section className="card">
        <h2>測試工具：模擬日期</h2>
        <p className="muted small">把「今天」往後推幾天，用來預覽複習提醒是否會出現（不會改動電腦時間）。</p>
        <div className="row">
          <button className="btn btn-ghost btn-sm" onClick={() => changeDayOffset(dayOffset - 1)}>
            −1 天
          </button>
          <strong>{dayOffset === 0 ? '真實日期' : `${dayOffset > 0 ? '+' : ''}${dayOffset} 天`}</strong>
          <button className="btn btn-ghost btn-sm" onClick={() => changeDayOffset(dayOffset + 1)}>
            +1 天
          </button>
          {dayOffset !== 0 && (
            <button className="btn btn-ghost btn-sm" onClick={() => changeDayOffset(0)}>
              回到今天
            </button>
          )}
        </div>
      </section>
    </div>
  );
}

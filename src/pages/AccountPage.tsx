import { useState } from 'react';
import { AlertTriangle, Cloud, CloudOff, Loader2, LogOut, RefreshCw, UserRound } from 'lucide-react';
import { cloudEnabled, push, reconcile, resolveConflict, signIn, signOut, signUp, useCloud } from '../store/cloud';

function fmt(iso: string | null) {
  if (!iso) return '尚未同步';
  return new Date(iso).toLocaleString('zh-TW', { hour12: false });
}

export function AccountPage() {
  const cloud = useCloud();

  if (!cloudEnabled) {
    return (
      <div className="page narrow-page">
        <h1>帳號</h1>
        <div className="card empty-state">
          <CloudOff className="ic-lg" aria-hidden />
          <strong>尚未設定雲端</strong>
          <span className="small">
            在專案的 <code>.env</code> 填入 <code>VITE_SUPABASE_URL</code> 和 <code>VITE_SUPABASE_ANON_KEY</code>，重新啟動 <code>npm run dev</code> 後就能註冊、登入。
            <br />
            目前以訪客模式使用，紀錄只存在這個瀏覽器。
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="page narrow-page">
      <h1>帳號</h1>
      {cloud.session ? <SignedIn email={cloud.session.user.email ?? ''} cloud={cloud} /> : <AuthForm />}
    </div>
  );
}

function SignedIn({ email, cloud }: { email: string; cloud: ReturnType<typeof useCloud> }) {
  const [busy, setBusy] = useState(false);
  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      {cloud.state === 'conflict' && (
        <section className="card conflict-card">
          <div className="card-title">
            <AlertTriangle className="ic" aria-hidden />
            <h2>這台裝置上已經有其他學習紀錄</h2>
          </div>
          <p className="muted">這個瀏覽器裡的紀錄不屬於這個帳號（可能是登入前以訪客身分學的）。要以哪一份為準？另一份會被覆蓋。</p>
          <div className="row">
            <button className="btn btn-primary" disabled={busy} onClick={() => run(() => resolveConflict('cloud'))}>
              使用雲端的紀錄
            </button>
            <button className="btn btn-secondary" disabled={busy} onClick={() => run(() => resolveConflict('local'))}>
              用這台裝置的紀錄覆蓋雲端
            </button>
          </div>
        </section>
      )}
      <section className="card">
        <div className="card-title">
          <UserRound className="ic" aria-hidden />
          <h2>{email}</h2>
        </div>
        <dl className="kv-list">
          <dt>同步狀態</dt>
          <dd className="inline-ic">
            {cloud.state === 'syncing' ? <Loader2 className="ic-sm spin" aria-hidden /> : cloud.state === 'error' ? <CloudOff className="ic-sm" aria-hidden /> : <Cloud className="ic-sm" aria-hidden />}
            {{ off: '未啟用', idle: '已同步', syncing: '同步中…', error: '同步失敗', conflict: '等待你選擇' }[cloud.state]}
          </dd>
          <dt>最後同步</dt>
          <dd>{fmt(cloud.lastSyncedAt)}</dd>
        </dl>
        {cloud.error && <div className="alert alert-bad">{cloud.error}</div>}
        <p className="muted small">學習紀錄、提交、複習排程、重點筆記和設定，都會在變動後幾秒自動上傳。在其他裝置用同一個帳號登入，就會看到同一份紀錄。</p>
        <div className="row">
          <button className="btn btn-secondary" disabled={busy || cloud.state === 'conflict'} onClick={() => run(async () => ((await reconcile()) === 'idle' ? push() : undefined))}>
            <RefreshCw className="ic-sm" aria-hidden />
            立即同步
          </button>
          <button className="btn btn-ghost" disabled={busy} onClick={() => run(signOut)}>
            <LogOut className="ic-sm" aria-hidden />
            登出
          </button>
        </div>
        <p className="muted small">登出後，這個瀏覽器裡的紀錄會被清空（雲端仍保留），避免下一個使用這台電腦的人看到。</p>
      </section>
    </>
  );
}

function AuthForm() {
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      if (mode === 'in') await signIn(email.trim(), password);
      else if (!(await signUp(email.trim(), password))) setInfo('註冊成功！請到信箱點確認連結，再回來登入。');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card auth-card">
      <div className="seg" role="tablist" aria-label="登入或註冊">
        <button role="tab" aria-selected={mode === 'in'} className={mode === 'in' ? 'on' : ''} onClick={() => setMode('in')}>登入</button>
        <button role="tab" aria-selected={mode === 'up'} className={mode === 'up' ? 'on' : ''} onClick={() => setMode('up')}>註冊</button>
      </div>
      <form onSubmit={submit} className="auth-form">
        <label className="field">
          <span>Email</span>
          <input className="ui-input" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="field">
          <span>密碼</span>
          <input
            className="ui-input"
            type="password"
            autoComplete={mode === 'in' ? 'current-password' : 'new-password'}
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-describedby="pw-help"
          />
          <span id="pw-help" className="muted small">至少 6 個字元</span>
        </label>
        {error && <div className="alert alert-bad" role="alert">{error}</div>}
        {info && <div className="alert alert-ok" role="status">{info}</div>}
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy && <Loader2 className="ic-sm spin" aria-hidden />}
          {mode === 'in' ? '登入' : '建立帳號'}
        </button>
      </form>
      <p className="muted small">登入後，學習紀錄會同步到雲端，換電腦或手機都看得到。不登入也能照常使用，紀錄只存在這個瀏覽器。</p>
    </section>
  );
}

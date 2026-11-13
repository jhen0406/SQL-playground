import { useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';
/** 使用者的偏好：沒選過時預設深色；'system' 代表跟隨作業系統 */
export type ThemePref = Theme | 'system';
const KEY = 'sqlpg.theme';

function systemTheme(): Theme {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function getThemePref(): ThemePref {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'light' || v === 'dark' || v === 'system' ? v : 'dark';
  } catch {
    return 'dark';
  }
}

export function resolveTheme(p: ThemePref): Theme {
  return p === 'system' ? systemTheme() : p;
}

export function applyTheme(p: ThemePref) {
  try {
    localStorage.setItem(KEY, p);
  } catch {
    /* ignore */
  }
  const eff = resolveTheme(p);
  document.documentElement.dataset.theme = eff;
  window.dispatchEvent(new CustomEvent('sqlpg-theme', { detail: eff }));
}

/** 啟動時套用（不寫入 localStorage，保持「沒選過＝預設深色」） */
export function initTheme() {
  document.documentElement.dataset.theme = resolveTheme(getThemePref());
}

export function useTheme(): Theme {
  const [t, setT] = useState<Theme>(() => (document.documentElement.dataset.theme as Theme) || resolveTheme(getThemePref()));
  useEffect(() => {
    const h = (e: Event) => setT((e as CustomEvent<Theme>).detail);
    window.addEventListener('sqlpg-theme', h);
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    const onSys = () => {
      if (getThemePref() === 'system') applyTheme('system');
    };
    mq?.addEventListener('change', onSys);
    return () => {
      window.removeEventListener('sqlpg-theme', h);
      mq?.removeEventListener('change', onSys);
    };
  }, []);
  return t;
}

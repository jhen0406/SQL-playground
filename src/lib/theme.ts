import { useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';
const KEY = 'sqlpg.theme';

function systemTheme(): Theme {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function getStoredTheme(): Theme | null {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'light' || v === 'dark' ? v : null;
  } catch {
    return null;
  }
}

export function applyTheme(t: Theme | null) {
  try {
    if (t) localStorage.setItem(KEY, t);
    else localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
  const eff = t ?? systemTheme();
  document.documentElement.dataset.theme = eff;
  window.dispatchEvent(new CustomEvent('sqlpg-theme', { detail: eff }));
}

export function useTheme(): Theme {
  const [t, setT] = useState<Theme>(() => (document.documentElement.dataset.theme as Theme) || systemTheme());
  useEffect(() => {
    const h = (e: Event) => setT((e as CustomEvent<Theme>).detail);
    window.addEventListener('sqlpg-theme', h);
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    const onSys = () => {
      if (!getStoredTheme()) applyTheme(null);
    };
    mq?.addEventListener('change', onSys);
    return () => {
      window.removeEventListener('sqlpg-theme', h);
      mq?.removeEventListener('change', onSys);
    };
  }, []);
  return t;
}

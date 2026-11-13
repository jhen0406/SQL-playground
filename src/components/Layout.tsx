import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { getChapter } from '../content';
import { getDayOffset, prettyDay } from '../lib/date';
import { applyTheme, useTheme } from '../lib/theme';
import { useSettings } from '../store/db';
import { AvatarSvg } from './Avatars';
import { dueReviews, useReviews, useToday } from '../store/hooks';
import { warmUp } from '../db/engine';
import { cloudEnabled, initCloud, useCloud } from '../store/cloud';
import {
  ArrowRight, BellRing, BookOpen, CalendarCheck, CalendarDays, Database, LayoutDashboard, Menu, Moon, NotebookPen,
  Settings, Sun, Trophy, UserRound, X, type LucideIcon,
} from 'lucide-react';

interface NavItem {
  to: string;
  label: string;
  /** 窄側欄上的短標籤 */
  short: string;
  icon: LucideIcon;
  end?: boolean;
}

const NAV: NavItem[] = [
  { to: '/', label: '總覽', short: '總覽', icon: LayoutDashboard, end: true },
  { to: '/learn', label: '入門課程', short: '課程', icon: BookOpen },
  { to: '/mastery', label: '精熟挑戰', short: '精熟', icon: Trophy },
  { to: '/plan', label: '學習計畫', short: '計畫', icon: CalendarCheck },
  { to: '/history', label: '學習紀錄', short: '紀錄', icon: CalendarDays },
  { to: '/notes', label: '重點筆記', short: '筆記', icon: NotebookPen },
];
const SETTINGS: NavItem = { to: '/settings', label: '設定', short: '設定', icon: Settings };
const ACCOUNT: NavItem = { to: '/account', label: '帳號', short: '帳號', icon: UserRound };

/** 依目前路徑決定頂部列顯示的頁面名稱（章節頁、題目頁顯示上一層） */
function currentPage(path: string): NavItem {
  if (path.startsWith('/review')) return NAV[3];
  if (path.startsWith('/settings')) return SETTINGS;
  if (path.startsWith('/account')) return ACCOUNT;
  return NAV.find((n) => (n.end ? path === n.to : path.startsWith(n.to))) ?? NAV[0];
}

export function Layout() {
  const day = useToday();
  const reviews = useReviews();
  const due = dueReviews(reviews, day);
  const loc = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  useReminderNotifications(due.map((d) => d.chapterId), day);

  useEffect(() => {
    warmUp();
    initCloud();
  }, []);
  useEffect(() => setMenuOpen(false), [loc.pathname]);

  const offset = getDayOffset();
  const page = currentPage(loc.pathname);

  const navLink = (n: NavItem) => (
    <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => 'nav ' + (isActive ? 'on' : '')} title={n.label}>
      <span className="nav-ic">
        <n.icon className="ic" aria-hidden />
        {n.to === '/plan' && due.length > 0 && (
          <span className="nav-badge" aria-label={`${due.length} 個待複習`}>
            {due.length}
          </span>
        )}
      </span>
      <span className="nav-t nav-short" aria-hidden>{n.short}</span>
      <span className="nav-t nav-full">{n.label}</span>
    </NavLink>
  );

  return (
    <div className="app">
      <aside className={'side ' + (menuOpen ? 'open' : '')}>
        <div className="side-top">
          <Link to="/" className="rail-logo" aria-label="SQL 練功房 首頁">
            <Database className="ic" strokeWidth={2.4} aria-hidden />
          </Link>
          <span className="drawer-brand">SQL 練功房</span>
          <button className="btn btn-ghost btn-icon drawer-close" onClick={() => setMenuOpen(false)} aria-label="關閉選單">
            <X className="ic" aria-hidden />
          </button>
        </div>
        <nav aria-label="主選單">{NAV.map(navLink)}</nav>
        <div className="side-foot">{navLink(SETTINGS)}</div>
      </aside>
      {menuOpen && <div className="scrim" onClick={() => setMenuOpen(false)} aria-hidden />}
      <div className="app-main">
        <header className="topbar">
          <button className="btn btn-ghost btn-icon menu-btn" onClick={() => setMenuOpen(!menuOpen)} aria-label="開啟選單" aria-expanded={menuOpen}>
            <Menu className="ic" aria-hidden />
          </button>
          <span className="page-title">
            <span className="page-title-ic" aria-hidden>
              <page.icon className="ic" />
            </span>
            <span>{page.label}</span>
          </span>
          <span className="spacer" />
          {offset !== 0 && <span className="chip chip-warn hide-sm">模擬 {offset > 0 ? '+' : ''}{offset} 天</span>}
          <span className="topbar-date hide-sm">
            <CalendarDays className="ic-sm" aria-hidden />
            {prettyDay(day)}
          </span>
          <ThemeToggle />
          <AccountAvatar />
        </header>
        {due.length > 0 && !loc.pathname.startsWith('/review') && (
          <div className="review-banner" role="status">
            <span className="inline-ic">
              <BellRing className="ic" aria-hidden />
              <span>
                今天有 <strong>{due.length}</strong> 個章節需要複習：
                {due.slice(0, 3).map((d) => getChapter(d.chapterId)?.title).join('、')}
                {due.length > 3 ? '…' : ''}
              </span>
            </span>
            <NavLink to={`/review/${due[0].chapterId}`} className="btn btn-primary btn-sm">
              開始複習
              <ArrowRight className="ic-sm" aria-hidden />
            </NavLink>
          </div>
        )}
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function ThemeToggle() {
  const theme = useTheme();
  const next = theme === 'dark' ? 'light' : 'dark';
  return (
    <button className="btn btn-ghost btn-icon" onClick={() => applyTheme(next)} aria-label={next === 'light' ? '切換成淺色' : '切換成深色'} title={next === 'light' ? '切換成淺色' : '切換成深色'}>
      {theme === 'dark' ? <Sun className="ic" aria-hidden /> : <Moon className="ic" aria-hidden />}
    </button>
  );
}

/** 頂部列右側的帳號頭像（同步狀態以小圓點表示） */
function AccountAvatar() {
  const cloud = useCloud();
  const settings = useSettings();
  const email = cloud.session?.user.email;
  const state = !cloudEnabled || !email ? 'guest' : cloud.state;
  const label = !cloudEnabled ? '帳號（訪客模式）' : !email ? '登入以同步紀錄' : `${email}（${{ off: '', idle: '已同步', syncing: '同步中', error: '同步失敗', conflict: '需要選擇保留哪份紀錄' }[cloud.state]}）`;
  return (
    <NavLink to="/account" className={({ isActive }) => 'avatar ' + (isActive ? 'on' : '')} aria-label={label} title={label}>
      <AvatarSvg id={settings.avatar} />
      <span className={'avatar-dot ' + state} aria-hidden />
    </NavLink>
  );
}

/** 平台主動提醒：分頁開著時，每天第一次（以及之後每小時）檢查到期的複習並跳出系統通知。 */
function useReminderNotifications(dueIds: string[], day: string) {
  const settings = useSettings();
  const key = dueIds.join(',');
  useEffect(() => {
    if (!settings.notifications || !('Notification' in window) || dueIds.length === 0) return;
    const notify = () => {
      if (Notification.permission !== 'granted') return;
      const hour = new Date().getHours();
      const stamp = `${day}-${hour}`;
      try {
        const last = localStorage.getItem('sqlpg.lastNotified');
        // 每天第一次必通知；之後每 3 小時最多一次
        if (last?.startsWith(day) && hour - Number(last.split('-').pop()) < 3) return;
        localStorage.setItem('sqlpg.lastNotified', stamp);
      } catch {
        /* ignore */
      }
      const titles = dueIds.map((id) => getChapter(id)?.title).filter(Boolean);
      const n = new Notification('SQL 練功房：該複習囉！', {
        body: `今天有 ${dueIds.length} 個章節要複習：${titles.slice(0, 3).join('、')}${titles.length > 3 ? '…' : ''}`,
        tag: 'sqlpg-review',
      });
      n.onclick = () => {
        window.focus();
        location.assign(`/review/${dueIds[0]}`);
      };
    };
    notify();
    const id = window.setInterval(notify, 60 * 60 * 1000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, day, settings.notifications]);
}


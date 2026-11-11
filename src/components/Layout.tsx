import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { getChapter } from '../content';
import { getDayOffset, prettyDay } from '../lib/date';
import { useSettings } from '../store/db';
import { dueReviews, useReviews, useToday } from '../store/hooks';
import { warmUp } from '../db/engine';
import { cloudEnabled, initCloud, useCloud } from '../store/cloud';
import { AlertTriangle, ArrowRight, BellRing, BookOpen, CalendarDays, Cloud, CloudOff, Loader2, Database, LayoutDashboard, Menu, NotebookPen, RotateCcw, Settings, Trophy } from 'lucide-react';

const NAV_GROUPS = [
  {
    label: '學習',
    items: [
      { to: '/', label: '總覽', icon: LayoutDashboard, end: true },
      { to: '/learn', label: '入門課程', icon: BookOpen },
      { to: '/mastery', label: '精熟挑戰', icon: Trophy },
      { to: '/notes', label: '重點筆記', icon: NotebookPen },
    ],
  },
  {
    label: '追蹤',
    items: [
      { to: '/plan', label: '複習計畫', icon: RotateCcw },
      { to: '/history', label: '學習紀錄', icon: CalendarDays },
      { to: '/settings', label: '設定', icon: Settings },
    ],
  },
];

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

  return (
    <div className="app">
      <aside className={'side ' + (menuOpen ? 'open' : '')}>
        <div className="brand">
          <span className="logo" aria-hidden>
            <Database className="ic" strokeWidth={2.4} />
          </span>
          <div>
            <div className="brand-name">SQL 練功房</div>
            <div className="muted small">從零基礎到 LeetCode</div>
          </div>
        </div>
        <nav aria-label="主選單">
          {NAV_GROUPS.map((g) => (
            <div key={g.label}>
              <div className="nav-label">{g.label}</div>
              {g.items.map((n) => (
                <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => 'nav ' + (isActive ? 'on' : '')}>
                  <n.icon className="ic" aria-hidden />
                  {n.label}
                  {n.to === '/plan' && due.length > 0 && (
                    <span className="pill pill-warn" aria-label={`${due.length} 個待複習`}>
                      {due.length}
                    </span>
                  )}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <AccountChip />
        <div className="side-foot small">
          <span className="date">
            <CalendarDays className="ic-sm" aria-hidden />
            {prettyDay(day)}
          </span>
          {offset !== 0 && <span className="warn-text">模擬日期 {offset > 0 ? '+' : ''}{offset} 天</span>}
        </div>
      </aside>
      <div className="main">
        <header className="topbar">
          <button className="btn btn-ghost btn-icon menu-btn" onClick={() => setMenuOpen(!menuOpen)} aria-label="開啟選單" aria-expanded={menuOpen}>
            <Menu className="ic" aria-hidden />
          </button>
          <span className="brand-name">SQL 練功房</span>
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

/** 側欄底部的帳號狀態 */
function AccountChip() {
  const cloud = useCloud();
  const email = cloud.session?.user.email;
  const Icon = !cloudEnabled || !email ? CloudOff : cloud.state === 'syncing' ? Loader2 : cloud.state === 'conflict' || cloud.state === 'error' ? AlertTriangle : Cloud;
  const label = !cloudEnabled ? '訪客模式' : !email ? '登入以同步紀錄' : email;
  const sub = !email ? '紀錄只存在這個瀏覽器' : { off: '', idle: '已同步', syncing: '同步中…', error: '同步失敗', conflict: '需要你選擇要保留哪份紀錄' }[cloud.state];
  return (
    <NavLink to="/account" className={({ isActive }) => 'account-chip ' + (isActive ? 'on' : '')}>
      <Icon className={'ic' + (cloud.state === 'syncing' ? ' spin' : '')} aria-hidden />
      <span className="account-text">
        <span className="account-name">{label}</span>
        <span className="account-sub">{sub}</span>
      </span>
    </NavLink>
  );
}

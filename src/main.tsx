import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import './styles.css';
import { applyTheme, getStoredTheme } from './lib/theme';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { LearnIndex } from './pages/LearnIndex';
import { ChapterPage } from './pages/ChapterPage';
import { ReviewPage } from './pages/ReviewPage';
import { MasteryIndex, MasteryProblemPage } from './pages/MasteryPages';
import { HistoryPage } from './pages/HistoryPage';
import { PlanPage } from './pages/PlanPage';
import { SettingsPage } from './pages/SettingsPage';
import { NotesPage } from './pages/NotesPage';
import { AccountPage } from './pages/AccountPage';

applyTheme(getStoredTheme());

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="learn" element={<LearnIndex />} />
          <Route path="learn/:id" element={<ChapterPage />} />
          <Route path="review/:id" element={<ReviewPage />} />
          <Route path="mastery" element={<MasteryIndex />} />
          <Route path="mastery/:id" element={<MasteryProblemPage />} />
          <Route path="history" element={<HistoryPage />} />
          <Route path="plan" element={<PlanPage />} />
          <Route path="notes" element={<NotesPage />} />
          <Route path="account" element={<AccountPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<div className="page">找不到頁面。</div>} />
        </Route>
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
);

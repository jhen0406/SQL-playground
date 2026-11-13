import { describe, expect, it } from 'vitest';
import { accuracy, dailySeries, streaks } from '../src/lib/stats';

describe('dashboard 統計', () => {
  const acts = [
    { day: '2026-11-01', type: 'learn' },
    { day: '2026-11-01', type: 'practice', correct: true },
    { day: '2026-11-03', type: 'practice', correct: false },
    { day: '2026-11-03', type: 'review', correct: true },
    { day: '2026-10-20', type: 'practice', correct: true }, // 範圍外
  ];

  it('dailySeries 每天一筆，沒活動補 0', () => {
    const s = dailySeries(acts, '2026-11-01', '2026-11-04');
    expect(s.map((p) => p.day)).toEqual(['2026-11-01', '2026-11-02', '2026-11-03', '2026-11-04']);
    expect(s[0]).toMatchObject({ attempts: 1, correct: 1, total: 2 });
    expect(s[1]).toMatchObject({ attempts: 0, correct: 0, total: 0 });
    expect(s[2]).toMatchObject({ attempts: 2, correct: 1, total: 2 });
  });

  it('streaks：今天沒學時從昨天算起；longest 取歷史最長', () => {
    const days = ['2026-11-01', '2026-11-02', '2026-11-03', '2026-11-08', '2026-11-09'];
    expect(streaks(days, '2026-11-10')).toEqual({ current: 2, longest: 3 });
    expect(streaks(days, '2026-11-09')).toEqual({ current: 2, longest: 3 });
    expect(streaks(days, '2026-11-12')).toEqual({ current: 0, longest: 3 });
    expect(streaks([], '2026-11-12')).toEqual({ current: 0, longest: 0 });
  });

  it('accuracy 只算有對錯的作答，沒有作答回傳 null', () => {
    expect(accuracy(acts, '2026-11-01', '2026-11-07')).toBeCloseTo(2 / 3);
    expect(accuracy(acts, '2026-11-02', '2026-11-02')).toBeNull();
  });
});

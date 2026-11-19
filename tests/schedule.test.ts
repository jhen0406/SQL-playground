import { describe, it, expect } from 'vitest';
import { createReviewItem, completeReview, reviewStatus, projectedDates, dueDayNumber } from '../src/srs/schedule';

describe('ebbinghaus schedule', () => {
  it('first review on day 3 (learn day = day 1)', () => {
    const it0 = createReviewItem('c01', '2024-11-01');
    expect(it0.due).toBe('2024-11-03');
    expect(dueDayNumber(it0)).toBe(3);
  });
  it('follows day 3, 7, 15, 30, 60 when reviewed on time', () => {
    let item = createReviewItem('c01', '2024-11-01');
    const dues = [item.due];
    while (!item.done) {
      item = completeReview(item, item.due, true);
      if (!item.done) dues.push(item.due);
    }
    expect(dues).toEqual(['2024-11-03', '2024-11-07', '2024-11-15', '2024-11-30', '2024-12-30']);
    expect(item.history).toHaveLength(5);
  });
  it('resets to day 3 from the review day on a wrong answer', () => {
    let item = createReviewItem('c01', '2024-11-01');
    item = completeReview(item, '2024-11-03', true); // due 11-07
    item = completeReview(item, '2024-11-07', false);
    expect(item.stage).toBe(0);
    expect(item.anchor).toBe('2024-11-07');
    expect(item.due).toBe('2024-11-09');
  });
  it('late review schedules at least tomorrow', () => {
    let item = createReviewItem('c01', '2024-11-01');
    item = completeReview(item, '2024-11-10', true); // next anchored due 11-07 already passed
    expect(item.due).toBe('2024-11-11');
  });
  it('status', () => {
    const item = createReviewItem('c01', '2024-11-01');
    expect(reviewStatus(item, '2024-11-02')).toBe('upcoming');
    expect(reviewStatus(item, '2024-11-03')).toBe('today');
    expect(reviewStatus(item, '2024-11-05')).toBe('overdue');
    expect(projectedDates(item)).toEqual(['2024-11-03', '2024-11-07', '2024-11-15', '2024-11-30', '2024-12-30']);
  });
});

describe('熟悉度回饋', () => {
  // 學習日 11-01：第 3 天 = 11-03、第 7 天 = 11-07、第 15 天 = 11-15
  const at = (stageReviews: number) => {
    let item = createReviewItem('c01', '2024-11-01');
    for (let i = 0; i < stageReviews; i++) item = completeReview(item, item.due, 'good');
    return item;
  };
  it('熟悉 = 升到下一級（和答對相同）', () => {
    const a = completeReview(at(0), '2024-11-03', 'good');
    const b = completeReview(at(0), '2024-11-03', true);
    expect(a.due).toBe('2024-11-07');
    expect(a.due).toBe(b.due);
    expect(a.stage).toBe(b.stage);
  });
  it('不熟悉 = 從今天重新開始，但紀錄仍算答對', () => {
    const item = completeReview(at(1), '2024-11-07', 'again');
    expect(item.stage).toBe(0);
    expect(item.due).toBe('2024-11-09');
    expect(item.history.at(-1)).toMatchObject({ correct: true, rating: 'again' });
  });
  it('答錯（false）紀錄為答錯', () => {
    const item = completeReview(at(1), '2024-11-07', false);
    expect(item.history.at(-1)).toMatchObject({ correct: false, rating: 'again' });
  });
  it('尚可：第 3 天那級 → 2 天後再複習同一級', () => {
    const item = completeReview(at(0), '2024-11-03', 'ok');
    expect(item.stage).toBe(0);
    expect(item.due).toBe('2024-11-05');
  });
  it('尚可：第 7 天那級 → 4 天後再複習同一級，之後熟悉就接回原進度', () => {
    let item = completeReview(at(1), '2024-11-07', 'ok');
    expect(item.stage).toBe(1);
    expect(item.due).toBe('2024-11-11');
    item = completeReview(item, item.due, 'good');
    expect(item.stage).toBe(2);
    expect(item.due).toBe('2024-11-19'); // 11-11 + (14 - 6) 天
  });
  it('連續尚可不設上限，停在同一級', () => {
    let item = at(2);
    for (let i = 0; i < 3; i++) item = completeReview(item, item.due, 'ok');
    expect(item.stage).toBe(2);
    expect(item.done).toBe(false);
  });
  it('從同一個快照改選，三種結果互不影響', () => {
    const snap = at(1);
    const g = completeReview(snap, '2024-11-07', 'good');
    const o = completeReview(snap, '2024-11-07', 'ok');
    const a = completeReview(snap, '2024-11-07', 'again');
    expect([g.due, o.due, a.due]).toEqual(['2024-11-15', '2024-11-11', '2024-11-09']);
    expect(snap.history).toHaveLength(1);
  });
});

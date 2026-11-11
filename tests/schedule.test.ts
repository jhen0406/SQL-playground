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

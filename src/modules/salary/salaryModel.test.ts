import { describe, expect, it } from 'vitest';
import {
  autoSplit,
  dailyCumulative,
  emptyState,
  goalProgress,
  monthsBetween,
  nextPayday,
  normalizeState,
  planFor,
  safeDaily,
  shiftMonth,
  simulate,
  summarize,
  toCsv,
  totalPlanned,
  type SalaryState,
} from './salaryModel';

function stateWith(salary: number): SalaryState {
  const s = emptyState();
  s.months['2026-10'] = autoSplit(salary, s.rule);
  return s;
}

describe('salary model', () => {
  it('auto-splits close to the rule', () => {
    const plan = autoSplit(10000, { needs: 50, wants: 30, savings: 20 });
    expect(totalPlanned(plan)).toBe(10000);
    expect(totalPlanned(autoSplit(12345, { needs: 60, wants: 20, savings: 20 }))).toBe(12345);
    const needs = plan.categories.filter((c) => c.bucket === 'needs').reduce((a, c) => a + c.planned, 0);
    expect(needs).toBeGreaterThan(4800);
    expect(needs).toBeLessThan(5200);
  });

  it('summarizes spending per bucket', () => {
    const s = stateWith(10000);
    const rent = s.months['2026-10'].categories.find((c) => c.key === 'sal.cat.rent')!;
    s.txns.push({ id: 't1', date: '2026-10-03', amount: 2500, categoryId: rent.id, note: '' });
    s.txns.push({ id: 't2', date: '2026-09-30', amount: 999, categoryId: rent.id, note: '' });
    const sum = summarize(s, '2026-10');
    expect(sum.income).toBe(10000);
    expect(sum.spent).toBe(2500);
    expect(sum.byBucket.needs.spent).toBe(2500);
    expect(sum.left).toBe(7500);
    expect(sum.byBucket.savings.target).toBe(2000);
  });

  it('borrows the closest earlier plan', () => {
    const s = stateWith(8000);
    expect(planFor(s, '2026-12').inherited).toBe(true);
    expect(planFor(s, '2026-12').plan).toBe(s.months['2026-10']);
    expect(planFor(s, '2026-10').inherited).toBe(false);
  });

  it('computes a safe daily amount', () => {
    const s = stateWith(10000);
    const sum = summarize(s, '2026-10');
    const perDay = safeDaily(sum, '2026-10', 1);
    expect(perDay).toBeCloseTo((sum.byBucket.needs.planned + sum.byBucket.wants.planned) / 31, 5);
    expect(safeDaily(sum, '2026-10', 31)).toBeCloseTo(sum.byBucket.needs.planned + sum.byBucket.wants.planned, 5);
  });

  it('handles month math and paydays', () => {
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
    expect(monthsBetween('2026-10', '2027-04')).toBe(6);
    expect(nextPayday(25, new Date(2026, 9, 2)).getDate()).toBe(25);
    const next = nextPayday(31, new Date(2026, 1, 28 + 1)); // Mar 1 → Mar 31
    expect(next.getMonth()).toBe(2);
    expect(nextPayday(31, new Date(2026, 1, 10)).getDate()).toBe(28); // February clamp
  });

  it('tracks goals', () => {
    const g = { id: 'g', name: 'Car', target: 12000, saved: 2000, monthly: 1000, deadline: '2027-06' };
    const p = goalProgress(g, '2026-10');
    expect(p.monthsLeft).toBe(10);
    expect(p.eta).toBe('2027-08');
    expect(p.onTrack).toBe(false);
    expect(p.neededMonthly).toBeCloseTo(10000 / 8);
    expect(goalProgress({ ...g, monthly: 0 }, '2026-10').monthsLeft).toBeNull();
    expect(goalProgress(g, '2026-10', 1000).monthsLeft).toBe(5);
  });

  it('simulates a raise', () => {
    const sum = summarize(stateWith(10000), '2026-10');
    const r = simulate(sum, { raisePct: 10, toSavingsPct: 50, newCost: 200 });
    expect(r.raise).toBe(1000);
    expect(r.extraSavings).toBe(500);
    expect(r.income).toBe(11000);
    expect(r.monthlyRoom).toBeCloseTo(sum.unassigned + 500 - 200);
  });

  it('builds the cumulative pace', () => {
    const s = stateWith(1000);
    s.txns = [
      { id: 'a', date: '2026-10-01', amount: 10, categoryId: 'x', note: '' },
      { id: 'b', date: '2026-10-03', amount: 5, categoryId: 'x', note: '' },
    ];
    const c = dailyCumulative(s.txns, '2026-10');
    expect(c).toHaveLength(31);
    expect(c.slice(0, 4)).toEqual([10, 10, 15, 15]);
  });

  it('cleans untrusted data', () => {
    const s = normalizeState({
      currency: 'XXX',
      payday: 99,
      months: { bad: {}, '2026-10': { incomes: [{ amount: -5 }], categories: [{ bucket: 'nope', key: 'evil' }] } },
      txns: [{ amount: 0 }, { amount: 4, date: 'x' }],
    });
    expect(s.currency).toBe('MAD');
    expect(s.payday).toBe(31);
    expect(Object.keys(s.months)).toEqual(['2026-10']);
    expect(s.months['2026-10'].incomes[0].amount).toBe(0);
    expect(s.months['2026-10'].categories[0].bucket).toBe('needs');
    expect(s.months['2026-10'].categories[0].key).toBeUndefined();
    expect(s.txns).toHaveLength(1);
  });

  it('writes safe CSV', () => {
    expect(toCsv([['=SUM(A1)', 'a,b', 3]])).toBe(`'=SUM(A1),"a,b",3`);
  });
});

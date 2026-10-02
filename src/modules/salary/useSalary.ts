import { useCallback, useEffect, useRef, useState } from 'react';
import { kvGet, kvSet } from '@/data/kvStore';
import { emptyState, normalizeState, planFor, type MonthPlan, type SalaryState } from './salaryModel';

const KEY = 'kanz.salary.v1';

export interface SalaryApi {
  state: SalaryState;
  ready: boolean;
  update: (fn: (s: SalaryState) => SalaryState) => void;
  /** Edit one month's plan; a borrowed plan is saved as that month's own first. */
  updatePlan: (month: string, fn: (p: MonthPlan) => MonthPlan) => void;
  replace: (next: SalaryState) => void;
}

/**
 * The planner's data lives on this device (IndexedDB) while it is in beta —
 * nothing about salaries is sent to the cloud.
 */
export function useSalary(): SalaryApi {
  const [state, setState] = useState<SalaryState>(emptyState);
  const [ready, setReady] = useState(false);
  const loaded = useRef(false);

  useEffect(() => {
    let alive = true;
    void kvGet<unknown>(KEY).then((v) => {
      if (!alive) return;
      if (v) setState(normalizeState(v));
      loaded.current = true;
      setReady(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (loaded.current) void kvSet(KEY, state);
  }, [state]);

  const update = useCallback((fn: (s: SalaryState) => SalaryState) => setState((s) => fn(s)), []);

  const updatePlan = useCallback(
    (month: string, fn: (p: MonthPlan) => MonthPlan) =>
      setState((s) => {
        const { plan } = planFor(s, month);
        const copy: MonthPlan = { incomes: plan.incomes.map((i) => ({ ...i })), categories: plan.categories.map((c) => ({ ...c })) };
        return { ...s, months: { ...s.months, [month]: fn(copy) } };
      }),
    [],
  );

  const replace = useCallback((next: SalaryState) => setState(next), []);

  return { state, ready, update, updatePlan, replace };
}

/**
 * Salary Planner — data shapes and every calculation, kept free of React so
 * it can be unit-tested. Amounts are plain numbers in the chosen currency.
 */

export type Bucket = 'needs' | 'wants' | 'savings';
export const BUCKETS: Bucket[] = ['needs', 'wants', 'savings'];

export type Currency = 'MAD' | 'EUR' | 'USD' | 'GBP' | 'AED' | 'SAR';
export const CURRENCIES: Currency[] = ['MAD', 'EUR', 'USD', 'GBP', 'AED', 'SAR'];

export type IncomeKind = 'salary' | 'side' | 'bonus' | 'other';

export interface Income {
  id: string;
  name: string;
  amount: number;
  kind: IncomeKind;
}

export interface Category {
  id: string;
  /** Translation key for built-in categories, so they follow the language. */
  key?: string;
  name: string;
  bucket: Bucket;
  planned: number;
  /** A fixed bill (rent, internet…) rather than day-to-day spending. */
  fixed: boolean;
}

export interface MonthPlan {
  incomes: Income[];
  categories: Category[];
}

export interface Txn {
  id: string;
  /** YYYY-MM-DD */
  date: string;
  amount: number;
  categoryId: string;
  note: string;
}

export interface Goal {
  id: string;
  name: string;
  target: number;
  saved: number;
  /** What goes into it each month. */
  monthly: number;
  /** YYYY-MM, optional. */
  deadline?: string;
  emergency?: boolean;
}

export interface Rule {
  needs: number;
  wants: number;
  savings: number;
}

export const RULE_PRESETS: { id: string; rule: Rule }[] = [
  { id: '50-30-20', rule: { needs: 50, wants: 30, savings: 20 } },
  { id: '60-20-20', rule: { needs: 60, wants: 20, savings: 20 } },
  { id: '70-20-10', rule: { needs: 70, wants: 20, savings: 10 } },
  { id: '40-30-30', rule: { needs: 40, wants: 30, savings: 30 } },
];

export interface SalaryState {
  version: 1;
  currency: Currency;
  /** Day of the month the salary lands (1–31). */
  payday: number;
  rule: Rule;
  months: Record<string, MonthPlan>;
  txns: Txn[];
  goals: Goal[];
  hideAmounts: boolean;
  setupDone: boolean;
}

/* ── ids & dates ─────────────────────────────────────────────────────── */

let counter = 0;
export function newId(prefix: string): string {
  counter += 1;
  return `${prefix}_${Date.now().toString(36)}${counter.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

const pad = (n: number): string => String(n).padStart(2, '0');

export function monthKey(d: Date = new Date()): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

export function dayKey(d: Date = new Date()): string {
  return `${monthKey(d)}-${pad(d.getDate())}`;
}

export function shiftMonth(key: string, delta: number): string {
  const [y, m] = key.split('-').map(Number);
  return monthKey(new Date(y, m - 1 + delta, 1));
}

export function daysInMonth(key: string): number {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m, 0).getDate();
}

/** Whole months from `from` (YYYY-MM) to `to` (YYYY-MM); 0 when the same month. */
export function monthsBetween(from: string, to: string): number {
  const [fy, fm] = from.split('-').map(Number);
  const [ty, tm] = to.split('-').map(Number);
  return (ty - fy) * 12 + (tm - fm);
}

/** Next salary date on or after `today`, clamped to short months. */
export function nextPayday(payday: number, today: Date = new Date()): Date {
  const clampTo = (y: number, m: number): Date => new Date(y, m, Math.min(payday, new Date(y, m + 1, 0).getDate()));
  const thisMonth = clampTo(today.getFullYear(), today.getMonth());
  const t0 = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (thisMonth >= t0) return thisMonth;
  return clampTo(today.getFullYear(), today.getMonth() + 1);
}

export function daysUntil(date: Date, today: Date = new Date()): number {
  const a = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const b = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  return Math.round((b - a) / 86_400_000);
}

/* ── defaults ────────────────────────────────────────────────────────── */

/** Built-in categories and their share of their bucket when auto-splitting. */
export const DEFAULT_CATEGORIES: { key: string; bucket: Bucket; share: number; fixed: boolean }[] = [
  { key: 'sal.cat.rent', bucket: 'needs', share: 0.5, fixed: true },
  { key: 'sal.cat.groceries', bucket: 'needs', share: 0.24, fixed: false },
  { key: 'sal.cat.utilities', bucket: 'needs', share: 0.08, fixed: true },
  { key: 'sal.cat.transport', bucket: 'needs', share: 0.1, fixed: false },
  { key: 'sal.cat.phone', bucket: 'needs', share: 0.08, fixed: true },
  { key: 'sal.cat.eatingOut', bucket: 'wants', share: 0.3, fixed: false },
  { key: 'sal.cat.shopping', bucket: 'wants', share: 0.3, fixed: false },
  { key: 'sal.cat.leisure', bucket: 'wants', share: 0.25, fixed: false },
  { key: 'sal.cat.subscriptions', bucket: 'wants', share: 0.15, fixed: true },
  { key: 'sal.cat.emergency', bucket: 'savings', share: 0.5, fixed: true },
  { key: 'sal.cat.invest', bucket: 'savings', share: 0.25, fixed: true },
  { key: 'sal.cat.goals', bucket: 'savings', share: 0.25, fixed: true },
];

/** Round to a friendly figure: tens under 1 000, fifties above. */
export function friendly(n: number): number {
  if (n <= 0) return 0;
  const step = n >= 1000 ? 50 : 10;
  return Math.round(n / step) * step;
}

/** Builds a month plan from one salary and a rule. */
export function autoSplit(salary: number, rule: Rule): MonthPlan {
  const total = rule.needs + rule.wants + rule.savings || 100;
  const categories: Category[] = DEFAULT_CATEGORIES.map((c) => ({
    id: newId('cat'),
    key: c.key,
    name: '',
    bucket: c.bucket,
    planned: friendly((salary * rule[c.bucket] * c.share) / total),
    fixed: c.fixed,
  }));
  // Rounding leaves a few units over or under — settle them in the
  // emergency fund so the plan matches the salary exactly.
  const diff = salary - categories.reduce((a, c) => a + c.planned, 0);
  const fund = categories.find((c) => c.key === 'sal.cat.emergency');
  if (fund) fund.planned = Math.max(0, fund.planned + diff);
  return { incomes: [{ id: newId('inc'), name: '', amount: salary, kind: 'salary' }], categories };
}

export function emptyState(): SalaryState {
  return {
    version: 1,
    currency: 'MAD',
    payday: 1,
    rule: { ...RULE_PRESETS[0].rule },
    months: {},
    txns: [],
    goals: [],
    hideAmounts: false,
    setupDone: false,
  };
}

/* ── loading untrusted data (storage, imported files) ────────────────── */

const num = (v: unknown, fallback = 0): number => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);
const str = (v: unknown, fallback = ''): string => (typeof v === 'string' ? v : fallback);
const isBucket = (v: unknown): v is Bucket => v === 'needs' || v === 'wants' || v === 'savings';
const isMonth = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}$/.test(v);
const isDay = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const obj = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' ? (v as Record<string, unknown>) : {});

function normalizePlan(v: unknown): MonthPlan {
  const p = obj(v);
  return {
    incomes: arr(p.incomes).map((x) => {
      const i = obj(x);
      const kind = (['salary', 'side', 'bonus', 'other'] as const).find((k) => k === i.kind) ?? 'other';
      return { id: str(i.id) || newId('inc'), name: str(i.name), amount: Math.max(0, num(i.amount)), kind };
    }),
    categories: arr(p.categories).map((x) => {
      const c = obj(x);
      return {
        id: str(c.id) || newId('cat'),
        key: typeof c.key === 'string' && c.key.startsWith('sal.cat.') ? c.key : undefined,
        name: str(c.name),
        bucket: isBucket(c.bucket) ? c.bucket : 'needs',
        planned: Math.max(0, num(c.planned)),
        fixed: Boolean(c.fixed),
      };
    }),
  };
}

export function normalizeState(v: unknown): SalaryState {
  const s = obj(v);
  const base = emptyState();
  const r = obj(s.rule);
  const months: Record<string, MonthPlan> = {};
  for (const [k, plan] of Object.entries(obj(s.months))) if (isMonth(k)) months[k] = normalizePlan(plan);
  return {
    version: 1,
    currency: CURRENCIES.find((c) => c === s.currency) ?? base.currency,
    payday: Math.min(31, Math.max(1, Math.round(num(s.payday, 1)))),
    rule: {
      needs: Math.max(0, num(r.needs, base.rule.needs)),
      wants: Math.max(0, num(r.wants, base.rule.wants)),
      savings: Math.max(0, num(r.savings, base.rule.savings)),
    },
    months,
    txns: arr(s.txns)
      .map((x) => {
        const t = obj(x);
        return {
          id: str(t.id) || newId('txn'),
          date: isDay(t.date) ? t.date : dayKey(),
          amount: Math.max(0, num(t.amount)),
          categoryId: str(t.categoryId),
          note: str(t.note).slice(0, 200),
        };
      })
      .filter((t) => t.amount > 0),
    goals: arr(s.goals).map((x) => {
      const g = obj(x);
      return {
        id: str(g.id) || newId('goal'),
        name: str(g.name),
        target: Math.max(0, num(g.target)),
        saved: Math.max(0, num(g.saved)),
        monthly: Math.max(0, num(g.monthly)),
        deadline: isMonth(g.deadline) ? g.deadline : undefined,
        emergency: Boolean(g.emergency),
      };
    }),
    hideAmounts: Boolean(s.hideAmounts),
    setupDone: Boolean(s.setupDone),
  };
}

/* ── month plan lookup ───────────────────────────────────────────────── */

/** The plan for `key`; a month without its own plan borrows the closest
 * earlier one (category ids are kept, so spending stays linked when the
 * borrowed plan is later saved as this month's own). */
export function planFor(state: SalaryState, key: string): { plan: MonthPlan; inherited: boolean } {
  const own = state.months[key];
  if (own) return { plan: own, inherited: false };
  const earlier = Object.keys(state.months)
    .filter((k) => k < key)
    .sort()
    .pop();
  const later = Object.keys(state.months).sort()[0];
  const src = earlier ?? later;
  return { plan: src ? state.months[src] : { incomes: [], categories: [] }, inherited: true };
}

/* ── numbers ─────────────────────────────────────────────────────────── */

const sum = (xs: number[]): number => xs.reduce((a, b) => a + b, 0);

export function totalIncome(plan: MonthPlan): number {
  return sum(plan.incomes.map((i) => i.amount));
}

export function totalPlanned(plan: MonthPlan): number {
  return sum(plan.categories.map((c) => c.planned));
}

export function plannedByBucket(plan: MonthPlan): Record<Bucket, number> {
  const out: Record<Bucket, number> = { needs: 0, wants: 0, savings: 0 };
  for (const c of plan.categories) out[c.bucket] += c.planned;
  return out;
}

export function ruleTargets(income: number, rule: Rule): Record<Bucket, number> {
  const total = rule.needs + rule.wants + rule.savings || 100;
  return {
    needs: (income * rule.needs) / total,
    wants: (income * rule.wants) / total,
    savings: (income * rule.savings) / total,
  };
}

export function txnsInMonth(txns: Txn[], key: string): Txn[] {
  return txns.filter((t) => t.date.startsWith(key));
}

export function spentByCategory(txns: Txn[], key: string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const t of txnsInMonth(txns, key)) out[t.categoryId] = (out[t.categoryId] ?? 0) + t.amount;
  return out;
}

export function spentByBucket(plan: MonthPlan, txns: Txn[], key: string): Record<Bucket, number> {
  const per = spentByCategory(txns, key);
  const out: Record<Bucket, number> = { needs: 0, wants: 0, savings: 0 };
  for (const c of plan.categories) out[c.bucket] += per[c.id] ?? 0;
  return out;
}

/** Spending logged against categories that no longer exist in this plan. */
export function unassignedSpent(plan: MonthPlan, txns: Txn[], key: string): number {
  const ids = new Set(plan.categories.map((c) => c.id));
  return sum(txnsInMonth(txns, key).filter((t) => !ids.has(t.categoryId)).map((t) => t.amount));
}

export interface MonthSummary {
  income: number;
  planned: number;
  /** Income not yet given a job (zero-based budgeting aims for 0). */
  unassigned: number;
  spent: number;
  left: number;
  savingsRate: number;
  byBucket: Record<Bucket, { planned: number; spent: number; target: number }>;
}

export function summarize(state: SalaryState, key: string): MonthSummary {
  const { plan } = planFor(state, key);
  const income = totalIncome(plan);
  const planned = totalPlanned(plan);
  const pb = plannedByBucket(plan);
  const sb = spentByBucket(plan, state.txns, key);
  const tg = ruleTargets(income, state.rule);
  const spent = sum(txnsInMonth(state.txns, key).map((t) => t.amount));
  return {
    income,
    planned,
    unassigned: income - planned,
    spent,
    left: income - spent,
    savingsRate: income > 0 ? pb.savings / income : 0,
    byBucket: {
      needs: { planned: pb.needs, spent: sb.needs, target: tg.needs },
      wants: { planned: pb.wants, spent: sb.wants, target: tg.wants },
      savings: { planned: pb.savings, spent: sb.savings, target: tg.savings },
    },
  };
}

/**
 * What can still be spent each day for the rest of the month without going
 * over the needs + wants plan. `day` is today's day-of-month.
 */
export function safeDaily(summary: MonthSummary, key: string, day: number): number {
  const budget = summary.byBucket.needs.planned + summary.byBucket.wants.planned;
  const spent = summary.byBucket.needs.spent + summary.byBucket.wants.spent;
  const daysLeft = Math.max(1, daysInMonth(key) - day + 1);
  return Math.max(0, budget - spent) / daysLeft;
}

/** Cumulative spending per day of the month, for the pace chart. */
export function dailyCumulative(txns: Txn[], key: string): number[] {
  const days = daysInMonth(key);
  const perDay: number[] = Array.from({ length: days }, () => 0);
  for (const t of txnsInMonth(txns, key)) {
    const d = Number(t.date.slice(8, 10));
    if (d >= 1 && d <= days) perDay[d - 1] += t.amount;
  }
  let run = 0;
  return perDay.map((v) => (run += v));
}

/* ── goals ───────────────────────────────────────────────────────────── */

export interface GoalProgress {
  pct: number;
  remaining: number;
  /** Months to reach the target at the current monthly amount (null = never). */
  monthsLeft: number | null;
  /** YYYY-MM it should be reached in, at the current pace. */
  eta: string | null;
  /** Monthly amount needed to hit the deadline, if one is set. */
  neededMonthly: number | null;
  onTrack: boolean | null;
}

export function goalProgress(g: Goal, now: string = monthKey(), extraMonthly = 0): GoalProgress {
  const remaining = Math.max(0, g.target - g.saved);
  const pct = g.target > 0 ? Math.min(1, g.saved / g.target) : 0;
  const pace = g.monthly + extraMonthly;
  const monthsLeft = remaining === 0 ? 0 : pace > 0 ? Math.ceil(remaining / pace) : null;
  const eta = monthsLeft === null ? null : shiftMonth(now, monthsLeft);
  let neededMonthly: number | null = null;
  let onTrack: boolean | null = null;
  if (g.deadline) {
    const months = Math.max(1, monthsBetween(now, g.deadline));
    neededMonthly = remaining / months;
    onTrack = remaining === 0 || (eta !== null && eta <= g.deadline);
  }
  return { pct, remaining, monthsLeft, eta, neededMonthly, onTrack };
}

/** How many months of essential spending the emergency goals cover. */
export function emergencyCoverage(state: SalaryState, needsPerMonth: number): number | null {
  const saved = sum(state.goals.filter((g) => g.emergency).map((g) => g.saved));
  if (!state.goals.some((g) => g.emergency) || needsPerMonth <= 0) return null;
  return saved / needsPerMonth;
}

/* ── what-if ─────────────────────────────────────────────────────────── */

export interface WhatIf {
  raisePct: number;
  /** Share of the raise that goes to savings (0–100). */
  toSavingsPct: number;
  /** A new fixed monthly cost (a loan, a car…). */
  newCost: number;
}

export interface WhatIfResult {
  income: number;
  raise: number;
  extraSavings: number;
  extraSpending: number;
  savingsRate: number;
  /** Positive = more room each month after the new cost. */
  monthlyRoom: number;
}

export function simulate(summary: MonthSummary, w: WhatIf): WhatIfResult {
  const raise = (summary.income * w.raisePct) / 100;
  const extraSavings = (raise * w.toSavingsPct) / 100;
  const extraSpending = raise - extraSavings;
  const income = summary.income + raise;
  const savings = summary.byBucket.savings.planned + extraSavings;
  return {
    income,
    raise,
    extraSavings,
    extraSpending,
    savingsRate: income > 0 ? savings / income : 0,
    monthlyRoom: summary.unassigned + extraSpending - w.newCost,
  };
}

/* ── export ──────────────────────────────────────────────────────────── */

const csvCell = (v: string | number): string => {
  const s = String(v);
  // Neutralise spreadsheet formulas and quote anything with separators.
  const safe = /^[=+\-@]/.test(s) && typeof v === 'string' ? `'${s}` : s;
  return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

export function toCsv(rows: (string | number)[][]): string {
  return rows.map((r) => r.map(csvCell).join(',')).join('\n');
}

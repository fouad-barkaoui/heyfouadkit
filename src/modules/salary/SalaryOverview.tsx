import { CalendarClock, PiggyBank, ShieldCheck, TrendingDown, Wallet } from 'lucide-react';
import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/state/languageStore';
import {
  BUCKETS,
  dailyCumulative,
  daysUntil,
  emergencyCoverage,
  goalProgress,
  monthKey,
  nextPayday,
  planFor,
  safeDaily,
  spentByCategory,
  type MonthSummary,
  type SalaryState,
} from './salaryModel';
import { BucketDot, BUCKET_ICON_CLASS, Card, Meter, PaceChart, useCategoryName, type Money } from './parts';

export function SalaryOverview({
  state,
  month,
  summary,
  money,
  onGo,
}: {
  state: SalaryState;
  month: string;
  summary: MonthSummary;
  money: Money;
  onGo: (tab: 'plan' | 'spending' | 'goals') => void;
}): JSX.Element {
  const { t, locale } = useLanguage();
  const catName = useCategoryName();
  const now = new Date();
  const thisMonth = monthKey(now);
  const isCurrent = month === thisMonth;
  const isPast = month < thisMonth;
  const daily = safeDaily(summary, month, isCurrent ? now.getDate() : 1);
  const pay = nextPayday(state.payday, now);
  const payIn = daysUntil(pay, now);
  const payLabel = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long' }).format(pay);
  const spendBudget = summary.byBucket.needs.planned + summary.byBucket.wants.planned;

  const { plan } = planFor(state, month);
  const watch = useMemo(() => {
    const spent = spentByCategory(state.txns, month);
    return plan.categories
      .filter((c) => c.bucket !== 'savings' && c.planned + (spent[c.id] ?? 0) > 0)
      .map((c) => ({ c, spent: spent[c.id] ?? 0, ratio: c.planned > 0 ? (spent[c.id] ?? 0) / c.planned : 9 }))
      .sort((a, b) => b.ratio - a.ratio)
      .slice(0, 4);
  }, [plan, state.txns, month]);

  const cover = emergencyCoverage(state, summary.byBucket.needs.planned);
  const goals = state.goals.slice(0, 3);
  const scale = Math.max(summary.income, summary.planned, 1);

  return (
    <div className="sp-grid">
      {/* Hero: what can I spend today */}
      <section className="sp-card sp-hero">
        <p className="sp-eyebrow">
          <Wallet size={14} strokeWidth={1.8} aria-hidden />
          {isCurrent ? t('sal.hero.today') : isPast ? t('sal.hero.past') : t('sal.hero.future')}
        </p>
        <p className="sp-hero-num num">{money(isPast ? summary.left : daily)}</p>
        <p className="sp-hero-sub">
          {isPast
            ? t('sal.hero.pastSub')
            : t('sal.hero.sub', { budget: money(spendBudget) })}
        </p>
        <div className="sp-hero-foot">
          <span className="sp-chip">
            <CalendarClock size={13} strokeWidth={1.8} aria-hidden />
            {payIn === 0 ? t('sal.payday.today') : t('sal.payday.in', { n: payIn, date: payLabel })}
          </span>
          <span className="sp-chip">
            <PiggyBank size={13} strokeWidth={1.8} aria-hidden />
            {t('sal.rate', { pct: Math.round(summary.savingsRate * 100) })}
          </span>
        </div>
      </section>

      <section className="sp-card sp-stat">
        <p className="sp-stat-label">{t('sal.stat.income')}</p>
        <p className="sp-stat-num num">{money(summary.income)}</p>
        <p className="sp-stat-sub">
          {summary.unassigned === 0
            ? t('sal.stat.allAssigned')
            : summary.unassigned > 0
              ? t('sal.stat.toAssign', { amount: money(summary.unassigned) })
              : t('sal.stat.overAssigned', { amount: money(-summary.unassigned) })}
        </p>
      </section>

      <section className="sp-card sp-stat">
        <p className="sp-stat-label">{t('sal.stat.spent')}</p>
        <p className="sp-stat-num num">{money(summary.spent)}</p>
        <p className={cn('sp-stat-sub', summary.left < 0 && 'is-bad')}>
          {summary.left >= 0 ? t('sal.stat.left', { amount: money(summary.left) }) : t('sal.stat.overspent', { amount: money(-summary.left) })}
        </p>
      </section>

      {/* Where the salary goes vs the rule */}
      <Card
        className="sp-span2"
        title={t('sal.split.title')}
        action={
          <button type="button" className="sp-link" onClick={() => onGo('plan')}>
            {t('sal.split.edit')}
          </button>
        }
      >
        <div className="sp-stack" role="img" aria-label={t('sal.split.aria')}>
          {BUCKETS.map((b) => {
            const v = summary.byBucket[b].planned;
            return v > 0 ? (
              <i key={b} className={BUCKET_ICON_CLASS[b]} style={{ flexGrow: v }} title={`${t(`sal.bucket.${b}`)} · ${money(v)}`} />
            ) : null;
          })}
          {summary.unassigned > 0 ? <i className="is-free" style={{ flexGrow: summary.unassigned }} /> : null}
        </div>
        <ul className="sp-rule">
          {BUCKETS.map((b) => {
            const { planned, target } = summary.byBucket[b];
            const pct = summary.income > 0 ? Math.round((planned / summary.income) * 100) : 0;
            const diff = planned - target;
            const goodWhenHigh = b === 'savings';
            const off = Math.abs(diff) > summary.income * 0.02;
            const good = !off || (goodWhenHigh ? diff > 0 : diff < 0);
            return (
              <li key={b}>
                <span className="sp-rule-name">
                  <BucketDot bucket={b} />
                  {t(`sal.bucket.${b}`)}
                </span>
                <span className="sp-rule-bar" aria-hidden>
                  <i className={BUCKET_ICON_CLASS[b]} style={{ width: `${(planned / scale) * 100}%` }} />
                  <b style={{ insetInlineStart: `${(target / scale) * 100}%` }} />
                </span>
                <span className="sp-rule-val num">
                  {money(planned)} <span className="text-ash">· {pct}%</span>
                </span>
                <span className={cn('sp-rule-flag', !good && 'is-off')}>
                  {!off
                    ? t('sal.rule.onTarget')
                    : diff > 0
                      ? t('sal.rule.above', { amount: money(diff) })
                      : t('sal.rule.below', { amount: money(-diff) })}
                </span>
              </li>
            );
          })}
        </ul>
        <p className="sp-foot-note">
          {t('sal.rule.note', { needs: state.rule.needs, wants: state.rule.wants, savings: state.rule.savings })}
        </p>
      </Card>

      <Card className="sp-span2" title={t('sal.pace.title')}>
        <PaceChart
          cumulative={dailyCumulative(state.txns, month)}
          budget={spendBudget + summary.byBucket.savings.planned}
          today={isCurrent ? now.getDate() : isPast ? null : 0}
          money={money}
        />
      </Card>

      <Card
        className="sp-span2"
        title={
          <>
            <TrendingDown size={15} strokeWidth={1.8} aria-hidden /> {t('sal.watch.title')}
          </>
        }
        action={
          <button type="button" className="sp-link" onClick={() => onGo('spending')}>
            {t('sal.watch.log')}
          </button>
        }
      >
        {watch.length ? (
          <div className="sp-meters">
            {watch.map(({ c, spent }) => (
              <Meter key={c.id} spent={spent} planned={c.planned} bucket={c.bucket} money={money} label={catName(c)} />
            ))}
          </div>
        ) : (
          <p className="sp-empty">{t('sal.watch.empty')}</p>
        )}
      </Card>

      <Card
        className="sp-span2"
        title={
          <>
            <ShieldCheck size={15} strokeWidth={1.8} aria-hidden /> {t('sal.goals.title')}
          </>
        }
        action={
          <button type="button" className="sp-link" onClick={() => onGo('goals')}>
            {t('sal.goals.open')}
          </button>
        }
      >
        {cover !== null ? (
          <p className="sp-cover">
            <span className="num">{cover.toFixed(1)}</span>
            {t('sal.cover')}
          </p>
        ) : null}
        {goals.length ? (
          <ul className="sp-goal-mini">
            {goals.map((g) => {
              const p = goalProgress(g, thisMonth);
              return (
                <li key={g.id}>
                  <span className="truncate">{g.name || t('sal.goal.untitled')}</span>
                  <span className="sp-goal-mini-bar" aria-hidden>
                    <i style={{ width: `${p.pct * 100}%` }} />
                  </span>
                  <span className="num text-ash">{Math.round(p.pct * 100)}%</span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="sp-empty">{t('sal.goals.empty')}</p>
        )}
      </Card>
    </div>
  );
}

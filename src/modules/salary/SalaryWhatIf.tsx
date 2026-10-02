import { ArrowRight } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/state/languageStore';
import { goalProgress, monthKey, simulate, type MonthSummary, type SalaryState, type WhatIf } from './salaryModel';
import { AmountInput, Card, type Money } from './parts';

function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  display,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (n: number) => void;
  display: string;
}): JSX.Element {
  return (
    <label className="sp-slider">
      <span className="sp-slider-top">
        <span>{label}</span>
        <b className="num">{display}</b>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ ['--p' as string]: `${((value - min) / (max - min)) * 100}%` }}
      />
    </label>
  );
}

export function SalaryWhatIf({
  state,
  summary,
  money,
  monthLabel,
}: {
  state: SalaryState;
  summary: MonthSummary;
  money: Money;
  monthLabel: (key: string) => string;
}): JSX.Element {
  const { t } = useLanguage();
  const [w, setW] = useState<WhatIf>({ raisePct: 10, toSavingsPct: 50, newCost: 0 });
  const r = simulate(summary, w);
  const now = monthKey();
  const active = state.goals.filter((g) => g.target > g.saved);
  // The extra savings are shared between unfinished goals by how much each still needs.
  const need = active.reduce((a, g) => a + (g.target - g.saved), 0);

  const rows: { label: string; before: string; after: string; better: boolean | null }[] = [
    { label: t('sal.stat.income'), before: money(summary.income), after: money(r.income), better: r.income > summary.income ? true : null },
    {
      label: t('sal.bucket.savings'),
      before: money(summary.byBucket.savings.planned),
      after: money(summary.byBucket.savings.planned + r.extraSavings),
      better: r.extraSavings > 0 ? true : null,
    },
    {
      label: t('sal.what.rate'),
      before: `${Math.round(summary.savingsRate * 100)}%`,
      after: `${Math.round(r.savingsRate * 100)}%`,
      better: r.savingsRate > summary.savingsRate ? true : r.savingsRate < summary.savingsRate ? false : null,
    },
    {
      label: t('sal.what.room'),
      before: money(summary.unassigned),
      after: money(r.monthlyRoom),
      better: r.monthlyRoom > summary.unassigned ? true : r.monthlyRoom < summary.unassigned ? false : null,
    },
  ];

  return (
    <div className="sp-grid">
      <Card className="sp-span2" title={t('sal.what.title')}>
        <p className="sp-bucket-hint">{t('sal.what.intro')}</p>
        <div className="sp-sliders">
          <Slider
            label={t('sal.what.raise')}
            value={w.raisePct}
            min={0}
            max={60}
            step={1}
            display={`+${w.raisePct}% · ${money(r.raise)}`}
            onChange={(n) => setW({ ...w, raisePct: n })}
          />
          <Slider
            label={t('sal.what.toSavings')}
            value={w.toSavingsPct}
            min={0}
            max={100}
            step={5}
            display={`${w.toSavingsPct}%`}
            onChange={(n) => setW({ ...w, toSavingsPct: n })}
          />
          <label className="sp-slider">
            <span className="sp-slider-top">
              <span>{t('sal.what.newCost')}</span>
            </span>
            <AmountInput label={t('sal.what.newCost')} value={w.newCost} onChange={(n) => setW({ ...w, newCost: n })} />
          </label>
        </div>
      </Card>

      <Card className="sp-span2" title={t('sal.what.result')}>
        <table className="sp-compare">
          <thead>
            <tr>
              <th scope="col" />
              <th scope="col">{t('sal.what.now')}</th>
              <th scope="col" aria-hidden />
              <th scope="col">{t('sal.what.then')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label}>
                <th scope="row">{row.label}</th>
                <td className="num">{row.before}</td>
                <td aria-hidden>
                  <ArrowRight size={13} strokeWidth={1.8} className="text-ash rtl:-scale-x-100" />
                </td>
                <td className={cn('num', row.better === true && 'is-up', row.better === false && 'is-down')}>{row.after}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {r.monthlyRoom < 0 ? <p className="sp-warn">{t('sal.what.tight', { amount: money(-r.monthlyRoom) })}</p> : null}
      </Card>

      <Card className="sp-span4" title={t('sal.what.goals')}>
        {active.length ? (
          <ul className="sp-eta">
            {active.map((g) => {
              const share = need > 0 ? (r.extraSavings * (g.target - g.saved)) / need : 0;
              const before = goalProgress(g, now);
              const after = goalProgress(g, now, share);
              const saved = before.monthsLeft !== null && after.monthsLeft !== null ? before.monthsLeft - after.monthsLeft : null;
              return (
                <li key={g.id}>
                  <span className="truncate text-paper">{g.name || t('sal.goal.untitled')}</span>
                  <span className="text-fog">{before.eta ? monthLabel(before.eta) : t('sal.goal.never')}</span>
                  <ArrowRight size={13} strokeWidth={1.8} className="text-ash rtl:-scale-x-100" aria-hidden />
                  <span className="text-paper">{after.eta ? monthLabel(after.eta) : t('sal.goal.never')}</span>
                  <span className={cn('sp-gain', (saved ?? 0) > 0 && 'is-up')}>
                    {saved && saved > 0
                      ? t('sal.what.sooner', { n: saved })
                      : before.monthsLeft === null && after.monthsLeft !== null
                        ? t('sal.what.nowReachable')
                        : '—'}
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="sp-empty">{t('sal.what.noGoals')}</p>
        )}
      </Card>
    </div>
  );
}

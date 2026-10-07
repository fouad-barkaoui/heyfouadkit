import { Lock, Plus, RefreshCw, Trash2, Unlock } from 'lucide-react';
import { useState } from 'react';
import { Select, TextInput } from '@/components/ui/Field';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/state/languageStore';
import {
  autoSplit,
  BUCKETS,
  CURRENCIES,
  newId,
  planFor,
  RULE_PRESETS,
  totalIncome,
  type Bucket,
  type Category,
  type IncomeKind,
  type MonthPlan,
  type MonthSummary,
  type SalaryState,
} from './salaryModel';
import { AmountInput, BucketDot, Card, useCategoryName, type Money } from './parts';
import type { SalaryApi } from './useSalary';

const KINDS: IncomeKind[] = ['salary', 'side', 'bonus', 'other'];

export function SalaryPlan({
  api,
  month,
  summary,
  money,
  monthLabel,
}: {
  api: SalaryApi;
  month: string;
  summary: MonthSummary;
  money: Money;
  monthLabel: string;
}): JSX.Element {
  const { t } = useLanguage();
  const { state, update, updatePlan } = api;
  const { plan, inherited } = planFor(state, month);
  const catName = useCategoryName();
  const [confirmSplit, setConfirmSplit] = useState(false);
  const edit = (fn: (p: MonthPlan) => MonthPlan): void => updatePlan(month, fn);
  const ruleTotal = state.rule.needs + state.rule.wants + state.rule.savings;

  const setCat = (id: string, patch: Partial<Category>): void =>
    edit((p) => ({ ...p, categories: p.categories.map((c) => (c.id === id ? { ...c, ...patch } : c)) }));

  return (
    <div className="sp-grid">
      {inherited && plan.categories.length ? (
        <p className="sp-banner-soft sp-span4">{t('sal.plan.inherited', { month: monthLabel })}</p>
      ) : null}

      {/* Income */}
      <Card
        className="sp-span2"
        title={t('sal.income.title')}
        action={<span className="sp-total num">{money(totalIncome(plan))}</span>}
      >
        <ul className="sp-rows">
          {plan.incomes.map((inc) => (
            <li key={inc.id} className="sp-row">
              <TextInput
                className="sp-row-name"
                aria-label={t('sal.income.name')}
                placeholder={t(`sal.kind.${inc.kind}`)}
                value={inc.name}
                maxLength={60}
                onChange={(e) =>
                  edit((p) => ({ ...p, incomes: p.incomes.map((i) => (i.id === inc.id ? { ...i, name: e.target.value } : i)) }))
                }
              />
              <Select
                aria-label={t('sal.income.kind')}
                value={inc.kind}
                onChange={(e) =>
                  edit((p) => ({
                    ...p,
                    incomes: p.incomes.map((i) => (i.id === inc.id ? { ...i, kind: e.target.value as IncomeKind } : i)),
                  }))
                }
              >
                {KINDS.map((k) => (
                  <option key={k} value={k}>
                    {t(`sal.kind.${k}`)}
                  </option>
                ))}
              </Select>
              <AmountInput
                label={t('sal.amount')}
                value={inc.amount}
                onChange={(n) =>
                  edit((p) => ({ ...p, incomes: p.incomes.map((i) => (i.id === inc.id ? { ...i, amount: n } : i)) }))
                }
              />
              <button
                type="button"
                className="btn-icon btn-icon-danger"
                aria-label={t('sal.remove')}
                onClick={() => edit((p) => ({ ...p, incomes: p.incomes.filter((i) => i.id !== inc.id) }))}
              >
                <Trash2 size={14} strokeWidth={1.7} />
              </button>
            </li>
          ))}
        </ul>
        <button
          type="button"
          className="sp-add"
          onClick={() =>
            edit((p) => ({ ...p, incomes: [...p.incomes, { id: newId('inc'), name: '', amount: 0, kind: p.incomes.length ? 'side' : 'salary' }] }))
          }
        >
          <Plus size={14} strokeWidth={2} aria-hidden /> {t('sal.income.add')}
        </button>
      </Card>

      {/* Settings: rule, payday, currency */}
      <Card className="sp-span2" title={t('sal.rule.title')}>
        <div className="sp-presets" role="radiogroup" aria-label={t('sal.rule.title')}>
          {RULE_PRESETS.map(({ id, rule }) => {
            const on = rule.needs === state.rule.needs && rule.wants === state.rule.wants && rule.savings === state.rule.savings;
            return (
              <button
                key={id}
                type="button"
                role="radio"
                dir="ltr"
                aria-checked={on}
                data-active={on || undefined}
                onClick={() => update((s) => ({ ...s, rule: { ...rule } }))}
              >
                {id.replace(/-/g, ' / ')}
              </button>
            );
          })}
        </div>
        <div className="sp-rule-edit">
          {BUCKETS.map((b) => (
            <label key={b}>
              <span>
                <BucketDot bucket={b} /> {t(`sal.bucket.${b}`)} %
              </span>
              <AmountInput
                label={`${t(`sal.bucket.${b}`)} %`}
                value={state.rule[b]}
                max={100}
                onChange={(n) => update((s) => ({ ...s, rule: { ...s.rule, [b]: n } }))}
              />
            </label>
          ))}
        </div>
        {ruleTotal !== 100 ? <p className="sp-warn">{t('sal.rule.not100', { n: ruleTotal })}</p> : null}
        <div className="sp-rule-edit">
          <label>
            <span>{t('sal.payday.label')}</span>
            <AmountInput
              label={t('sal.payday.label')}
              value={state.payday}
              min={1}
              max={31}
              onChange={(n) => update((s) => ({ ...s, payday: Math.max(1, Math.round(n)) }))}
            />
          </label>
          <label>
            <span>{t('sal.currency')}</span>
            <Select
              aria-label={t('sal.currency')}
              value={state.currency}
              onChange={(e) => update((s) => ({ ...s, currency: e.target.value as SalaryState['currency'] }))}
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </label>
        </div>
        <div className="sp-split-row">
          {confirmSplit ? (
            <>
              <span className="text-[12.5px] text-fog">{t('sal.split.confirm')}</span>
              <button type="button" className="btn btn-ghost" onClick={() => setConfirmSplit(false)}>
                {t('sal.cancel')}
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  const income = totalIncome(plan);
                  const fresh = autoSplit(income, state.rule);
                  edit((p) => ({ incomes: p.incomes.length ? p.incomes : fresh.incomes, categories: fresh.categories }));
                  setConfirmSplit(false);
                }}
              >
                {t('sal.split.yes')}
              </button>
            </>
          ) : (
            <button type="button" className="btn btn-ghost" onClick={() => setConfirmSplit(true)} disabled={totalIncome(plan) <= 0}>
              <RefreshCw size={14} strokeWidth={1.8} aria-hidden /> {t('sal.split.auto')}
            </button>
          )}
        </div>
      </Card>

      {/* Categories per bucket */}
      {BUCKETS.map((b) => (
        <BucketCard
          key={b}
          bucket={b}
          cats={plan.categories.filter((c) => c.bucket === b)}
          planned={summary.byBucket[b].planned}
          target={summary.byBucket[b].target}
          money={money}
          catName={catName}
          onSet={setCat}
          onRemove={(id) => edit((p) => ({ ...p, categories: p.categories.filter((c) => c.id !== id) }))}
          onAdd={() =>
            edit((p) => ({
              ...p,
              categories: [...p.categories, { id: newId('cat'), name: '', bucket: b, planned: 0, fixed: false }],
            }))
          }
        />
      ))}

      <section className={cn('sp-card sp-assign', summary.unassigned < 0 && 'is-bad', summary.unassigned === 0 && 'is-done')}>
        <p className="sp-stat-label">{t('sal.assign.title')}</p>
        <p className="sp-stat-num num">{money(summary.unassigned)}</p>
        <p className="sp-stat-sub">
          {summary.unassigned === 0
            ? t('sal.assign.done')
            : summary.unassigned > 0
              ? t('sal.assign.left')
              : t('sal.assign.over')}
        </p>
      </section>
    </div>
  );
}

function BucketCard({
  bucket,
  cats,
  planned,
  target,
  money,
  catName,
  onSet,
  onRemove,
  onAdd,
}: {
  bucket: Bucket;
  cats: Category[];
  planned: number;
  target: number;
  money: Money;
  catName: (c: Category) => string;
  onSet: (id: string, patch: Partial<Category>) => void;
  onRemove: (id: string) => void;
  onAdd: () => void;
}): JSX.Element {
  const { t } = useLanguage();
  return (
    <Card
      className="sp-bucket"
      title={
        <>
          <BucketDot bucket={bucket} /> {t(`sal.bucket.${bucket}`)}
        </>
      }
      action={
        <span className="sp-total num">
          {money(planned)} <span className="text-ash">/ {money(target)}</span>
        </span>
      }
    >
      <p className="sp-bucket-hint">{t(`sal.bucket.${bucket}.hint`)}</p>
      <ul className="sp-rows">
        {cats.map((c) => (
          <li key={c.id} className="sp-row is-cat">
            <TextInput
              className="sp-row-name"
              aria-label={t('sal.cat.name')}
              placeholder={catName({ key: c.key, name: '' })}
              value={c.name}
              maxLength={40}
              onChange={(e) => onSet(c.id, { name: e.target.value })}
            />
            <AmountInput label={t('sal.amount')} value={c.planned} onChange={(n) => onSet(c.id, { planned: n })} />
            <button
              type="button"
              className={cn('btn-icon', c.fixed && 'is-on')}
              aria-pressed={c.fixed}
              aria-label={t('sal.cat.fixed')}
              title={c.fixed ? t('sal.cat.fixedOn') : t('sal.cat.fixedOff')}
              onClick={() => onSet(c.id, { fixed: !c.fixed })}
            >
              {c.fixed ? <Lock size={13} strokeWidth={1.8} /> : <Unlock size={13} strokeWidth={1.8} />}
            </button>
            <button type="button" className="btn-icon btn-icon-danger" aria-label={t('sal.remove')} onClick={() => onRemove(c.id)}>
              <Trash2 size={14} strokeWidth={1.7} />
            </button>
          </li>
        ))}
      </ul>
      <button type="button" className="sp-add" onClick={onAdd}>
        <Plus size={14} strokeWidth={2} aria-hidden /> {t('sal.cat.add')}
      </button>
    </Card>
  );
}

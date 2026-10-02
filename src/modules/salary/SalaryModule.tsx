import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { ChevronLeft, ChevronRight, Download, Eye, EyeOff, FlaskConical, MoreHorizontal, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { MenuButton } from '@/components/shell/MenuButton';
import { Select } from '@/components/ui/Field';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/state/languageStore';
import {
  autoSplit,
  CURRENCIES,
  monthKey,
  normalizeState,
  planFor,
  RULE_PRESETS,
  shiftMonth,
  summarize,
  toCsv,
  txnsInMonth,
  type Currency,
  type Rule,
} from './salaryModel';
import { AmountInput, useCategoryName, useMoney, useMonthLabel } from './parts';
import { SalaryGoals } from './SalaryGoals';
import { SalaryOverview } from './SalaryOverview';
import { SalaryPlan } from './SalaryPlan';
import { SalarySpending } from './SalarySpending';
import { SalaryWhatIf } from './SalaryWhatIf';
import { useSalary, type SalaryApi } from './useSalary';

type Tab = 'overview' | 'plan' | 'spending' | 'goals' | 'whatif';
const TABS: Tab[] = ['overview', 'plan', 'spending', 'goals', 'whatif'];

function download(name: string, body: string, type: string): void {
  const url = URL.createObjectURL(new Blob([body], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** First visit: one salary, a payday, a currency and a rule → a full plan. */
function Setup({ api }: { api: SalaryApi }): JSX.Element {
  const { t } = useLanguage();
  const [salary, setSalary] = useState(0);
  const [payday, setPayday] = useState(1);
  const [currency, setCurrency] = useState<Currency>('MAD');
  const [rule, setRule] = useState<Rule>(RULE_PRESETS[0].rule);
  return (
    <section className="sp-setup">
      <p className="sp-eyebrow">{t('sal.setup.kicker')}</p>
      <h2 className="sp-setup-title">{t('sal.setup.title')}</h2>
      <p className="sp-setup-text">{t('sal.setup.text')}</p>
      <form
        className="sp-form"
        onSubmit={(e) => {
          e.preventDefault();
          if (salary <= 0) return;
          api.update((s) => ({
            ...s,
            currency,
            payday,
            rule: { ...rule },
            setupDone: true,
            months: { ...s.months, [monthKey()]: autoSplit(salary, rule) },
          }));
        }}
      >
        <label className="is-wide">
          <span>{t('sal.setup.salary')}</span>
          <AmountInput label={t('sal.setup.salary')} value={salary} onChange={setSalary} className="sp-setup-amount" autoFocus />
        </label>
        <label>
          <span>{t('sal.payday.label')}</span>
          <AmountInput label={t('sal.payday.label')} value={payday} min={1} max={31} onChange={(n) => setPayday(Math.max(1, Math.round(n)))} />
        </label>
        <label>
          <span>{t('sal.currency')}</span>
          <Select aria-label={t('sal.currency')} value={currency} onChange={(e) => setCurrency(e.target.value as Currency)}>
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </label>
        <div className="is-wide">
          <span className="sp-form-label">{t('sal.rule.title')}</span>
          <div className="sp-presets" role="radiogroup" aria-label={t('sal.rule.title')}>
            {RULE_PRESETS.map((p) => {
              const on = p.rule === rule;
              return (
                <button key={p.id} type="button" role="radio" dir="ltr" aria-checked={on} data-active={on || undefined} onClick={() => setRule(p.rule)}>
                  {p.id.replace(/-/g, ' / ')}
                </button>
              );
            })}
          </div>
          <p className="sp-bucket-hint mt-2">{t('sal.setup.ruleHint')}</p>
        </div>
        <div className="is-wide flex flex-wrap gap-2">
          <button type="submit" className="btn btn-primary" disabled={salary <= 0}>
            {t('sal.setup.go')}
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => api.update((s) => ({ ...s, setupDone: true }))}>
            {t('sal.setup.blank')}
          </button>
        </div>
      </form>
    </section>
  );
}

export function SalaryModule(): JSX.Element {
  const { t } = useLanguage();
  const api = useSalary();
  const { state, ready, update, replace } = api;
  const [tab, setTab] = useState<Tab>('overview');
  const [month, setMonth] = useState(monthKey());
  const [notice, setNotice] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const money = useMoney(state.currency, state.hideAmounts);
  const monthLabel = useMonthLabel();
  const catName = useCategoryName();
  const summary = summarize(state, month);

  const exportCsv = (): void => {
    const { plan } = planFor(state, month);
    const byId = new Map(plan.categories.map((c) => [c.id, c]));
    const rows: (string | number)[][] = [[t('sal.log.date'), t('sal.log.category'), t('sal.csv.bucket'), t('sal.amount'), t('sal.log.note')]];
    for (const x of txnsInMonth(state.txns, month).sort((a, b) => a.date.localeCompare(b.date))) {
      const c = byId.get(x.categoryId);
      rows.push([x.date, c ? catName(c) : '', c ? t(`sal.bucket.${c.bucket}`) : '', x.amount, x.note]);
    }
    download(`kanz-salary-${month}.csv`, `﻿${toCsv(rows)}`, 'text/csv;charset=utf-8');
  };

  const importJson = async (file: File): Promise<void> => {
    try {
      if (file.size > 2_000_000) throw new Error('too big');
      const data: unknown = JSON.parse(await file.text());
      replace({ ...normalizeState(data), setupDone: true });
      setNotice(t('sal.import.done'));
    } catch {
      setNotice(t('sal.import.failed'));
    }
  };

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col bg-void/78 backdrop-blur-2xl">
      <header className="flex items-center gap-3 border-b border-graphite px-4 py-3.5 md:px-7 md:py-4">
        <MenuButton className="md:hidden" />
        <div className="min-w-0 flex-1">
          <h1 className="flex min-w-0 items-center gap-2 text-[19px] font-medium leading-tight tracking-[-0.016em] text-paper md:text-[21px]">
            <span className="truncate">{t('nav.salary')}</span>
            <span className="sp-beta-pill shrink-0">{t('sal.beta')}</span>
          </h1>
          <p className="mt-1 truncate text-[12.5px] text-ash">{t('sal.subtitle')}</p>
        </div>
        {state.setupDone ? (
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="btn-icon"
              aria-pressed={state.hideAmounts}
              aria-label={state.hideAmounts ? t('sal.show') : t('sal.hide')}
              title={state.hideAmounts ? t('sal.show') : t('sal.hide')}
              onClick={() => update((s) => ({ ...s, hideAmounts: !s.hideAmounts }))}
            >
              {state.hideAmounts ? <EyeOff size={16} strokeWidth={1.7} /> : <Eye size={16} strokeWidth={1.7} />}
            </button>
            <DropdownMenu.Root modal={false}>
              <DropdownMenu.Trigger asChild>
                <button type="button" className="btn-icon" aria-label={t('sal.more')}>
                  <MoreHorizontal size={16} strokeWidth={1.7} />
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content className="sp-menu" align="end" sideOffset={8} collisionPadding={12}>
                  <DropdownMenu.Item className="sp-menu-item" onSelect={exportCsv}>
                    <Download size={14} strokeWidth={1.7} aria-hidden /> {t('sal.export.csv', { month: monthLabel(month) })}
                  </DropdownMenu.Item>
                  <DropdownMenu.Item
                    className="sp-menu-item"
                    onSelect={() => download(`kanz-salary-backup-${monthKey()}.json`, JSON.stringify(state, null, 2), 'application/json')}
                  >
                    <Download size={14} strokeWidth={1.7} aria-hidden /> {t('sal.export.json')}
                  </DropdownMenu.Item>
                  <DropdownMenu.Item className="sp-menu-item" onSelect={() => fileRef.current?.click()}>
                    <Upload size={14} strokeWidth={1.7} aria-hidden /> {t('sal.import')}
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = '';
                if (f) void importJson(f);
              }}
            />
          </div>
        ) : null}
      </header>

      <div className="scroll-y nb-grid-bg min-h-0 flex-1">
        <div className="sp-wrap">
          <div className="sp-beta" role="note">
            <FlaskConical size={15} strokeWidth={1.8} aria-hidden />
            <span>
              <strong>{t('sal.betaBanner.title')}</strong> {t('sal.betaBanner.text')}
            </span>
          </div>

          {notice ? (
            <p className="sp-banner-soft" role="status">
              {notice}
              <button type="button" className="sp-link ms-3" onClick={() => setNotice(null)}>
                {t('sal.dismiss')}
              </button>
            </p>
          ) : null}

          {!ready ? null : !state.setupDone ? (
            <Setup api={api} />
          ) : (
            <>
              <div className="sp-bar">
                <div className="sp-month">
                  <button type="button" className="btn-icon" aria-label={t('sal.month.prev')} onClick={() => setMonth((m) => shiftMonth(m, -1))}>
                    <ChevronLeft size={16} strokeWidth={1.8} className="rtl:-scale-x-100" />
                  </button>
                  <span className="sp-month-label">{monthLabel(month)}</span>
                  <button type="button" className="btn-icon" aria-label={t('sal.month.next')} onClick={() => setMonth((m) => shiftMonth(m, 1))}>
                    <ChevronRight size={16} strokeWidth={1.8} className="rtl:-scale-x-100" />
                  </button>
                  {month !== monthKey() ? (
                    <button type="button" className="sp-link" onClick={() => setMonth(monthKey())}>
                      {t('sal.month.today')}
                    </button>
                  ) : null}
                </div>
                <div className="sp-tabs" role="tablist" aria-label={t('nav.salary')}>
                  {TABS.map((id) => (
                    <button
                      key={id}
                      type="button"
                      role="tab"
                      aria-selected={tab === id}
                      data-active={tab === id || undefined}
                      onClick={() => setTab(id)}
                    >
                      {t(`sal.tab.${id}`)}
                    </button>
                  ))}
                </div>
              </div>

              <div className={cn('sp-panel')} role="tabpanel">
                {tab === 'overview' ? (
                  <SalaryOverview state={state} month={month} summary={summary} money={money} onGo={setTab} />
                ) : tab === 'plan' ? (
                  <SalaryPlan api={api} month={month} summary={summary} money={money} monthLabel={monthLabel(month)} />
                ) : tab === 'spending' ? (
                  <SalarySpending key={month} api={api} month={month} money={money} />
                ) : tab === 'goals' ? (
                  <SalaryGoals api={api} money={money} monthLabel={monthLabel} />
                ) : (
                  <SalaryWhatIf state={state} summary={summary} money={money} monthLabel={monthLabel} />
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

import { Plus, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Select, TextInput } from '@/components/ui/Field';
import { useLanguage } from '@/state/languageStore';
import {
  BUCKETS,
  dayKey,
  monthKey,
  newId,
  planFor,
  spentByCategory,
  txnsInMonth,
  unassignedSpent,
  type Txn,
} from './salaryModel';
import { AmountInput, BucketDot, Card, Meter, useCategoryName, type Money } from './parts';
import type { SalaryApi } from './useSalary';

export function SalarySpending({ api, month, money }: { api: SalaryApi; month: string; money: Money }): JSX.Element {
  const { t, locale } = useLanguage();
  const { state, update } = api;
  const { plan } = planFor(state, month);
  const catName = useCategoryName();
  const catById = useMemo(() => new Map(plan.categories.map((c) => [c.id, c])), [plan.categories]);

  const defaultDate = month === monthKey() ? dayKey() : `${month}-01`;
  const [amount, setAmount] = useState(0);
  const [categoryId, setCategoryId] = useState('');
  const [date, setDate] = useState(defaultDate);
  const [note, setNote] = useState('');
  const pickedCat = catById.has(categoryId) ? categoryId : (plan.categories.find((c) => c.bucket !== 'savings') ?? plan.categories[0])?.id ?? '';

  const spent = spentByCategory(state.txns, month);
  const orphan = unassignedSpent(plan, state.txns, month);
  const list = useMemo(
    () => txnsInMonth(state.txns, month).sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)),
    [state.txns, month],
  );
  const byDay = useMemo(() => {
    const m = new Map<string, Txn[]>();
    for (const x of list) m.set(x.date, [...(m.get(x.date) ?? []), x]);
    return [...m.entries()];
  }, [list]);
  const dayFmt = useMemo(() => new Intl.DateTimeFormat(locale, { weekday: 'short', day: 'numeric', month: 'short' }), [locale]);

  const canAdd = amount > 0 && pickedCat && date.startsWith(month);
  const add = (): void => {
    if (!canAdd) return;
    const txn: Txn = { id: newId('txn'), date, amount, categoryId: pickedCat, note: note.trim().slice(0, 200) };
    update((s) => ({ ...s, txns: [...s.txns, txn] }));
    setAmount(0);
    setNote('');
  };

  return (
    <div className="sp-grid">
      <Card className="sp-span4" title={t('sal.log.title')}>
        {plan.categories.length ? (
          <form
            className="sp-log"
            onSubmit={(e) => {
              e.preventDefault();
              add();
            }}
          >
            <label>
              <span>{t('sal.amount')}</span>
              <AmountInput label={t('sal.amount')} value={amount} onChange={setAmount} />
            </label>
            <label>
              <span>{t('sal.log.category')}</span>
              <Select aria-label={t('sal.log.category')} value={pickedCat} onChange={(e) => setCategoryId(e.target.value)}>
                {BUCKETS.map((b) => (
                  <optgroup key={b} label={t(`sal.bucket.${b}`)}>
                    {plan.categories
                      .filter((c) => c.bucket === b)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {catName(c)}
                        </option>
                      ))}
                  </optgroup>
                ))}
              </Select>
            </label>
            <label>
              <span>{t('sal.log.date')}</span>
              <TextInput
                type="date"
                aria-label={t('sal.log.date')}
                value={date}
                min={`${month}-01`}
                max={`${month}-31`}
                onChange={(e) => setDate(e.target.value)}
              />
            </label>
            <label className="is-wide">
              <span>{t('sal.log.note')}</span>
              <TextInput
                aria-label={t('sal.log.note')}
                placeholder={t('sal.log.notePh')}
                value={note}
                maxLength={200}
                onChange={(e) => setNote(e.target.value)}
              />
            </label>
            <button type="submit" className="btn btn-primary sp-log-btn" disabled={!canAdd}>
              <Plus size={14} strokeWidth={2} aria-hidden /> {t('sal.log.add')}
            </button>
          </form>
        ) : (
          <p className="sp-empty">{t('sal.log.noCats')}</p>
        )}
      </Card>

      <Card className="sp-span2" title={t('sal.byCat.title')}>
        <div className="sp-meters">
          {plan.categories
            .filter((c) => c.planned > 0 || (spent[c.id] ?? 0) > 0)
            .map((c) => (
              <Meter key={c.id} spent={spent[c.id] ?? 0} planned={c.planned} bucket={c.bucket} money={money} label={catName(c)} />
            ))}
        </div>
        {orphan > 0 ? <p className="sp-foot-note">{t('sal.byCat.orphan', { amount: money(orphan) })}</p> : null}
      </Card>

      <Card className="sp-span2" title={t('sal.txns.title', { n: list.length })}>
        {byDay.length ? (
          <div className="sp-days">
            {byDay.map(([d, items]) => {
              const [y, m, dd] = d.split('-').map(Number);
              return (
                <div key={d}>
                  <p className="sp-day-head">
                    <span>{dayFmt.format(new Date(y, m - 1, dd))}</span>
                    <span className="num">{money(items.reduce((a, x) => a + x.amount, 0))}</span>
                  </p>
                  <ul className="sp-txns">
                    {items.map((x) => {
                      const c = catById.get(x.categoryId);
                      return (
                        <li key={x.id}>
                          {c ? <BucketDot bucket={c.bucket} /> : <span className="sp-dot" />}
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-paper">{c ? catName(c) : t('sal.txns.removedCat')}</span>
                            {x.note ? <span className="block truncate text-[12px] text-ash">{x.note}</span> : null}
                          </span>
                          <span className="num">{money(x.amount)}</span>
                          <button
                            type="button"
                            className="btn-icon btn-icon-danger"
                            aria-label={t('sal.remove')}
                            onClick={() => update((s) => ({ ...s, txns: s.txns.filter((y2) => y2.id !== x.id) }))}
                          >
                            <Trash2 size={13} strokeWidth={1.7} />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="sp-empty">{t('sal.txns.empty')}</p>
        )}
      </Card>
    </div>
  );
}

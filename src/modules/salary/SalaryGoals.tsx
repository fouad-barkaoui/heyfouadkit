import { CheckCircle2, Clock, Plus, ShieldCheck, Target, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { TextInput } from '@/components/ui/Field';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/state/languageStore';
import { goalProgress, monthKey, newId, type Goal } from './salaryModel';
import { AmountInput, type Money } from './parts';
import type { SalaryApi } from './useSalary';

function Ring({ pct }: { pct: number }): JSX.Element {
  const r = 26;
  const c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 64 64" width="64" height="64" className="sp-ring" aria-hidden>
      <circle cx="32" cy="32" r={r} className="sp-ring-track" />
      <circle
        cx="32"
        cy="32"
        r={r}
        className="sp-ring-fill"
        strokeDasharray={`${Math.max(pct > 0 ? 3 : 0, pct * c)} ${c}`}
        transform="rotate(-90 32 32)"
      />
    </svg>
  );
}

export function SalaryGoals({
  api,
  money,
  monthLabel,
}: {
  api: SalaryApi;
  money: Money;
  monthLabel: (key: string) => string;
}): JSX.Element {
  const { t } = useLanguage();
  const { state, update } = api;
  const [editing, setEditing] = useState<Goal | null>(null);
  const [topUp, setTopUp] = useState<{ id: string; amount: number } | null>(null);
  const now = monthKey();

  const save = (g: Goal): void => {
    update((s) => ({
      ...s,
      goals: s.goals.some((x) => x.id === g.id) ? s.goals.map((x) => (x.id === g.id ? g : x)) : [...s.goals, g],
    }));
    setEditing(null);
  };

  return (
    <div className="sp-grid">
      <div className="sp-span4 sp-goals-head">
        <p className="text-[13px] text-fog">{t('sal.goals.intro')}</p>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => setEditing({ id: newId('goal'), name: '', target: 0, saved: 0, monthly: 0, emergency: state.goals.length === 0 })}
        >
          <Plus size={14} strokeWidth={2} aria-hidden /> {t('sal.goal.add')}
        </button>
      </div>

      {state.goals.length === 0 ? (
        <section className="sp-card sp-span4 sp-goal-empty">
          <Target size={22} strokeWidth={1.6} aria-hidden />
          <p>{t('sal.goals.emptyLong')}</p>
        </section>
      ) : null}

      {state.goals.map((g) => {
        const p = goalProgress(g, now);
        const done = p.remaining === 0 && g.target > 0;
        return (
          <section key={g.id} className={cn('sp-card sp-goal', done && 'is-done')}>
            <div className="sp-goal-top">
              <div className="sp-goal-ring">
                <Ring pct={p.pct} />
                <span className="num">{Math.round(p.pct * 100)}%</span>
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="sp-goal-name">
                  {g.emergency ? <ShieldCheck size={14} strokeWidth={1.8} aria-label={t('sal.goal.emergency')} /> : null}
                  <span className="truncate">{g.name || t('sal.goal.untitled')}</span>
                </h3>
                <p className="num text-[13px] text-fog">
                  {money(g.saved)} <span className="text-ash">/ {money(g.target)}</span>
                </p>
              </div>
            </div>
            <ul className="sp-goal-facts">
              <li>
                <span>{t('sal.goal.monthly')}</span>
                <b className="num">{money(g.monthly)}</b>
              </li>
              <li>
                <span>{t('sal.goal.eta')}</span>
                <b>
                  {done ? t('sal.goal.reached') : p.eta ? monthLabel(p.eta) : t('sal.goal.never')}
                </b>
              </li>
              {g.deadline ? (
                <li>
                  <span>{t('sal.goal.deadline')}</span>
                  <b className={cn('sp-track', p.onTrack ? 'is-ok' : 'is-late')}>
                    {p.onTrack ? <CheckCircle2 size={12} strokeWidth={2} aria-hidden /> : <Clock size={12} strokeWidth={2} aria-hidden />}
                    {monthLabel(g.deadline)} · {p.onTrack ? t('sal.goal.onTrack') : t('sal.goal.needs', { amount: money(p.neededMonthly ?? 0) })}
                  </b>
                </li>
              ) : null}
            </ul>
            {topUp?.id === g.id ? (
              <form
                className="sp-topup"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (topUp.amount > 0) save({ ...g, saved: g.saved + topUp.amount });
                  setTopUp(null);
                }}
              >
                <AmountInput label={t('sal.goal.addMoney')} value={topUp.amount} onChange={(n) => setTopUp({ id: g.id, amount: n })} autoFocus />
                <button type="submit" className="btn btn-primary">
                  {t('sal.goal.addMoney')}
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => setTopUp(null)}>
                  {t('sal.cancel')}
                </button>
              </form>
            ) : (
              <div className="sp-goal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setTopUp({ id: g.id, amount: g.monthly })}>
                  <Plus size={13} strokeWidth={2} aria-hidden /> {t('sal.goal.addMoney')}
                </button>
                <button type="button" className="btn btn-quiet" onClick={() => setEditing(g)}>
                  {t('sal.edit')}
                </button>
                <button
                  type="button"
                  className="btn-icon btn-icon-danger ms-auto"
                  aria-label={t('sal.remove')}
                  onClick={() => update((s) => ({ ...s, goals: s.goals.filter((x) => x.id !== g.id) }))}
                >
                  <Trash2 size={14} strokeWidth={1.7} />
                </button>
              </div>
            )}
          </section>
        );
      })}

      {editing ? <GoalEditor goal={editing} onCancel={() => setEditing(null)} onSave={save} /> : null}
    </div>
  );
}

function GoalEditor({ goal, onCancel, onSave }: { goal: Goal; onCancel: () => void; onSave: (g: Goal) => void }): JSX.Element {
  const { t } = useLanguage();
  const [g, setG] = useState<Goal>(goal);
  const valid = g.name.trim().length > 0 && g.target > 0;
  return (
    <Modal
      open
      onOpenChange={(o) => (o ? undefined : onCancel())}
      title={goal.name ? t('sal.goal.editTitle') : t('sal.goal.newTitle')}
      description={t('sal.goal.editHint')}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onCancel}>
            {t('sal.cancel')}
          </button>
          <button type="button" className="btn btn-primary" disabled={!valid} onClick={() => onSave({ ...g, name: g.name.trim() })}>
            {t('sal.save')}
          </button>
        </>
      }
    >
      <div className="sp-form">
        <label className="is-wide">
          <span>{t('sal.goal.name')}</span>
          <TextInput value={g.name} maxLength={50} placeholder={t('sal.goal.namePh')} onChange={(e) => setG({ ...g, name: e.target.value })} autoFocus />
        </label>
        <label>
          <span>{t('sal.goal.target')}</span>
          <AmountInput label={t('sal.goal.target')} value={g.target} onChange={(n) => setG({ ...g, target: n })} />
        </label>
        <label>
          <span>{t('sal.goal.saved')}</span>
          <AmountInput label={t('sal.goal.saved')} value={g.saved} onChange={(n) => setG({ ...g, saved: n })} />
        </label>
        <label>
          <span>{t('sal.goal.monthly')}</span>
          <AmountInput label={t('sal.goal.monthly')} value={g.monthly} onChange={(n) => setG({ ...g, monthly: n })} />
        </label>
        <label>
          <span>{t('sal.goal.deadlineOpt')}</span>
          <TextInput
            type="month"
            value={g.deadline ?? ''}
            min={monthKey()}
            onChange={(e) => setG({ ...g, deadline: /^\d{4}-\d{2}$/.test(e.target.value) ? e.target.value : undefined })}
          />
        </label>
        <label className="sp-check is-wide">
          <input type="checkbox" checked={Boolean(g.emergency)} onChange={(e) => setG({ ...g, emergency: e.target.checked })} />
          <span>{t('sal.goal.emergencyLong')}</span>
        </label>
      </div>
    </Modal>
  );
}

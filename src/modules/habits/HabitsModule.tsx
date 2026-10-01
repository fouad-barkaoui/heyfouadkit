import {
  ArrowUpRight,
  Check,
  CheckCircle2,
  Flame,
  ListPlus,
  MoreHorizontal,
  Pencil,
  Plus,
  Send,
  Target,
  Trash2,
  Trophy,
} from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { useMemo, useRef, useState, type CSSProperties, type MouseEvent } from 'react';
import { useStagger } from '@/components/motion/ViewTransition';
import { ModuleLayout } from '@/components/shell/ModuleLayout';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { normalizeTodo } from '@/data/normalize';
import type { Goal, GoalStep, Habit } from '@/lib/types';
import { cn, nowISO, uid } from '@/lib/utils';
import { completionBurst } from '@/modules/todo/burst';
import { translate, useLanguage } from '@/state/languageStore';
import { useUI } from '@/state/uiStore';
import { useRequireAuth } from '@/state/useRequireAuth';
import { useWorkspace } from '@/state/workspaceStore';
import { GoalEditor, HabitEditor } from './Editors';
import {
  addDays,
  bestStreak,
  completionRate,
  currentStreak,
  dayKey,
  goalProgress,
  isScheduled,
  stepDone,
  toggleDay,
} from './habitMath';
import { YearGrid } from './YearGrid';

type Tab = 'habits' | 'goals';

/** Narrow weekday initial (S M T … / ح ن ث …) for a weekday index 0–6. */
function weekdayInitial(day: number, locale: string): string {
  // 2026-09-27 is a Sunday.
  return new Date(2026, 8, 27 + day).toLocaleDateString(locale, { weekday: 'narrow' });
}

/** `key.one` for exactly one, `key` otherwise. */
function plural(key: string, count: number, vars: Record<string, string | number> = {}): string {
  return translate(count === 1 ? `${key}.one` : key, { count, ...vars });
}

export function HabitsModule(): JSX.Element {
  const { workspace, createRecord, updateRecord } = useWorkspace();
  const { setModule } = useUI();
  const { t, locale } = useLanguage();
  const requireAuth = useRequireAuth();

  const habits = useMemo(() => workspace.habits.filter((h) => !h.isDeleted && !h.archived), [workspace.habits]);
  const goals = useMemo(() => workspace.goals.filter((g) => !g.isDeleted), [workspace.goals]);
  const todos = workspace.todos;

  const [tab, setTab] = useState<Tab>('habits');
  const [habitEditor, setHabitEditor] = useState<{ open: boolean; habit: Habit | null }>({ open: false, habit: null });
  const [goalEditor, setGoalEditor] = useState<{ open: boolean; goal: Goal | null }>({ open: false, goal: null });
  const [gridHabit, setGridHabit] = useState<string | 'all'>('all');
  const [query, setQuery] = useState('');

  const today = new Date();
  const todayKey = dayKey(today);
  const dueToday = habits.filter((h) => isScheduled(h, today));
  const doneToday = dueToday.filter((h) => h.log.includes(todayKey)).length;
  const todayPct = dueToday.length ? Math.round((doneToday / dueToday.length) * 100) : 0;

  const stats = useMemo(() => {
    const best = habits.reduce((m, h) => Math.max(m, bestStreak(h)), 0);
    const rate = habits.length ? Math.round(habits.reduce((s, h) => s + completionRate(h), 0) / habits.length) : 0;
    const checkins = habits.reduce((s, h) => s + h.log.length, 0);
    const longestNow = habits.reduce((m, h) => Math.max(m, currentStreak(h)), 0);
    return { best, rate, checkins, longestNow };
  }, [habits]);

  const listRef = useStagger([tab, habits.length, goals.length]);

  /* ── Habit actions ─────────────────────────────────────────────────── */
  const toggle = (h: Habit, key: string, e?: MouseEvent<HTMLElement>): void => {
    if (!requireAuth()) return;
    const turningOn = !h.log.includes(key);
    updateRecord('habits', h.id, { log: toggleDay(h.log, key) });
    if (turningOn && e) completionBurst(e.currentTarget, 18);
  };
  const saveHabit = (h: Habit): void => {
    if (workspace.habits.some((x) => x.id === h.id)) updateRecord('habits', h.id, h);
    else createRecord('habits', h);
  };
  const deleteHabit = (h: Habit): void => {
    updateRecord('habits', h.id, { isDeleted: true, deletedAt: nowISO() });
    setHabitEditor({ open: false, habit: null });
  };

  /* ── Goal actions ──────────────────────────────────────────────────── */
  const saveGoal = (g: Goal): void => {
    if (workspace.goals.some((x) => x.id === g.id)) updateRecord('goals', g.id, g);
    else createRecord('goals', g);
  };
  const patchSteps = (g: Goal, steps: GoalStep[]): void => updateRecord('goals', g.id, { steps });

  const toggleStep = (g: Goal, s: GoalStep, e: MouseEvent<HTMLElement>): void => {
    if (!requireAuth()) return;
    const nowDone = !stepDone(s, todos);
    patchSteps(
      g,
      g.steps.map((x) => (x.id === s.id ? { ...x, done: nowDone } : x)),
    );
    // Keep the linked task in step with the goal.
    if (s.todoId && todos.some((t) => t.id === s.todoId)) {
      updateRecord('todos', s.todoId, { status: nowDone ? 'completed' : 'backlog' });
    }
    if (nowDone) completionBurst(e.currentTarget, 14);
  };

  const sendToTasks = (g: Goal, targets: GoalStep[]): void => {
    if (!requireAuth()) return;
    const created = new Map<string, string>();
    for (const s of targets) {
      if (s.todoId && todos.some((t) => t.id === s.todoId)) continue;
      const todo = normalizeTodo({
        id: uid('todo'),
        title: s.title,
        description: translate('hab.todoDescription', { goal: `${g.emoji} ${g.title}` }),
        priority: 'medium',
        status: 'backlog',
        dueDate: s.dueDate ?? g.dueDate,
        createdAt: nowISO(),
      });
      createRecord('todos', todo);
      created.set(s.id, todo.id);
    }
    if (created.size) patchSteps(g, g.steps.map((x) => (created.has(x.id) ? { ...x, todoId: created.get(x.id)! } : x)));
  };

  const addStep = (g: Goal, title: string): void => {
    const t = title.trim();
    if (!t) return;
    patchSteps(g, [...g.steps, { id: uid('stp'), title: t.slice(0, 200), done: false, todoId: null, dueDate: null }]);
  };

  const removeStep = (g: Goal, s: GoalStep): void => patchSteps(g, g.steps.filter((x) => x.id !== s.id));

  const q = query.trim().toLowerCase();
  const shownHabits = habits.filter((h) => !q || h.name.toLowerCase().includes(q));
  const shownGoals = goals.filter((g) => !q || `${g.title} ${g.why} ${g.steps.map((s) => s.title).join(' ')}`.toLowerCase().includes(q));
  const activeGoals = shownGoals.filter((g) => g.status !== 'achieved');
  const achievedGoals = shownGoals.filter((g) => g.status === 'achieved');

  const gridHabits = gridHabit === 'all' ? habits : habits.filter((h) => h.id === gridHabit);
  const gridColor = gridHabit === 'all' ? '#2dd4a0' : (habits.find((h) => h.id === gridHabit)?.color ?? '#2dd4a0');

  /* ── Panel ─────────────────────────────────────────────────────────── */
  const panel = (
    <div className="space-y-5 pb-3 pt-1">
      <div className="hb-today-card flex items-center gap-3 rounded-[14px] p-3">
        <ProgressRing value={todayPct} size={52} stroke={4} color="#2dd4a0" label={`${todayPct}%`} />
        <div className="min-w-0">
          <p className="text-[13px] text-paper">
            {dueToday.length === 0
              ? t('hab.nothingDue')
              : doneToday === dueToday.length
                ? t('hab.allDone')
                : t('hab.doneOfToday', { done: doneToday, total: dueToday.length })}
          </p>
          <p className="mt-0.5 text-[11.5px] text-ash">
            {stats.longestNow > 0 ? plural('hab.longestActive', stats.longestNow) : t('hab.startStreak')}
          </p>
        </div>
      </div>

      <div>
        <p className="mb-1.5 px-2 text-[10.5px] font-medium uppercase tracking-[0.08em] text-ash">{t('hab.habits')}</p>
        {habits.length === 0 ? <p className="px-2 text-[12px] text-ash">{t('hab.noHabits')}</p> : null}
        {habits.map((h) => {
          const streak = currentStreak(h);
          return (
            <button
              key={h.id}
              type="button"
              className="save-side-row"
              onClick={() => {
                setTab('habits');
                setGridHabit(h.id);
              }}
            >
              <span className="text-[14px] leading-none">{h.emoji}</span>
              <span className="flex-1 truncate text-start">{h.name}</span>
              {streak > 0 ? (
                <span className="inline-flex items-center gap-0.5 text-[11px] text-[#f5a524]">
                  <Flame size={11} strokeWidth={2.2} aria-hidden />
                  {streak}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      <div>
        <p className="mb-1.5 px-2 text-[10.5px] font-medium uppercase tracking-[0.08em] text-ash">{t('hab.goals')}</p>
        {goals.length === 0 ? <p className="px-2 text-[12px] text-ash">{t('hab.noGoals')}</p> : null}
        {goals.map((g) => {
          const p = goalProgress(g, todos);
          return (
            <button key={g.id} type="button" className="save-side-row" onClick={() => setTab('goals')}>
              <span className="text-[14px] leading-none">{g.emoji}</span>
              <span className="flex-1 truncate text-start">{g.title}</span>
              <span className="mono num text-[11px] text-ash">{p.pct}%</span>
            </button>
          );
        })}
      </div>
    </div>
  );

  /* ── Habits tab ────────────────────────────────────────────────────── */
  const habitsView =
    habits.length === 0 ? (
      <EmptyHabits onCreate={() => requireAuth() && setHabitEditor({ open: true, habit: null })} />
    ) : (
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { id: 'today', label: t('hab.stat.today'), value: `${doneToday}/${dueToday.length}`, icon: CheckCircle2 },
            { id: 'best', label: t('hab.stat.best'), value: t('hab.daysShort', { count: stats.best }), icon: Trophy },
            { id: 'rate', label: t('hab.stat.rate'), value: `${stats.rate}%`, icon: Target },
            { id: 'checkins', label: t('hab.stat.checkins'), value: String(stats.checkins), icon: Flame },
          ].map(({ id, label, value, icon: Icon }) => (
            <div key={id} data-stagger className="surface-card p-3.5">
              <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.07em] text-ash">
                <Icon size={12} strokeWidth={2} aria-hidden /> {label}
              </p>
              <p className="num mt-2 text-[24px] font-medium leading-none text-paper">{value}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(min(100%,272px),1fr))]">
          {shownHabits.map((h, i) => {
            const scheduled = isScheduled(h, today);
            const done = h.log.includes(todayKey);
            const streak = currentStreak(h);
            return (
              <article
                key={h.id}
                data-stagger
                className={cn('hb-card group relative overflow-hidden rounded-[16px] p-4', done && 'is-done', !scheduled && 'is-rest')}
                style={{ ['--c' as string]: h.color, ['--i' as string]: i } as CSSProperties}
              >
                <div className="flex items-start gap-3">
                  <span className="hb-emoji-tile flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] text-[22px]">{h.emoji}</span>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-[14.5px] font-medium text-paper">{h.name}</h3>
                    <p className="mt-0.5 flex items-center gap-1.5 overflow-hidden whitespace-nowrap text-[11.5px] text-ash">
                      {streak > 0 ? (
                        <span className="hb-streak inline-flex items-center gap-0.5 font-medium">
                          <Flame size={12} strokeWidth={2.2} aria-hidden /> {t('hab.daysShort', { count: streak })}
                        </span>
                      ) : (
                        <span>{t('hab.noStreak')}</span>
                      )}
                      <span aria-hidden>·</span>
                      <span className="truncate">{h.days.length === 0 ? t('hab.everyDay') : h.days.map((d) => weekdayInitial(d, locale)).join(' ')}</span>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => (scheduled || done ? toggle(h, todayKey, e) : undefined)}
                    aria-pressed={done}
                    aria-label={done ? t('hab.undoToday', { name: h.name }) : t('hab.markToday', { name: h.name })}
                    className={cn('hb-check flex h-11 w-11 shrink-0 items-center justify-center rounded-full', done && 'is-on')}
                    disabled={!scheduled && !done}
                    title={!scheduled && !done ? t('hab.restDay') : undefined}
                  >
                    <Check size={20} strokeWidth={2.6} />
                  </button>
                </div>

                <div className="mt-4 flex items-center justify-between gap-1">
                  {Array.from({ length: 7 }, (_, k) => {
                    const d = addDays(today, k - 6);
                    const key = dayKey(d);
                    const on = h.log.includes(key);
                    const sched = isScheduled(h, d);
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={(e) => toggle(h, key, e)}
                        aria-pressed={on}
                        aria-label={t('hab.dayState', {
                          day: d.toLocaleDateString(locale, { weekday: 'long' }),
                          state: on ? t('hab.done') : t('hab.notDone'),
                        })}
                        className={cn('hb-dot flex flex-col items-center gap-1', k === 6 && 'is-today')}
                      >
                        <span className="text-[10px] text-ash">{weekdayInitial(d.getDay(), locale)}</span>
                        <span className={cn('hb-dot-ball h-6 w-6 rounded-full', on && 'is-on', !sched && 'is-off')} />
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  className="hb-edit btn-icon absolute right-2 top-2"
                  aria-label={t('hab.editName', { name: h.name })}
                  onClick={() => setHabitEditor({ open: true, habit: h })}
                >
                  <Pencil size={13} strokeWidth={2} />
                </button>
              </article>
            );
          })}
          <button
            type="button"
            data-stagger
            className="hb-add flex min-h-[150px] flex-col items-center justify-center gap-2 rounded-[16px] text-[13px] text-fog"
            onClick={() => requireAuth() && setHabitEditor({ open: true, habit: null })}
          >
            <Plus size={20} strokeWidth={1.8} /> {t('hab.newHabit')}
          </button>
        </div>

        <section data-stagger className="surface-card p-4 md:p-5">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <h2 className="me-auto text-[14px] font-medium text-paper">{t('hab.yourYear')}</h2>
            <button type="button" className="pill" data-active={gridHabit === 'all'} onClick={() => setGridHabit('all')}>
              {t('hab.allHabits')}
            </button>
            {habits.map((h) => (
              <button key={h.id} type="button" className="pill" data-active={gridHabit === h.id} onClick={() => setGridHabit(h.id)}>
                {h.emoji} {h.name}
              </button>
            ))}
          </div>
          <YearGrid habits={gridHabits} color={gridColor} />
        </section>
      </div>
    );

  /* ── Goals tab ─────────────────────────────────────────────────────── */
  const goalCard = (g: Goal, i: number): JSX.Element => {
    const p = goalProgress(g, todos);
    const openSteps = g.steps.filter((s) => !stepDone(s, todos) && !(s.todoId && todos.some((t) => t.id === s.todoId)));
    const daysLeft = g.dueDate ? Math.ceil((new Date(g.dueDate).getTime() - Date.now()) / 864e5) : null;
    return (
      <article
        key={g.id}
        data-stagger
        className={cn('gl-card relative overflow-hidden rounded-[18px] p-5', g.status === 'achieved' && 'is-achieved')}
        style={{ ['--c' as string]: g.color, ['--i' as string]: i } as CSSProperties}
      >
        <div className="flex items-start gap-3.5">
          <div className="relative shrink-0">
            <ProgressRing value={p.pct} size={58} stroke={4} color={g.color} />
            <span className="absolute inset-0 flex items-center justify-center text-[22px]">{g.emoji}</span>
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-[16px] font-medium leading-snug tracking-[-0.012em] text-paper">{g.title}</h3>
            <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11.5px] text-ash">
              <span className="num">
                {t('hab.stepsProgress', { done: p.done, total: p.total, pct: p.pct })}
              </span>
              {g.dueDate ? (
                <span className={cn(daysLeft !== null && daysLeft < 0 && g.status !== 'achieved' && 'text-coral')}>
                  ·{' '}
                  {daysLeft !== null && daysLeft >= 0
                    ? plural('hab.daysLeft', daysLeft)
                    : t('hab.wasDue', {
                        date: new Date(g.dueDate).toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' }),
                      })}
                </span>
              ) : null}
              {g.status === 'paused' ? <span className="gl-status">{t('hab.paused')}</span> : null}
              {g.status === 'achieved' ? <span className="gl-status is-win">{t('hab.achieved')}</span> : null}
            </p>
          </div>
          <GoalMenu
            goal={g}
            onEdit={() => setGoalEditor({ open: true, goal: g })}
            onStatus={(status) => updateRecord('goals', g.id, { status })}
            onDelete={() => updateRecord('goals', g.id, { isDeleted: true, deletedAt: nowISO() })}
          />
        </div>

        {g.why ? <p className="gl-why mt-3 rounded-[10px] px-3 py-2 text-[12.5px] leading-[1.55] text-mist">{g.why}</p> : null}

        <ul className="mt-3 space-y-1">
          {g.steps.map((s) => {
            const done = stepDone(s, todos);
            const inTasks = Boolean(s.todoId && todos.some((t) => t.id === s.todoId));
            return (
              <li key={s.id} className="gl-step group/step flex items-center gap-2.5 rounded-[9px] px-1.5 py-1.5">
                <button
                  type="button"
                  onClick={(e) => toggleStep(g, s, e)}
                  aria-pressed={done}
                  aria-label={done ? t('hab.markStepUndone', { title: s.title }) : t('hab.markStepDone', { title: s.title })}
                  className={cn('gl-tick flex h-5 w-5 shrink-0 items-center justify-center rounded-[6px]', done && 'is-on')}
                >
                  {done ? <Check size={13} strokeWidth={3} /> : null}
                </button>
                <span className={cn('min-w-0 flex-1 truncate text-[13px]', done ? 'text-ash line-through' : 'text-mist')}>{s.title}</span>
                {inTasks ? (
                  <button type="button" className="gl-chip is-linked" onClick={() => setModule('todo')} title={t('hab.openInTasks')}>
                    {t('hab.inTasks')} <ArrowUpRight size={11} strokeWidth={2.2} className="rtl:-scale-x-100" />
                  </button>
                ) : !done ? (
                  <button type="button" className="gl-chip" onClick={() => sendToTasks(g, [s])} title={t('hab.createTaskForStep')}>
                    <Send size={11} strokeWidth={2.2} className="rtl:-scale-x-100" /> {t('hab.task')}
                  </button>
                ) : null}
                <button
                  type="button"
                  className="btn-icon h-6 w-6 opacity-0 group-hover/step:opacity-100 focus:opacity-100"
                  aria-label={t('hab.removeStep', { title: s.title })}
                  onClick={() => removeStep(g, s)}
                >
                  <Trash2 size={12} strokeWidth={2} />
                </button>
              </li>
            );
          })}
        </ul>
        <StepAdder onAdd={(t) => addStep(g, t)} />

        <div className="mt-3 flex flex-wrap gap-2">
          {openSteps.length ? (
            <button type="button" className="btn btn-ghost" onClick={() => sendToTasks(g, openSteps)}>
              <ListPlus size={13} strokeWidth={2} /> {plural('hab.sendSteps', openSteps.length)}
            </button>
          ) : null}
          {p.total > 0 && p.done === p.total && g.status !== 'achieved' ? (
            <button type="button" className="btn btn-primary" onClick={(e) => { updateRecord('goals', g.id, { status: 'achieved' }); completionBurst(e.currentTarget, 28); }}>
              <Trophy size={13} strokeWidth={2} /> {t('hab.markAchieved')}
            </button>
          ) : null}
        </div>
      </article>
    );
  };

  const goalsView =
    goals.length === 0 ? (
      <EmptyGoals onCreate={() => requireAuth() && setGoalEditor({ open: true, goal: null })} />
    ) : (
      <div className="space-y-6">
        <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(min(100%,360px),1fr))]">
          {activeGoals.map(goalCard)}
          <button
            type="button"
            data-stagger
            className="hb-add flex min-h-[180px] flex-col items-center justify-center gap-2 rounded-[18px] text-[13px] text-fog"
            onClick={() => requireAuth() && setGoalEditor({ open: true, goal: null })}
          >
            <Target size={20} strokeWidth={1.8} /> {t('hab.newGoal')}
          </button>
        </div>
        {achievedGoals.length ? (
          <section>
            <h2 className="mb-3 flex items-center gap-2 text-[12px] font-medium uppercase tracking-[0.08em] text-ash">
              <Trophy size={13} strokeWidth={2} /> {t('hab.achieved')}
            </h2>
            <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(min(100%,360px),1fr))]">{achievedGoals.map(goalCard)}</div>
          </section>
        ) : null}
      </div>
    );

  return (
    <>
      <ModuleLayout
        panelTitle={t('nav.habits')}
        panelCount={habits.length + goals.length}
        panelSearch={{ value: query, onChange: setQuery, placeholder: t('hab.search') }}
        panel={panel}
        detailOpenOnMobile
        title={t('nav.habits')}
        subtitle={
          tab === 'habits'
            ? dueToday.length
              ? t('hab.habitsDoneToday', { done: doneToday, total: dueToday.length })
              : t('hab.buildStreaks')
            : plural('hab.activeGoals', activeGoals.length)
        }
        actions={
          <div className="flex items-center gap-2">
            <div role="tablist" aria-label={t('hab.section')} className="save-views flex rounded-[10px] p-[3px]">
              {(['habits', 'goals'] as const).map((key) => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={tab === key}
                  onClick={() => setTab(key)}
                  className="save-view-btn inline-flex items-center gap-1.5 rounded-[7px] px-3 py-1.5 text-[12.5px]"
                >
                  {key === 'habits' ? <Flame size={14} strokeWidth={1.9} /> : <Target size={14} strokeWidth={1.9} />}
                  {key === 'habits' ? t('hab.habits') : t('hab.goals')}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="btn btn-primary"
              aria-label={tab === 'habits' ? t('hab.newHabit') : t('hab.newGoal')}
              onClick={() =>
                requireAuth() && (tab === 'habits' ? setHabitEditor({ open: true, habit: null }) : setGoalEditor({ open: true, goal: null }))
              }
            >
              <Plus size={14} strokeWidth={2.2} /> <span className="hidden sm:inline">{tab === 'habits' ? t('hab.newHabit') : t('hab.newGoal')}</span>
            </button>
          </div>
        }
      >
        <div ref={listRef} key={tab} className="anim-rise">
          {tab === 'habits' ? habitsView : goalsView}
        </div>
      </ModuleLayout>

      <HabitEditor
        open={habitEditor.open}
        habit={habitEditor.habit}
        onClose={() => setHabitEditor({ open: false, habit: null })}
        onSave={saveHabit}
        onDelete={deleteHabit}
      />
      <GoalEditor
        open={goalEditor.open}
        goal={goalEditor.goal}
        onClose={() => setGoalEditor({ open: false, goal: null })}
        onSave={saveGoal}
      />
    </>
  );
}

function StepAdder({ onAdd }: { onAdd: (title: string) => void }): JSX.Element {
  const { t } = useLanguage();
  const [v, setV] = useState('');
  const ref = useRef<HTMLInputElement>(null);
  return (
    <form
      className="mt-1 flex items-center gap-2 px-1.5"
      onSubmit={(e) => {
        e.preventDefault();
        onAdd(v);
        setV('');
        ref.current?.focus();
      }}
    >
      <Plus size={14} strokeWidth={2} className="shrink-0 text-ash" aria-hidden />
      <input
        ref={ref}
        value={v}
        onChange={(e) => setV(e.target.value)}
        placeholder={t('hab.addStepPlaceholder')}
        aria-label={t('hab.addStep')}
        className="min-w-0 flex-1 bg-transparent py-1 text-[13px] text-mist outline-none placeholder:text-ash"
      />
    </form>
  );
}

function GoalMenu({
  goal,
  onEdit,
  onStatus,
  onDelete,
}: {
  goal: Goal;
  onEdit: () => void;
  onStatus: (s: Goal['status']) => void;
  onDelete: () => void;
}): JSX.Element {
  const { t } = useLanguage();
  const item =
    'flex cursor-pointer items-center gap-2 rounded-[8px] px-2.5 py-2 text-[13px] text-mist outline-none data-[highlighted]:bg-[rgb(var(--tint-rgb)/0.06)] data-[highlighted]:text-paper';
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger className="btn-icon shrink-0" aria-label={t('hab.goalOptions', { title: goal.title })}>
        <MoreHorizontal size={16} strokeWidth={2} />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="end" sideOffset={6} className="rail-flyout z-50 w-[190px] rounded-[12px] p-1.5">
          <DropdownMenu.Item className={item} onSelect={onEdit}>
            <Pencil size={13} /> {t('hab.editGoal')}
          </DropdownMenu.Item>
          {goal.status !== 'active' ? (
            <DropdownMenu.Item className={item} onSelect={() => onStatus('active')}>
              <Target size={13} /> {t('hab.markActive')}
            </DropdownMenu.Item>
          ) : (
            <DropdownMenu.Item className={item} onSelect={() => onStatus('paused')}>
              <Target size={13} /> {t('hab.pause')}
            </DropdownMenu.Item>
          )}
          {goal.status !== 'achieved' ? (
            <DropdownMenu.Item className={item} onSelect={() => onStatus('achieved')}>
              <Trophy size={13} /> {t('hab.markAchieved')}
            </DropdownMenu.Item>
          ) : null}
          <DropdownMenu.Item className={cn(item, 'text-coral data-[highlighted]:text-coral')} onSelect={onDelete}>
            <Trash2 size={13} /> {t('hab.moveToTrash')}
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

function EmptyHabits({ onCreate }: { onCreate: () => void }): JSX.Element {
  const { t } = useLanguage();
  return (
    <div className="anim-rise mx-auto flex max-w-[520px] flex-col items-center py-12 text-center">
      <div className="hb-empty-flame mb-5 flex h-16 w-16 items-center justify-center rounded-[20px]" aria-hidden>
        <Flame size={30} strokeWidth={1.7} />
      </div>
      <h2 className="text-[20px] font-medium tracking-[-0.018em] text-paper">{t('hab.emptyHabitsTitle')}</h2>
      <p className="mt-2 max-w-[400px] text-[13px] leading-[1.6] text-ash">
        {t('hab.emptyHabitsBody')}
      </p>
      <button type="button" className="btn btn-primary mt-5" onClick={onCreate}>
        <Plus size={14} strokeWidth={2.2} /> {t('hab.emptyHabitsCta')}
      </button>
    </div>
  );
}

function EmptyGoals({ onCreate }: { onCreate: () => void }): JSX.Element {
  const { t } = useLanguage();
  return (
    <div className="anim-rise mx-auto flex max-w-[520px] flex-col items-center py-12 text-center">
      <div className="hb-empty-flame is-goal mb-5 flex h-16 w-16 items-center justify-center rounded-[20px]" aria-hidden>
        <Target size={30} strokeWidth={1.7} />
      </div>
      <h2 className="text-[20px] font-medium tracking-[-0.018em] text-paper">{t('hab.emptyGoalsTitle')}</h2>
      <p className="mt-2 max-w-[400px] text-[13px] leading-[1.6] text-ash">
        {t('hab.emptyGoalsBody')}
      </p>
      <button type="button" className="btn btn-primary mt-5" onClick={onCreate}>
        <Target size={14} strokeWidth={2.2} /> {t('hab.emptyGoalsCta')}
      </button>
    </div>
  );
}

import { HeartPulse, Pill, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useStagger } from '@/components/motion/ViewTransition';
import { ModuleLayout } from '@/components/shell/ModuleLayout';
import { Button, IconButton } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import type { Medicine, TreatmentPlan } from '@/lib/types';
import { nowISO } from '@/lib/utils';
import { useLanguage } from '@/state/languageStore';
import { useRequireAuth } from '@/state/useRequireAuth';
import { useWorkspace } from '@/state/workspaceStore';
import { MedicineCard } from './MedicineCard';
import { MedicineEditor } from './MedicineEditor';
import { TreatmentPlanCard } from './TreatmentPlanCard';
import { TreatmentPlanEditor } from './TreatmentPlanEditor';

type FilterMode = 'all' | 'scheduled' | 'as_needed';

function AddChoiceModal({
  open,
  onOpenChange,
  onPickMedicine,
  onPickPlan,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPickMedicine: () => void;
  onPickPlan: () => void;
}): JSX.Element {
  const { t } = useLanguage();
  return (
    <Modal open={open} onOpenChange={onOpenChange} title={t('med.add.title')} description={t('med.add.description')}>
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        <button
          type="button"
          onClick={onPickMedicine}
          className="flex flex-col items-start gap-2.5 rounded-[10px] bg-[rgb(var(--tint-rgb)/0.03)] p-3.5 text-start shadow-[inset_0_0_0_1px_var(--color-graphite)] transition-shadow hover:shadow-[inset_0_0_0_1px_var(--color-smoke)]"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-[9px] bg-acid/15 text-accent">
            <Pill size={16} strokeWidth={1.8} />
          </span>
          <span>
            <span className="block text-[13.5px] text-paper">{t('med.add.medicine')}</span>
            <span className="mt-0.5 block text-[12px] leading-[1.5] text-ash">
              {t('med.add.medicineHint')}
            </span>
          </span>
        </button>
        <button
          type="button"
          onClick={onPickPlan}
          className="flex flex-col items-start gap-2.5 rounded-[10px] bg-[rgb(var(--tint-rgb)/0.03)] p-3.5 text-start shadow-[inset_0_0_0_1px_var(--color-graphite)] transition-shadow hover:shadow-[inset_0_0_0_1px_var(--color-smoke)]"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-[9px] bg-lavender/15 text-lavender">
            <HeartPulse size={16} strokeWidth={1.8} />
          </span>
          <span>
            <span className="block text-[13.5px] text-paper">{t('med.add.plan')}</span>
            <span className="mt-0.5 block text-[12px] leading-[1.5] text-ash">
              {t('med.plan.description')}
            </span>
          </span>
        </button>
      </div>
    </Modal>
  );
}

export function MedicationsModule(): JSX.Element {
  const { workspace, createRecord, updateRecord } = useWorkspace();
  const requireAuth = useRequireAuth();
  const { t } = useLanguage();

  const medicines = useMemo(() => workspace.medicines.filter((m) => !m.isDeleted), [workspace.medicines]);
  const plans = useMemo(() => workspace.treatmentPlans.filter((p) => !p.isDeleted), [workspace.treatmentPlans]);

  const [filter, setFilter] = useState<FilterMode>('all');
  const [query, setQuery] = useState('');

  const [choiceOpen, setChoiceOpen] = useState(false);
  const [medEditorOpen, setMedEditorOpen] = useState(false);
  const [editingMed, setEditingMed] = useState<Medicine | null>(null);
  const [medForPlan, setMedForPlan] = useState<string | null>(null);
  const [planEditorOpen, setPlanEditorOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<TreatmentPlan | null>(null);

  const unassigned = useMemo(() => {
    const q = query.trim().toLowerCase();
    return medicines
      .filter((m) => m.treatmentPlanId === null)
      .filter((m) => filter === 'all' || m.type === filter)
      .filter((m) => !q || m.name.toLowerCase().includes(q));
  }, [medicines, filter, query]);

  const activePlans = useMemo(() => plans.filter((p) => p.status === 'active'), [plans]);

  const contentRef = useStagger([filter, query, medicines.length, plans.length]);

  const openNewMedicine = (planId?: string): void => {
    if (!requireAuth()) return;
    setEditingMed(null);
    setMedForPlan(planId ?? null);
    setChoiceOpen(false);
    setMedEditorOpen(true);
  };

  const openEditMedicine = (med: Medicine): void => {
    setEditingMed(med);
    setMedForPlan(null);
    setMedEditorOpen(true);
  };

  const openNewPlan = (): void => {
    if (!requireAuth()) return;
    setEditingPlan(null);
    setChoiceOpen(false);
    setPlanEditorOpen(true);
  };

  const openEditPlan = (plan: TreatmentPlan): void => {
    setEditingPlan(plan);
    setPlanEditorOpen(true);
  };

  const saveMedicine = (med: Medicine): void => {
    if (medicines.some((m) => m.id === med.id)) updateRecord('medicines', med.id, med);
    else createRecord('medicines', med);
  };

  const savePlan = (plan: TreatmentPlan): void => {
    if (plans.some((p) => p.id === plan.id)) {
      updateRecord('treatmentPlans', plan.id, plan);
      setEditingPlan(plan);
    } else {
      createRecord('treatmentPlans', plan);
      setEditingPlan(plan);
    }
  };

  const planMedicines = (planId: string): Medicine[] => medicines.filter((m) => m.treatmentPlanId === planId);

  return (
    <>
      <ModuleLayout
        panelTitle={t('med.panelTitle')}
        panelCount={medicines.length}
        panelActions={
          <IconButton label={t('med.add.title')} onClick={() => setChoiceOpen(true)}>
            <Plus size={15} strokeWidth={1.9} />
          </IconButton>
        }
        panelSearch={{ value: query, onChange: setQuery, placeholder: t('med.searchPlaceholder') }}
        panelFilters={
          <div className="flex flex-wrap gap-1.5">
            {(['all', 'scheduled', 'as_needed'] as FilterMode[]).map((f) => (
              <button key={f} type="button" className="pill" data-active={filter === f} onClick={() => setFilter(f)}>
                {f === 'all' ? t('med.filter.all') : f === 'scheduled' ? t('med.type.scheduled') : t('med.type.asNeeded')}
              </button>
            ))}
          </div>
        }
        panel={
          <div>
            {plans.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => openEditPlan(p)}
                className="mb-[3px] flex w-full items-center gap-2.5 rounded-[6px] px-2.5 py-2 text-start transition-colors duration-120 hover:bg-[rgb(var(--tint-rgb)/0.035)]"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[6px] bg-lavender/15 text-lavender">
                  <HeartPulse size={12} strokeWidth={1.8} />
                </span>
                <span className="min-w-0 flex-1 truncate text-[12.5px] text-mist">{p.condition}</span>
              </button>
            ))}
          </div>
        }
        title={t('nav.medications')}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            <span className="num">
              {medicines.length === 1
                ? t('med.subtitle.medicines.one', { count: medicines.length })
                : t('med.subtitle.medicines.many', { count: medicines.length })}
            </span>
            <span aria-hidden>·</span>
            <span className="num">
              {activePlans.length === 1
                ? t('med.subtitle.activePlans.one', { count: activePlans.length })
                : t('med.subtitle.activePlans.many', { count: activePlans.length })}
            </span>
          </span>
        }
        actions={
          <Button variant="primary" icon={<Plus size={14} strokeWidth={2} />} onClick={() => setChoiceOpen(true)}>
            {t('med.add.button')}
          </Button>
        }
        detailOpenOnMobile
      >
        <div ref={contentRef} className="mx-auto max-w-[900px] space-y-7">
          <section>
            <div className="mb-3 flex items-center gap-2.5">
              <h2 className="text-[13px] font-medium tracking-[-0.011em] text-paper">{t('med.section.plans')}</h2>
              <span className="h-px flex-1 bg-graphite" aria-hidden />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {plans.map((p) => (
                <div key={p.id} data-stagger>
                  <TreatmentPlanCard plan={p} medicines={planMedicines(p.id)} onClick={() => openEditPlan(p)} />
                </div>
              ))}
              <button
                type="button"
                onClick={openNewPlan}
                data-stagger
                className="flex min-h-[128px] flex-col items-center justify-center gap-2 rounded-[12px] p-4 text-center shadow-[inset_0_0_0_1px_var(--color-graphite)] transition-colors hover:bg-[rgb(var(--tint-rgb)/0.03)]"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-[9px] bg-[rgb(var(--tint-rgb)/0.05)] text-ash">
                  <HeartPulse size={16} strokeWidth={1.7} />
                </span>
                <span className="text-[12.5px] text-mist">{t('med.plan.createCard')}</span>
                <span className="max-w-[180px] text-[11px] leading-[1.4] text-ash">
                  {t('med.plan.createCardHint')}
                </span>
              </button>
            </div>
          </section>

          <section>
            <div className="mb-3 flex items-center gap-2.5">
              <h2 className="text-[13px] font-medium tracking-[-0.011em] text-paper">{t('med.section.individual')}</h2>
              <span className="h-px flex-1 bg-graphite" aria-hidden />
              <span className="mono num text-[11px] text-ash">{unassigned.length}</span>
            </div>
            {unassigned.length === 0 ? (
              <EmptyState
                icon={<Pill size={18} strokeWidth={1.6} />}
                title={medicines.length === 0 ? t('med.empty.none') : t('med.empty.allGrouped')}
                hint={t('med.empty.hint')}
                action={
                  <Button variant="primary" icon={<Plus size={14} strokeWidth={2} />} onClick={() => openNewMedicine()}>
                    {t('med.editor.newTitle')}
                  </Button>
                }
              />
            ) : (
              <div className="space-y-2">
                {unassigned.map((m) => (
                  <div key={m.id} data-stagger>
                    <MedicineCard medicine={m} onClick={() => openEditMedicine(m)} />
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </ModuleLayout>

      <AddChoiceModal
        open={choiceOpen}
        onOpenChange={setChoiceOpen}
        onPickMedicine={() => openNewMedicine()}
        onPickPlan={openNewPlan}
      />

      <MedicineEditor
        open={medEditorOpen}
        onOpenChange={setMedEditorOpen}
        medicine={editingMed}
        treatmentPlanId={medForPlan}
        onSave={saveMedicine}
        onDelete={(id) => {
          updateRecord('medicines', id, { isDeleted: true, deletedAt: nowISO() });
          setMedEditorOpen(false);
        }}
        onComplete={(id) => {
          updateRecord('medicines', id, { completed: true });
          setMedEditorOpen(false);
        }}
      />

      <TreatmentPlanEditor
        open={planEditorOpen}
        onOpenChange={setPlanEditorOpen}
        plan={editingPlan}
        unassignedMedicines={medicines.filter((m) => m.treatmentPlanId === null)}
        assignedMedicines={editingPlan ? planMedicines(editingPlan.id) : []}
        onSave={savePlan}
        onAssign={(medicineId, planId) => updateRecord('medicines', medicineId, { treatmentPlanId: planId })}
        onUnassign={(medicineId) => updateRecord('medicines', medicineId, { treatmentPlanId: null })}
        onUngroup={(planId) => {
          for (const m of planMedicines(planId)) updateRecord('medicines', m.id, { treatmentPlanId: null });
          updateRecord('treatmentPlans', planId, { isDeleted: true, deletedAt: nowISO() });
          setPlanEditorOpen(false);
        }}
        onComplete={(planId) => {
          updateRecord('treatmentPlans', planId, { status: 'completed' });
          setEditingPlan((p) => (p ? { ...p, status: 'completed' } : p));
        }}
      />
    </>
  );
}

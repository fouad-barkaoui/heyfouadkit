import { ArrowDown, ArrowUp } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { ConfirmDelete } from '@/components/ui/ConfirmDelete';
import { FieldRow, Label, TextInput } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import type { Medicine, TreatmentPlan } from '@/lib/types';
import { nowISO, uid } from '@/lib/utils';
import { frequencyLabel } from './medsMeta';

export function TreatmentPlanEditor({
  open,
  onOpenChange,
  plan,
  unassignedMedicines,
  assignedMedicines,
  onSave,
  onAssign,
  onUnassign,
  onUngroup,
  onComplete,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: TreatmentPlan | null;
  /** Medicines not currently attached to any plan — candidates to pull in. */
  unassignedMedicines: Medicine[];
  /** Medicines currently attached to this plan. */
  assignedMedicines: Medicine[];
  onSave: (plan: TreatmentPlan) => void;
  onAssign: (medicineId: string, planId: string) => void;
  onUnassign: (medicineId: string) => void;
  onUngroup?: (planId: string) => void;
  onComplete?: (planId: string) => void;
}): JSX.Element {
  const [condition, setCondition] = useState('');
  const [prescriber, setPrescriber] = useState('');
  const [touched, setTouched] = useState(false);
  const [ownerId, setOwnerId] = useState('');

  useEffect(() => {
    if (!open) return;
    setTouched(false);
    setCondition(plan?.condition ?? '');
    setPrescriber(plan?.prescriber ?? '');
    setOwnerId(plan?.id ?? uid('plan'));
  }, [open, plan]);

  const valid = condition.trim().length > 0;

  const submit = (): void => {
    setTouched(true);
    if (!valid) return;
    const base: TreatmentPlan = plan ?? {
      id: ownerId,
      condition: '',
      prescriber: '',
      status: 'active',
      createdAt: nowISO(),
      updatedAt: nowISO(),
    };
    onSave({
      ...base,
      condition: condition.trim(),
      prescriber: prescriber.trim() || 'Self-managed',
      updatedAt: nowISO(),
    });
    if (!plan) onOpenChange(false);
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={plan ? 'Edit treatment plan' : 'Create treatment plan'}
      description="Group medicines by condition, doctor, or goal."
      width="lg"
      footer={
        <div className="flex w-full items-center justify-between gap-2">
          {plan ? (
            <div className="flex items-center gap-2">
              {onUngroup ? (
                <ConfirmDelete onConfirm={() => onUngroup(plan.id)} label="Ungroup plan" />
              ) : null}
              {onComplete && plan.status !== 'completed' ? (
                <Button onClick={() => onComplete(plan.id)}>Complete</Button>
              ) : null}
            </div>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            <Button onClick={() => onOpenChange(false)}>{plan ? 'Done' : 'Cancel'}</Button>
            <Button variant="primary" onClick={submit}>
              {plan ? 'Save changes' : 'Create plan'}
            </Button>
          </div>
        </div>
      }
    >
      <FieldRow>
        <Label htmlFor="plan-condition">Condition / goal</Label>
        <TextInput
          id="plan-condition"
          autoFocus
          value={condition}
          onChange={(e) => setCondition(e.target.value)}
          placeholder="What is it treatment for? (e.g. Tooth Infection)"
        />
        {touched && !valid ? <p className="mt-1.5 text-[12px] text-coral">A condition or goal is required.</p> : null}
      </FieldRow>

      <FieldRow>
        <Label htmlFor="plan-prescriber">Prescriber</Label>
        <TextInput
          id="plan-prescriber"
          value={prescriber}
          onChange={(e) => setPrescriber(e.target.value)}
          placeholder="Self-managed, or Dr. Chen…"
        />
      </FieldRow>

      {plan ? (
        <div className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <p className="mb-2 text-[10.5px] font-medium uppercase tracking-[0.08em] text-ash">In this plan</p>
            <div className="space-y-1.5">
              {assignedMedicines.length === 0 ? (
                <p className="py-3 text-[12px] text-ash">No medicines assigned yet.</p>
              ) : (
                assignedMedicines.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center gap-2 rounded-[6px] bg-[rgb(var(--tint-rgb)/0.03)] px-2.5 py-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12.5px] text-paper">{m.name}</p>
                      <p className="text-[11px] text-ash">
                        {m.dosage} {m.unit} · {frequencyLabel(m)}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="btn-icon"
                      aria-label={`Remove ${m.name} from plan`}
                      onClick={() => onUnassign(m.id)}
                    >
                      <ArrowDown size={13} strokeWidth={1.9} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div>
            <p className="mb-2 text-[10.5px] font-medium uppercase tracking-[0.08em] text-ash">Available</p>
            <div className="space-y-1.5">
              {unassignedMedicines.length === 0 ? (
                <p className="py-3 text-[12px] text-ash">Every medicine is already assigned somewhere.</p>
              ) : (
                unassignedMedicines.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center gap-2 rounded-[6px] bg-[rgb(var(--tint-rgb)/0.03)] px-2.5 py-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12.5px] text-paper">{m.name}</p>
                      <p className="text-[11px] text-ash">
                        {m.dosage} {m.unit} · {frequencyLabel(m)}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="btn-icon"
                      aria-label={`Add ${m.name} to plan`}
                      onClick={() => onAssign(m.id, plan.id)}
                    >
                      <ArrowUp size={13} strokeWidth={1.9} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}

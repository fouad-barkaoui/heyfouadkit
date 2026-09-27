import * as Dialog from '@radix-ui/react-dialog';
import { ArrowRight, CalendarDays, ListChecks, NotebookPen, type LucideIcon } from 'lucide-react';
import { getDisplayName, useAuth } from '@/state/authStore';

interface QuickAction {
  icon: LucideIcon;
  gradient: string;
  title: string;
  body: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    icon: NotebookPen,
    gradient: 'from-[#8b5cf6] to-[#6366f1]',
    title: 'Capture your notes',
    body: 'Write freeform notes and keep everything searchable in one place.',
  },
  {
    icon: ListChecks,
    gradient: 'from-[#0f9c8f] to-[#02b8cc]',
    title: 'Plan your tasks',
    body: 'Track work across a list, board, matrix, or timeline view.',
  },
  {
    icon: CalendarDays,
    gradient: 'from-[#ec4899] to-[#f472b6]',
    title: 'Stay on schedule',
    body: 'See tasks and deadlines laid out on your calendar at a glance.',
  },
];

/**
 * The first thing a person sees right after signing in or creating an
 * account — never on a silent session restore. Dismissable only by
 * continuing, so it always hands off cleanly to the terms popup that follows.
 * Styled as its own light "quick actions" card, independent of the app's
 * dark/light theme, matching the same on-ramp visual language as AuthOverlay.
 */
export function WelcomeModal({ open, onContinue }: { open: boolean; onContinue: () => void }): JSX.Element {
  const { user } = useAuth();
  const name = getDisplayName(user);

  return (
    <Dialog.Root open={open} onOpenChange={(next) => { if (!next) onContinue(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[70] bg-[rgba(10,10,14,0.6)] backdrop-blur-sm data-[state=open]:animate-[nx-fade_220ms_var(--ease-out-quint)_both]" />
        <Dialog.Content
          onEscapeKeyDown={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
          className="fixed left-1/2 top-1/2 z-[70] w-[calc(100vw-24px)] max-w-[400px] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl bg-white p-6 shadow-[0_2px_10px_rgba(0,0,0,0.06),0_24px_60px_rgba(0,0,0,0.35)] data-[state=open]:animate-[nx-scale-in_240ms_var(--ease-out-quint)_both]"
        >
          <Dialog.Title className="text-[21px] font-semibold tracking-[-0.02em] text-[#141414]">
            Quick actions
          </Dialog.Title>
          <Dialog.Description className="mt-1 text-[13px] text-[#6b6b66]">
            Welcome{name ? `, ${name}` : ''} — here's a few things you can do right away.
          </Dialog.Description>

          <div className="mt-5 space-y-2.5">
            {QUICK_ACTIONS.map(({ icon: Icon, gradient, title, body }) => (
              <div
                key={title}
                className="flex items-center gap-3 rounded-[14px] border border-[#efeef9] bg-gradient-to-b from-[#faf9ff] to-white p-3"
              >
                <span
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] bg-gradient-to-br text-white shadow-[0_6px_14px_rgba(99,102,241,0.28)] ${gradient}`}
                >
                  <Icon size={19} strokeWidth={1.9} aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="text-[13.5px] font-semibold text-[#141414]">{title}</p>
                  <p className="mt-0.5 text-[12px] leading-[1.4] text-[#8a8a84]">{body}</p>
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={onContinue}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-[10px] bg-[#141414] py-2.5 text-[13.5px] font-medium text-white transition-colors duration-150 hover:bg-[#2a2a2a]"
          >
            Continue
            <ArrowRight size={13.5} strokeWidth={2} />
          </button>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

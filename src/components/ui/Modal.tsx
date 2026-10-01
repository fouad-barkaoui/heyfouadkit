import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { IconButton } from './Button';
import { useI18n } from './useI18n';

export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  width = 'md',
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  width?: 'sm' | 'md' | 'lg' | 'xl';
}): JSX.Element {
  const widthClass = {
    sm: 'max-w-[420px]',
    md: 'max-w-[560px]',
    lg: 'max-w-[760px]',
    xl: 'max-w-[1040px]',
  }[width];
  const { t } = useI18n();

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-void/72 backdrop-blur-[3px] data-[state=open]:animate-[nx-fade_180ms_var(--ease-out-quint)_both]" />
        <Dialog.Content
          className={cn(
            // Sized and centred on the *visible* screen (--vvh / --vv-top track
            // the visual viewport), so a phone's toolbars and keyboard never
            // push the footer's Save / Create button out of reach.
            'modal-frame fixed left-1/2 z-50 flex w-[calc(100vw-24px)] -translate-x-1/2 -translate-y-1/2 flex-col',
            'overflow-hidden rounded-[12px] bg-carbon',
            'shadow-[inset_0_0_0_1px_var(--color-graphite),0_4px_32px_0_rgba(8,9,10,0.7)]',
            'data-[state=open]:animate-[nx-scale-in_220ms_var(--ease-out-quint)_both]',
            widthClass,
          )}
        >
          <div className="flex shrink-0 items-start justify-between gap-4 border-b border-graphite px-5 py-4 max-sm:px-4 max-sm:py-3">
            <div className="min-w-0">
              <Dialog.Title className="truncate text-[15px] font-medium tracking-[-0.012em] text-paper">
                {title}
              </Dialog.Title>
              {description ? (
                <Dialog.Description className="mt-1 text-[12.5px] text-fog">{description}</Dialog.Description>
              ) : null}
            </div>
            <Dialog.Close asChild>
              <IconButton label={t('sh.close')} className="-me-1 -mt-1 shrink-0">
                <X size={15} strokeWidth={1.75} />
              </IconButton>
            </Dialog.Close>
          </div>

          <div className="scroll-y min-h-0 flex-1 overscroll-contain px-5 py-4 max-sm:px-4">{children}</div>

          {footer ? (
            <div className="modal-foot flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-graphite bg-void/40 px-5 py-3.5 max-sm:px-4 max-sm:py-3">
              {footer}
            </div>
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

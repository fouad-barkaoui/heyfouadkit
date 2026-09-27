import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { IconButton } from './Button';

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

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-void/72 backdrop-blur-[3px] data-[state=open]:animate-[nx-fade_180ms_var(--ease-out-quint)_both]" />
        <Dialog.Content
          className={cn(
            'fixed left-1/2 top-1/2 z-50 w-[calc(100vw-24px)] -translate-x-1/2 -translate-y-1/2',
            'max-h-[88vh] overflow-hidden rounded-[12px] bg-carbon',
            'shadow-[inset_0_0_0_1px_var(--color-graphite),0_4px_32px_0_rgba(8,9,10,0.7)]',
            'data-[state=open]:animate-[nx-scale-in_220ms_var(--ease-out-quint)_both]',
            widthClass,
          )}
        >
          <div className="flex items-start justify-between gap-4 border-b border-graphite px-5 py-4">
            <div className="min-w-0">
              <Dialog.Title className="truncate text-[15px] font-medium tracking-[-0.012em] text-paper">
                {title}
              </Dialog.Title>
              {description ? (
                <Dialog.Description className="mt-1 text-[12.5px] text-fog">{description}</Dialog.Description>
              ) : null}
            </div>
            <Dialog.Close asChild>
              <IconButton label="Close" className="-mr-1 -mt-1 shrink-0">
                <X size={15} strokeWidth={1.75} />
              </IconButton>
            </Dialog.Close>
          </div>

          <div className="scroll-y max-h-[calc(88vh-120px)] px-5 py-4">{children}</div>

          {footer ? (
            <div className="flex items-center justify-end gap-2 border-t border-graphite bg-void/40 px-5 py-3.5">
              {footer}
            </div>
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

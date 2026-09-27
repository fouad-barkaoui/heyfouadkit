import type { ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes, InputHTMLAttributes } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Label({ children, htmlFor }: { children: ReactNode; htmlFor?: string }): JSX.Element {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.06em] text-ash"
    >
      {children}
    </label>
  );
}

export function FieldRow({ children, className }: { children: ReactNode; className?: string }): JSX.Element {
  return <div className={cn('mb-4 last:mb-0', className)}>{children}</div>;
}

export function TextInput({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>): JSX.Element {
  return <input className={cn('field', className)} {...rest} />;
}

export function TextArea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>): JSX.Element {
  return <textarea className={cn('field resize-y leading-[1.6]', className)} {...rest} />;
}

export function Select({
  className,
  children,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement>): JSX.Element {
  return (
    <div className="relative">
      <select className={cn('field appearance-none pr-8', className)} {...rest}>
        {children}
      </select>
      <ChevronDown
        size={14}
        strokeWidth={1.75}
        className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-ash"
        aria-hidden
      />
    </div>
  );
}

import { useEffect, useState } from 'react';
import { BadgeChip } from '@/components/ui/BadgeChip';
import { Button } from '@/components/ui/Button';
import { FieldRow, Label, TextInput } from '@/components/ui/Field';
import { DynamicIcon, ICON_NAMES } from '@/components/ui/Icon';
import { Modal } from '@/components/ui/Modal';
import type { Badge, BadgeScope } from '@/lib/types';
import { cn, nowISO, tint, uid } from '@/lib/utils';
import { useLanguage } from '@/state/languageStore';

const SWATCHES = [
  '#e4f222',
  '#27a644',
  '#eb5757',
  '#02b8cc',
  '#6366f1',
  '#8b5cf6',
  '#d0d6e0',
  '#8a8f98',
];

const HEX = /^#[0-9a-fA-F]{6}$/;

/**
 * Badge creator. Scope is fixed by the module that opened it — Course Hub and
 * Docs Storage keep separate namespaces so neither list fills with the other's
 * tags.
 */
export function BadgeEditor({
  open,
  onOpenChange,
  scope,
  badge,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scope: BadgeScope;
  badge: Badge | null;
  onSave: (badge: Badge) => void;
}): JSX.Element {
  const { t } = useLanguage();
  const [name, setName] = useState('');
  const [color, setColor] = useState('#6366f1');
  const [icon, setIcon] = useState('tag');
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTouched(false);
    setName(badge?.name ?? '');
    setColor(badge?.colorHex ?? '#6366f1');
    setIcon(badge?.iconName ?? 'tag');
  }, [open, badge]);

  const validName = name.trim().length > 0;
  const validColor = HEX.test(color);

  const preview: Badge = {
    id: badge?.id ?? 'preview',
    name: name.trim() || t('badge.previewName'),
    colorHex: validColor ? color : '#6366f1',
    iconName: icon,
    category: scope,
    createdAt: badge?.createdAt ?? nowISO(),
  };

  const submit = (): void => {
    setTouched(true);
    if (!validName || !validColor) return;
    onSave({
      id: badge?.id ?? uid('bdg'),
      name: name.trim(),
      colorHex: color,
      iconName: icon,
      category: scope,
      createdAt: badge?.createdAt ?? nowISO(),
    });
    onOpenChange(false);
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={badge ? t('badge.editTitle') : t('badge.newTitle')}
      description={
        scope === 'doc'
          ? t('badge.scope.doc')
          : scope === 'course'
            ? t('badge.scope.course')
            : t('badge.scope.workspace')
      }
      footer={
        <>
          <Button onClick={() => onOpenChange(false)}>{t('badge.cancel')}</Button>
          <Button variant="primary" onClick={submit}>
            {badge ? t('badge.save') : t('badge.create')}
          </Button>
        </>
      }
    >
      <div className="mb-5 flex items-center justify-center rounded-[8px] bg-[rgb(var(--tint-rgb)/0.02)] py-6 shadow-[inset_0_0_0_1px_var(--color-graphite)]">
        <BadgeChip badge={preview} />
      </div>

      <FieldRow>
        <Label htmlFor="badge-name">{t('badge.nameLabel')}</Label>
        <TextInput
          id="badge-name"
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('badge.namePlaceholder')}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit();
          }}
        />
        {touched && !validName ? <p className="mt-1.5 text-[12px] text-coral">{t('badge.nameRequired')}</p> : null}
      </FieldRow>

      <FieldRow>
        <Label>{t('badge.colourLabel')}</Label>
        <div className="flex flex-wrap items-center gap-2">
          {SWATCHES.map((swatch) => (
            <button
              key={swatch}
              type="button"
              aria-label={t('badge.useColour', { colour: swatch })}
              onClick={() => setColor(swatch)}
              className={cn(
                'h-7 w-7 rounded-[6px] transition-transform duration-150 hover:scale-105',
                color.toLowerCase() === swatch && 'ring-1 ring-offset-2 ring-offset-carbon',
              )}
              style={{
                backgroundColor: tint(swatch, 0.24),
                boxShadow: `inset 0 0 0 1px ${swatch}`,
                ...(color.toLowerCase() === swatch ? { outline: `1px solid ${swatch}`, outlineOffset: '2px' } : {}),
              }}
            />
          ))}
          <TextInput
            aria-label={t('badge.customHex')}
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="ms-1 w-[104px] font-mono text-[12.5px] uppercase"
            placeholder="#6366f1"
          />
        </div>
        {touched && !validColor ? (
          <p className="mt-1.5 text-[12px] text-coral">{t('badge.hexInvalid')}</p>
        ) : null}
      </FieldRow>

      <FieldRow>
        <Label>{t('badge.iconLabel')}</Label>
        <div className="grid grid-cols-9 gap-1.5 rounded-[6px] bg-[rgb(var(--tint-rgb)/0.02)] p-2 shadow-[inset_0_0_0_1px_var(--color-graphite)]">
          {ICON_NAMES.map((n) => (
            <button
              key={n}
              type="button"
              aria-label={t('badge.iconOption', { name: n })}
              title={n}
              onClick={() => setIcon(n)}
              className={cn(
                'flex h-7 w-full items-center justify-center rounded-[5px] transition-colors duration-120',
                icon === n ? 'bg-white/10 text-paper' : 'text-fog hover:bg-[rgb(var(--tint-rgb)/0.06)] hover:text-mist',
              )}
            >
              <DynamicIcon name={n} size={14} />
            </button>
          ))}
        </div>
      </FieldRow>
    </Modal>
  );
}

import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

export interface DropdownItem {
  id: string;
  label: string;
  badge?: string;
  badgeColor?: 'acid' | 'amber' | 'coral' | 'teal' | 'fog';
  icon?: JSX.Element;
  subItems?: DropdownItem[];
  onSelect?: () => void;
}

interface HierarchicalDropdownProps {
  trigger: JSX.Element;
  items: DropdownItem[];
  align?: 'start' | 'center' | 'end';
}

function renderBadgeColor(color?: string): string {
  switch (color) {
    case 'acid':
      return 'bg-acid/10 text-acid';
    case 'amber':
      return 'bg-amber-500/10 text-amber-500';
    case 'coral':
      return 'bg-coral/10 text-coral';
    case 'teal':
      return 'bg-teal-500/10 text-teal-500';
    case 'fog':
      return 'bg-fog/10 text-fog';
    default:
      return 'bg-[rgb(var(--tint-rgb)/0.1)] text-ash';
  }
}

function DropdownItemComp({
  item,
  onSelect,
}: {
  item: DropdownItem;
  onSelect: () => void;
}): JSX.Element {
  const [openSubmenu, setOpenSubmenu] = useState(false);

  if (item.subItems && item.subItems.length > 0) {
    return (
      <DropdownMenu.Sub open={openSubmenu} onOpenChange={setOpenSubmenu}>
        <DropdownMenu.SubTrigger
          className="px-3 py-1.5 text-[12px] cursor-pointer transition-colors duration-150 flex items-center justify-between gap-2 text-paper hover:bg-[rgb(var(--tint-rgb)/0.05)]"
          onClick={(e) => e.preventDefault()}
        >
          <span className="flex items-center gap-2">
            {item.icon}
            {item.label}
          </span>
          <ChevronRight size={13} strokeWidth={1.8} className={cn(
            'text-ash transition-transform duration-150',
            openSubmenu && 'rotate-90',
          )} />
        </DropdownMenu.SubTrigger>

        <DropdownMenu.Portal>
          <DropdownMenu.SubContent
            className="z-40 min-w-[160px] rounded-[6px] bg-void/95 backdrop-blur-md shadow-[0_4px_12px_rgba(0,0,0,0.3)] border border-graphite py-1"
            sideOffset={-2}
            alignOffset={-4}
          >
            {item.subItems.map((subItem) => (
              <DropdownItemComp
                key={subItem.id}
                item={subItem}
                onSelect={() => {
                  subItem.onSelect?.();
                  onSelect();
                }}
              />
            ))}
          </DropdownMenu.SubContent>
        </DropdownMenu.Portal>
      </DropdownMenu.Sub>
    );
  }

  return (
    <DropdownMenu.Item
      onClick={() => {
        item.onSelect?.();
        onSelect();
      }}
      className="px-3 py-1.5 text-[12px] cursor-pointer transition-colors duration-150 flex items-center justify-between gap-2 text-paper hover:bg-[rgb(var(--tint-rgb)/0.05)]"
    >
      <span className="flex items-center gap-2">
        {item.icon}
        {item.label}
      </span>
      {item.badge ? (
        <span className={cn(
          'px-1.5 py-0.5 rounded-[3px] text-[10px] font-medium whitespace-nowrap',
          renderBadgeColor(item.badgeColor),
        )}>
          {item.badge}
        </span>
      ) : null}
    </DropdownMenu.Item>
  );
}

export function HierarchicalDropdown({
  trigger,
  items,
  align = 'end',
}: HierarchicalDropdownProps): JSX.Element {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        {trigger}
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="z-40 min-w-[200px] rounded-[8px] bg-void/95 backdrop-blur-md shadow-[0_4px_12px_rgba(0,0,0,0.3)] border border-graphite py-1"
          align={align}
          sideOffset={8}
        >
          {items.map((item) => (
            <DropdownItemComp
              key={item.id}
              item={item}
              onSelect={() => {
                /* close parent menu */
              }}
            />
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

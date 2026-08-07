import * as React from 'react';
import { type IconName } from '@leta-io/icons';
import { MobileMenuOptions, type MobileMenuOptionType } from '../MobileMenuOptions/MobileMenuOptions.js';

export interface MobileDropdownOption {
  label: string;
  type?: MobileMenuOptionType;
  leadingIcon?: IconName;
  showLeadingIcon?: boolean;
  active?: boolean;
  selected?: boolean;
  disabled?: boolean;
  onSelect?: (next: boolean) => void;
}

export interface MobileDropdownProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children'> {
  /** Rows to render as `MobileMenuOptions`. */
  options?: MobileDropdownOption[];
  /** Override the rows entirely. */
  children?: React.ReactNode;
  /** Max panel height before the list scrolls. Default 248 (Figma). */
  maxHeight?: number;
}

/**
 * Mobile Dropdown — the phone version of the floating menu panel: a white, rounded,
 * bordered card with a soft shadow that stacks **Mobile Menu Options** rows and
 * scrolls when the list is long. It's the mobile counterpart of Desktop Dropdowns,
 * used by mobile selects and the mobile map search. Pass the rows via `options`
 * (or override them with `children`).
 *
 * **When to use:** for any mobile overlay that lets the user pick from a list.
 * **When not to use:** for full-screen sheets or dialogs.
 */
export const MobileDropdown = React.forwardRef<HTMLDivElement, MobileDropdownProps>(function MobileDropdown(
  { options, children, maxHeight = 248, style, ...rest },
  ref,
) {
  return (
    <div
      ref={ref}
      style={{
        boxSizing: 'border-box',
        width: '100%',
        maxHeight,
        overflowY: 'auto',
        overscrollBehavior: 'contain',
        padding: '8px 8px 0 8px',
        borderRadius: 'var(--rounding-xl)',
        backgroundColor: 'var(--surface-neutral-bg-default)',
        boxShadow: 'inset 0 0 0 var(--stroke-xs) var(--border-neutral-default), var(--shadow-neutral-2)',
        ...style,
      }}
      {...rest}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4px)', paddingBottom: 8 }}>
        {children ??
          options?.map((o, i) => (
            <MobileMenuOptions
              key={i}
              type={o.type}
              label={o.label}
              leadingIcon={o.leadingIcon}
              showLeadingIcon={o.showLeadingIcon}
              active={o.active}
              selected={o.selected}
              disabled={o.disabled}
              onSelect={o.onSelect}
            />
          ))}
      </div>
    </div>
  );
});

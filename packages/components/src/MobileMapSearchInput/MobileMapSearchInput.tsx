import * as React from 'react';
import { type IconName } from '@leta-io/icons';
import { SearchField } from '../SearchInput/SearchField.js';
import { MobileDropdown } from '../MobileDropdown/MobileDropdown.js';

export interface MobileMapSearchInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /** Placeholder. Default "Search here...". */
  placeholder?: string;
  /** Leading icon. Default `Search`. */
  icon?: IconName;
  /** Show the attached results panel. Default true. */
  open?: boolean;
  /** Notified when the clear (×) is clicked. Optional — the field clears itself. */
  onClear?: () => void;
  /** Results-panel body — defaults to a `MobileDropdown` of `MobileMenuOptions` rows. */
  children?: React.ReactNode;
  disabled?: boolean;
}

/**
 * Mobile-map search — the `Search Input` type of Data Entry `38:42` (Mobile Map
 * variant): a pill `--surface-neutral-alt-search-field` field with an attached
 * `MobileDropdown` results panel holding a list of `MobileMenuOptions` rows
 * (pass your own via `children`).
 *
 * The field shows a trailing clear (×) — always while the panel is open, and as soon
 * as the closed field has text. Clicking it clears the field and fires `onClear`.
 */
export const MobileMapSearchInput = React.forwardRef<HTMLInputElement, MobileMapSearchInputProps>(function MobileMapSearchInput(
  {
    placeholder = 'Search here...',
    icon = 'Search',
    open = true,
    onClear,
    children,
    disabled = false,
    value,
    defaultValue,
    onChange,
    className,
    style,
    ...inputProps
  },
  ref,
) {
  return (
    <div className={className} style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 'var(--spacing-8px)', width: 350, boxSizing: 'border-box', ...style }}>
      {/* Pill field — carries the component's drop shadow (Neutral Drop Shadow 1). */}
      <div style={{ borderRadius: 'var(--rounding-round)', boxShadow: 'var(--shadow-neutral-1)' }}>
        <SearchField
          ref={ref}
          surfaceVar="var(--surface-neutral-alt-search-field)"
          radiusVar="var(--rounding-round)"
          icon={icon}
          placeholder={placeholder}
          onClear={onClear}
          showClear={open}
          disabled={disabled}
          value={value}
          defaultValue={defaultValue}
          onChange={onChange}
          {...inputProps}
        />
      </div>
      {open && (
        <MobileDropdown
          maxHeight={248}
          options={children ? undefined : [
            { label: 'LTA-ID-001' },
            { label: 'Michael', active: true },
            { label: 'Kitisuru' },
            { label: 'Westlands' },
          ]}
        >
          {children}
        </MobileDropdown>
      )}
    </div>
  );
});

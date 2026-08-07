import * as React from 'react';
import { type IconName } from '@leta-io/icons';
import { SearchField } from '../SearchInput/SearchField.js';

export interface MobileSearchInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /** Placeholder. Default "Search here...". */
  placeholder?: string;
  /** Leading icon. Default `Search`. */
  icon?: IconName;
  /** Optional label above the field (hidden by default). */
  label?: string;
  /** Optional helper text below the field (hidden by default). */
  helperText?: string;
  /** Notified when the clear (×) is clicked. Optional — the field clears itself. */
  onClear?: () => void;
  disabled?: boolean;
}

/**
 * Mobile search field — the `Search Input` type of Data Entry `38:42` (Mobile
 * variant): a pill `--rounding-round` field on `--surface-neutral-input-field`.
 * (Desktop is `SearchInput`; the map variants are `MapSearchInput` /
 * `MobileMapSearchInput`.)
 *
 * A trailing clear (×) button appears automatically as soon as the field has text
 * and clears it on click (also firing `onClear`); it's hidden while the field is empty.
 */
export const MobileSearchInput = React.forwardRef<HTMLInputElement, MobileSearchInputProps>(function MobileSearchInput(
  { placeholder = 'Search here...', icon = 'Search', label, helperText, onClear, disabled = false, value, defaultValue, onChange, className, style, ...inputProps },
  ref,
) {
  const field = (
    <SearchField
      ref={ref}
      surfaceVar="var(--surface-neutral-input-field)"
      radiusVar="var(--rounding-round)"
      icon={icon}
      placeholder={placeholder}
      onClear={onClear}
      disabled={disabled}
      value={value}
      defaultValue={defaultValue}
      onChange={onChange}
      {...inputProps}
    />
  );

  if (!label && !helperText) {
    return <div className={className} style={{ width: 350, boxSizing: 'border-box', ...style }}>{field}</div>;
  }
  return (
    <div className={className} style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 'var(--spacing-8px)', width: 350, boxSizing: 'border-box', ...style }}>
      {label && (
        <span className="text-label-m-medium" style={{ color: 'var(--text-default-label-idle)' }}>{label}</span>
      )}
      {field}
      {helperText && (
        <span className="text-label-s-regular" style={{ color: 'var(--text-default-helper)' }}>{helperText}</span>
      )}
    </div>
  );
});

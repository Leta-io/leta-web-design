import * as React from 'react';
import { Icon, type IconName } from '@leta-io/icons';
import { SearchField } from './SearchField.js';

export interface SearchInputProps
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
  /** Error state — error-colored field border + an error message row below. */
  error?: boolean;
  /** The error message text (shown when `error`). Default "Enter a valid character/value". */
  errorMessage?: string;
  disabled?: boolean;
}

/**
 * Desktop search field — the `Search Input` type of Data Entry `38:42` (Desktop
 * variant): `--rounding-lg` field on `--surface-neutral-search-field`. The mobile,
 * web-map and mobile-map variants are the separate `MobileSearchInput`,
 * `MapSearchInput` and `MobileMapSearchInput` components.
 *
 * A trailing clear (×) button appears automatically as soon as the field has text
 * and clears it on click (also firing `onClear`); it's hidden while the field is empty.
 *
 * **Error state** (`error`) — mirrors Figma's Desktop/Error variant: the field
 * border turns `--border-error-default` and an error message row (`Icon/Error` +
 * `--text-error-label` text) renders below the field.
 */
export const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(function SearchInput(
  {
    placeholder = 'Search here...',
    icon = 'Search',
    label,
    helperText,
    onClear,
    error = false,
    errorMessage = 'Enter a valid character/value',
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
  const field = (
    <SearchField
      ref={ref}
      surfaceVar="var(--surface-neutral-search-field)"
      radiusVar="var(--rounding-lg)"
      icon={icon}
      placeholder={placeholder}
      onClear={onClear}
      error={error}
      disabled={disabled}
      value={value}
      defaultValue={defaultValue}
      onChange={onChange}
      {...inputProps}
    />
  );

  // Error message row — Figma `Error Message`: Icon/Error (16) + 12px label, gap 8.
  const errorRow = error ? (
    <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-8px)' }}>
      <span style={{ flexShrink: 0, display: 'flex', color: 'var(--icons-error-default)' }}>
        <Icon name="Error" outlined={false} size={16} />
      </span>
      <span className="text-label-s-regular" style={{ color: 'var(--text-error-label)' }}>{errorMessage}</span>
    </span>
  ) : null;

  if (!label && !helperText && !error) {
    return <div className={className} style={{ width: 350, boxSizing: 'border-box', ...style }}>{field}</div>;
  }
  return (
    <div className={className} style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 'var(--spacing-8px)', width: 350, boxSizing: 'border-box', ...style }}>
      {label && (
        <span className="text-label-m-medium" style={{ color: 'var(--text-default-label-idle)' }}>{label}</span>
      )}
      {field}
      {errorRow}
      {helperText && !error && (
        <span className="text-label-s-regular" style={{ color: 'var(--text-default-helper)' }}>{helperText}</span>
      )}
    </div>
  );
});

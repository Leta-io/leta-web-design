import * as React from 'react';
import { Icon, type IconName } from '@leta-io/icons';
import { FieldChrome } from '../InputField/FieldChrome.js';

/**
 * Select — the field acts as a select trigger: a read-only field box with a
 * trailing chevron that opens a menu/overlay (owned by the consumer). The
 * `Select` type of Data Entry `38:42` (Variant=Basic). Visually identical to
 * the field box of Input Field; clicking the box fires `onSelectClick`.
 *
 * The field box carries `data-field-box` — a stable hook for consumers that
 * anchor a popover/overlay to this control. Anchoring to the outer (labelled)
 * wrapper instead measures a rect that includes the label above the box, which
 * throws off overlay flip-above positioning (the panel lands level with the
 * label, not the visible field).
 */
export interface SelectProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /** Label text. */
  label?: string;
  /** Show the label section. Default true. */
  showLabel?: boolean;
  /** Show an Info marker after the label. */
  showLabelIcon?: boolean;
  /** The label marker icon. Default `Info` (outlined). */
  labelIcon?: IconName;
  /** Optional/Required tag after the label. Default `none`. */
  tag?: 'none' | 'optional' | 'required';
  /** Icon inside the field, before the value. */
  leadingFieldIcon?: IconName;
  /** Currency/unit prefix shown before the value (e.g. "KES"). */
  currency?: string;
  /** Helper text below the field. */
  helperText?: string;
  /** Show the helper/message line. Default true. */
  showHelper?: boolean;
  /** Error message — turns the border red + shows an error icon. */
  error?: string;
  /** Warning message — shows a warning icon (border unchanged). */
  warning?: string;
  /** Right-aligned control on the label row. */
  labelToggle?: React.ReactNode;
  /** Fired when the field/chevron is clicked (open the menu/overlay). */
  onSelectClick?: () => void;
}

const STYLE_ID = 'leta-select-styles';
const STYLES = `
  .leta-select__input {
    border: 0;
    outline: none;
    background: transparent;
    padding: 0;
    margin: 0;
    width: 100%;
    min-width: 0;
    cursor: inherit;
  }
  .leta-select__input::placeholder { color: var(--text-default-placeholder); opacity: 1; }
  .leta-select__input:disabled { cursor: not-allowed; }
  .leta-select__input:disabled::placeholder { color: var(--text-disabled-placeholder-disabled); }
`;

function ensureStyles(): void {
  if (typeof document === 'undefined') return;
  if (document.getElementById(STYLE_ID)) return;
  const el = document.createElement('style');
  el.id = STYLE_ID;
  el.textContent = STYLES;
  document.head.appendChild(el);
}

export const Select = React.forwardRef<HTMLInputElement, SelectProps>(function Select(
  {
    label = 'Label Text',
    showLabel = true,
    showLabelIcon = false,
    labelIcon = 'Info',
    tag = 'none',
    leadingFieldIcon,
    currency,
    helperText = 'Helper text goes here',
    showHelper = true,
    error,
    warning,
    labelToggle,
    onSelectClick,
    placeholder = 'Field Text',
    disabled = false,
    value,
    defaultValue,
    className,
    style,
    ...inputProps
  },
  ref,
) {
  ensureStyles();

  const [focused, setFocused] = React.useState(false);

  const borderColor = disabled
    ? 'var(--border-disabled-default)'
    : error
      ? 'var(--border-error-default)'
      : focused
        ? 'var(--border-secondary-component-focus)'
        : 'var(--border-neutral-default)';

  const fieldBoxStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 'var(--spacing-16px)',
    width: '100%',
    flexShrink: 0,
    boxSizing: 'border-box',
    height: 40,
    padding: '0 var(--padding-12px)',
    borderRadius: 'var(--rounding-lg)',
    backgroundColor: disabled ? 'var(--surface-disabled-input-field)' : 'var(--surface-neutral-selector-field)',
    boxShadow: `inset 0 0 0 var(--stroke-xs) ${borderColor}`,
    cursor: disabled ? undefined : 'pointer',
  };

  const inputColor = disabled
    ? 'var(--text-disabled-placeholder-disabled)'
    : 'var(--text-default-label)';

  return (
    <FieldChrome
      label={label}
      showLabel={showLabel}
      showLabelIcon={showLabelIcon}
      labelIcon={labelIcon}
      tag={tag}
      labelToggle={labelToggle}
      helperText={helperText}
      showHelper={showHelper}
      error={error}
      warning={warning}
      disabled={disabled}
      className={className}
      style={style}
    >
      <div data-field-box style={fieldBoxStyle} onClick={disabled ? undefined : onSelectClick}>
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 'var(--spacing-8px)', flex: 1, minWidth: 0 }}>
          {leadingFieldIcon && (
            <span style={{ flexShrink: 0, display: 'flex', color: 'var(--icons-neutral-idle)' }}>
              <Icon name={leadingFieldIcon} outlined size={16} />
            </span>
          )}
          {currency && (
            <span className="text-label-m-regular" style={{ color: 'var(--text-default-placeholder)', flexShrink: 0 }}>
              {currency}
            </span>
          )}
          <input
            ref={ref}
            className="leta-select__input text-label-m-regular"
            placeholder={placeholder}
            disabled={disabled}
            value={value}
            defaultValue={defaultValue}
            readOnly
            onFocus={(e) => {
              setFocused(true);
              inputProps.onFocus?.(e);
            }}
            onBlur={(e) => {
              setFocused(false);
              inputProps.onBlur?.(e);
            }}
            style={{ color: inputColor }}
            {...inputProps}
          />
        </div>
        <span style={{ flexShrink: 0, display: 'flex', color: 'var(--icons-neutral-default)' }}>
          <Icon name="Chevron-Down" size={16} />
        </span>
      </div>
    </FieldChrome>
  );
});

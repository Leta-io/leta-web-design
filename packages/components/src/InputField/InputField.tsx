import * as React from 'react';
import { Icon, type IconName } from '@leta-io/icons';
import { FieldChrome } from './FieldChrome.js';

export type InputFieldVariant = 'basic' | 'leading' | 'trailing';

export interface InputFieldProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /** Field-row composition. Default `basic`. */
  variant?: InputFieldVariant;
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
  /** Icon inside the field, before the input. */
  leadingFieldIcon?: IconName;
  /** Currency/unit prefix shown before the input (e.g. "KES"). */
  currency?: string;
  /** Icon inside the field, after the input (e.g. a help marker). */
  trailingFieldIcon?: IconName;
  /** Helper text below the field. */
  helperText?: string;
  /** Show the helper/message line. Default true. */
  showHelper?: boolean;
  /** Error message — turns the border red + shows an error icon. */
  error?: string;
  /** Warning message — shows a warning icon (border unchanged). */
  warning?: string;
  /** Show a right-aligned character counter ("n/max"). */
  showCounter?: boolean;
  /** Right-aligned control on the label row (e.g. a `<SelectionControl variant="switch">`). */
  labelToggle?: React.ReactNode;
  /** `variant="leading"` → e.g. `<LeadingInputFieldElement>`. */
  leadingElement?: React.ReactNode;
  /** `variant="trailing"` → e.g. `<TrailingInputFieldElement>`. */
  trailingElement?: React.ReactNode;
}

const STYLE_ID = 'leta-input-field-styles';
const STYLES = `
  .leta-input-field__input {
    border: 0;
    outline: none;
    background: transparent;
    padding: 0;
    margin: 0;
    width: 100%;
    min-width: 0;
    /* font comes from the .text-label-m-regular utility class on the same node;
       do NOT add font:inherit here (it would override the class to a serif fallback). */
  }
  .leta-input-field__input::placeholder { color: var(--text-default-placeholder); opacity: 1; }
  .leta-input-field__input:disabled { cursor: not-allowed; }
  .leta-input-field__input:disabled::placeholder { color: var(--text-disabled-placeholder-disabled); }
`;

function ensureStyles(): void {
  if (typeof document === 'undefined') return;
  if (document.getElementById(STYLE_ID)) return;
  const el = document.createElement('style');
  el.id = STYLE_ID;
  el.textContent = STYLES;
  document.head.appendChild(el);
}

export const InputField = React.forwardRef<HTMLInputElement, InputFieldProps>(function InputField(
  {
    variant = 'basic',
    label = 'Label Text',
    showLabel = true,
    showLabelIcon = false,
    labelIcon = 'Info',
    tag = 'none',
    leadingFieldIcon,
    currency,
    trailingFieldIcon,
    helperText = 'Helper text goes here',
    showHelper = true,
    error,
    warning,
    showCounter = false,
    labelToggle,
    leadingElement,
    trailingElement,
    placeholder = 'Field Text',
    disabled = false,
    maxLength,
    value,
    defaultValue,
    onChange,
    className,
    style,
    ...inputProps
  },
  ref,
) {
  ensureStyles();

  const [focused, setFocused] = React.useState(false);
  // Track length for the counter (controlled or uncontrolled).
  const initialLen = String(value ?? defaultValue ?? '').length;
  const [count, setCount] = React.useState(initialLen);
  const len = value !== undefined ? String(value).length : count;

  const borderColor = disabled
    ? 'var(--border-disabled-default)'
    : error
      ? 'var(--border-error-default)'
      : focused
        ? 'var(--border-secondary-component-focus)'
        : 'var(--border-neutral-default)';

  // In the horizontal Leading/Trailing row the field fills remaining width (flex:1);
  // as a direct child of the vertical root it must NOT flex (flex:1 → flex-basis 0%
  // overrides height:40 on the column main-axis and collapses the box). Use width:100%.
  const fillsRow = variant === 'leading' || variant === 'trailing';
  const fieldBoxStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 'var(--spacing-16px)',
    ...(fillsRow ? { flex: 1, minWidth: 0 } : { width: '100%' }),
    flexShrink: 0,
    boxSizing: 'border-box',
    height: 40,
    padding: '0 var(--padding-12px)',
    borderRadius: 'var(--rounding-lg)',
    backgroundColor: disabled ? 'var(--surface-disabled-input-field)' : 'var(--surface-neutral-input-field)',
    boxShadow: `inset 0 0 0 var(--stroke-xs) ${borderColor}`,
  };

  const inputColor = disabled
    ? 'var(--text-disabled-placeholder-disabled)'
    : 'var(--text-default-label)';

  const fieldBox = (
    <div style={fieldBoxStyle}>
      {/* Content */}
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
          className="leta-input-field__input text-label-m-regular"
          placeholder={placeholder}
          disabled={disabled}
          maxLength={maxLength}
          value={value}
          defaultValue={defaultValue}
          onChange={(e) => {
            setCount(e.target.value.length);
            onChange?.(e);
          }}
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

      {/* Trailing field icon */}
      {trailingFieldIcon && (
        <span style={{ flexShrink: 0, display: 'flex', color: 'var(--icons-neutral-idle)' }}>
          <Icon name={trailingFieldIcon} outlined size={16} />
        </span>
      )}
    </div>
  );

  // Field row per variant.
  let fieldRow: React.ReactNode;
  if (variant === 'leading') {
    fieldRow = (
      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 'var(--spacing-8px)', width: '100%' }}>
        {leadingElement}
        {fieldBox}
      </div>
    );
  } else if (variant === 'trailing') {
    fieldRow = (
      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 'var(--spacing-8px)', width: '100%' }}>
        {fieldBox}
        {trailingElement}
      </div>
    );
  } else {
    fieldRow = fieldBox;
  }

  const counterText = showCounter ? `${len}${maxLength != null ? `/${maxLength}` : ''}` : undefined;

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
      counterText={counterText}
      className={className}
      style={style}
    >
      {fieldRow}
    </FieldChrome>
  );
});

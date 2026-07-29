import * as React from 'react';
import { Icon, type IconName } from '@leta/icons';
import { Button } from '../Button/Button.js';
import { ToggleButton } from '../ToggleButton/ToggleButton.js';

export type TextAreaVariant = 'basic' | 'rich';

export interface TextAreaProps
  extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'rows'> {
  /** `basic` plain multi-line field, or `rich` with a formatting-toolbar footer. Default `basic`. */
  variant?: TextAreaVariant;
  /**
   * Rich-toolbar handlers. Bold / Italic / Underline are Toggle Buttons — their
   * handler receives the new pressed state; Attach / Send are one-shot actions.
   */
  onBold?: (pressed: boolean) => void;
  onItalic?: (pressed: boolean) => void;
  onUnderline?: (pressed: boolean) => void;
  onAttach?: () => void;
  onSend?: () => void;
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
  /** Right-aligned control on the label row (e.g. a `<SelectionControl variant="switch">`). */
  labelToggle?: React.ReactNode;
  /** Helper text below the field. */
  helperText?: string;
  /** Show the helper/message line. Default true. */
  showHelper?: boolean;
  /** Error message — turns the border red + shows an error icon. */
  error?: string;
  /** Warning message — shows a warning icon (border unchanged). */
  warning?: string;
  /** Show the in-field character counter ("n/max"). Default true. */
  showCounter?: boolean;
  /** Visible text rows (drives min height). Default ~4 (≈120px box). */
  rows?: number;
}

const STYLE_ID = 'leta-textarea-styles';
const STYLES = `
  .leta-textarea__input {
    border: 0;
    outline: none;
    background: transparent;
    padding: 0;
    margin: 0;
    width: 100%;
    min-width: 0;
    flex: 1;
    resize: none;
    /* font from .text-label-m-regular on the same node; no font:inherit (serif fallback). */
  }
  .leta-textarea__input::placeholder { color: var(--text-default-placeholder); opacity: 1; }
  .leta-textarea__input:disabled { cursor: not-allowed; }
  .leta-textarea__input:disabled::placeholder { color: var(--text-disabled-placeholder-disabled); }
`;

function ensureStyles(): void {
  if (typeof document === 'undefined') return;
  if (document.getElementById(STYLE_ID)) return;
  const el = document.createElement('style');
  el.id = STYLE_ID;
  el.textContent = STYLES;
  document.head.appendChild(el);
}

export const TextArea = React.forwardRef<HTMLTextAreaElement, TextAreaProps>(function TextArea(
  {
    variant = 'basic',
    onBold,
    onItalic,
    onUnderline,
    onAttach,
    onSend,
    label = 'Label Text',
    showLabel = true,
    showLabelIcon = false,
    labelIcon = 'Info',
    tag = 'none',
    labelToggle,
    helperText = 'Helper text goes here',
    showHelper = true,
    error,
    warning,
    showCounter = true,
    rows = 4,
    placeholder = 'Some descriptive text here would be very nice to see',
    disabled = false,
    maxLength,
    value,
    defaultValue,
    onChange,
    className,
    style,
    ...textareaProps
  },
  ref,
) {
  ensureStyles();

  const [focused, setFocused] = React.useState(false);
  const [count, setCount] = React.useState(String(value ?? defaultValue ?? '').length);
  const len = value !== undefined ? String(value).length : count;

  const borderColor = disabled
    ? 'var(--border-disabled-default)'
    : error
      ? 'var(--border-error-default)'
      : focused
        ? 'var(--border-secondary-component-focus)'
        : 'var(--border-neutral-default)';

  const message = error ?? warning ?? (showHelper ? helperText : undefined);
  const messageColor = error
    ? 'var(--text-error-label)'
    : warning
      ? 'var(--text-warning-label)'
      : disabled
        ? 'var(--text-disabled-helper-disabled)'
        : 'var(--text-default-helper)';
  const messageIcon: IconName | null = error ? 'Error' : warning ? 'Warning' : null;

  return (
    <div
      className={className}
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 'var(--spacing-8px)', width: 350, boxSizing: 'border-box', ...style }}
    >
      {/* Label Section */}
      {showLabel && (
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 'var(--spacing-4px)', minHeight: 20 }}>
          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 'var(--spacing-4px)', flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 'var(--spacing-8px)' }}>
              <span className="text-label-m-medium" style={{ color: 'var(--text-default-label-idle)' }}>{label}</span>
              {showLabelIcon && (
                <span style={{ display: 'flex', color: 'var(--icons-neutral-idle)', flexShrink: 0 }}>
                  <Icon name={labelIcon} outlined size={18} />
                </span>
              )}
            </div>
            {tag !== 'none' && (
              <span className="text-label-m-regular" style={{ color: 'var(--text-default-label-idle)' }}>
                {tag === 'optional' ? '(Optional)' : '(Required)'}
              </span>
            )}
          </div>
          {labelToggle && <div style={{ flexShrink: 0 }}>{labelToggle}</div>}
        </div>
      )}

      {/* Field box (multi-line) — wrapped with a formatting-toolbar footer in the rich variant */}
      {variant === 'rich' ? (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            boxSizing: 'border-box',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--spacing-8px)',
              boxSizing: 'border-box',
              width: '100%',
              minHeight: 120,
              padding: 'var(--padding-10px) var(--padding-12px)',
              backgroundColor: disabled ? 'var(--surface-disabled-input-field)' : 'var(--surface-neutral-input-field)',
              // Figma: Field has border on top/right/left only (no bottom — the footer's
              // top border is the divider) + top corners rounded.
              borderTop: `var(--stroke-xs) solid ${borderColor}`,
              borderRight: `var(--stroke-xs) solid ${borderColor}`,
              borderLeft: `var(--stroke-xs) solid ${borderColor}`,
              borderTopLeftRadius: 'var(--rounding-lg)',
              borderTopRightRadius: 'var(--rounding-lg)',
            }}
          >
            <textarea
              ref={ref}
              className="leta-textarea__input text-label-m-regular"
              placeholder={placeholder}
              disabled={disabled}
              maxLength={maxLength}
              rows={rows}
              value={value}
              defaultValue={defaultValue}
              onChange={(e) => { setCount(e.target.value.length); onChange?.(e); }}
              onFocus={(e) => { setFocused(true); textareaProps.onFocus?.(e); }}
              onBlur={(e) => { setFocused(false); textareaProps.onBlur?.(e); }}
              style={{ color: disabled ? 'var(--text-disabled-placeholder-disabled)' : 'var(--text-default-label)' }}
              {...textareaProps}
            />
            {showCounter && (
              <span className="text-label-s-regular" style={{ color: 'var(--text-default-placeholder)', alignSelf: 'flex-end', flexShrink: 0 }}>
                {len}{maxLength != null ? `/${maxLength}` : ''}
              </span>
            )}
          </div>
          {/* Footer toolbar — full border + bottom corners rounded (Figma) */}
          <div
            style={{
              display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
              gap: 'var(--spacing-8px)', padding: 'var(--padding-8px) var(--padding-12px)',
              boxSizing: 'border-box',
              border: `var(--stroke-xs) solid ${borderColor}`,
              borderBottomLeftRadius: 'var(--rounding-lg)',
              borderBottomRightRadius: 'var(--rounding-lg)',
              backgroundColor: 'var(--surface-neutral-bg-default)',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 'var(--spacing-8px)' }}>
              {/* Formatting toggles — Toggle Buttons that hold their pressed state (Figma `38:42` Rich footer). */}
              <ToggleButton icon="Format-Bold" aria-label="Bold" onPressedChange={onBold} disabled={disabled} />
              <ToggleButton icon="Format-Italics" aria-label="Italic" onPressedChange={onItalic} disabled={disabled} />
              <ToggleButton icon="Format-Underline" aria-label="Underline" onPressedChange={onUnderline} disabled={disabled} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 'var(--spacing-8px)' }}>
              <Button variant="ghost" size="small" iconOnly="Attachment" aria-label="Attach file" onClick={onAttach} disabled={disabled} />
              <Button variant="primary" size="small" iconOnly="Up-Arrow" aria-label="Send" onClick={onSend} disabled={disabled} />
            </div>
          </div>
        </div>
      ) : (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--spacing-8px)',
            boxSizing: 'border-box',
            width: '100%',
            minHeight: 120,
            padding: 'var(--padding-10px) var(--padding-12px)',
            borderRadius: 'var(--rounding-lg)',
            backgroundColor: disabled ? 'var(--surface-disabled-input-field)' : 'var(--surface-neutral-input-field)',
            boxShadow: `inset 0 0 0 var(--stroke-xs) ${borderColor}`,
          }}
        >
          <textarea
            ref={ref}
            className="leta-textarea__input text-label-m-regular"
            placeholder={placeholder}
            disabled={disabled}
            maxLength={maxLength}
            rows={rows}
            value={value}
            defaultValue={defaultValue}
            onChange={(e) => {
              setCount(e.target.value.length);
              onChange?.(e);
            }}
            onFocus={(e) => {
              setFocused(true);
              textareaProps.onFocus?.(e);
            }}
            onBlur={(e) => {
              setFocused(false);
              textareaProps.onBlur?.(e);
            }}
            style={{ color: disabled ? 'var(--text-disabled-placeholder-disabled)' : 'var(--text-default-label)' }}
            {...textareaProps}
          />
          {showCounter && (
            <span className="text-label-s-regular" style={{ color: 'var(--text-default-placeholder)', alignSelf: 'flex-end', flexShrink: 0 }}>
              {len}{maxLength != null ? `/${maxLength}` : ''}
            </span>
          )}
        </div>
      )}

      {/* Helper / message */}
      {message && (
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 'var(--spacing-4px)', minHeight: 16 }}>
          {messageIcon && (
            <span style={{ display: 'flex', flexShrink: 0, color: error ? 'var(--icons-error-default)' : 'var(--icons-warning-default)' }}>
              <Icon name={messageIcon} outlined={false} size={16} />
            </span>
          )}
          <span className="text-label-s-regular" style={{ color: messageColor }}>{message}</span>
        </div>
      )}
    </div>
  );
});

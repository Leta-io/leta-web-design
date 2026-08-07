import * as React from 'react';
import { Icon, type IconName } from '@leta-io/icons';

/**
 * Shared chrome for the Data Entry field types — the label section, the field
 * row (injected as `children`), and the helper/warning/error/counter message
 * line. Used by InputField, Select, and StepperInput so all three render
 * byte-identical label + message scaffolding (Figma `38:42`). Internal — not
 * exported from the package index.
 */
export interface FieldChromeProps {
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
  /** Error message — shows an error icon + red text. */
  error?: string;
  /** Warning message — shows a warning icon + warning text. */
  warning?: string;
  /** Dims helper text when the field is disabled. */
  disabled?: boolean;
  /** Right-aligned character counter text (e.g. "12/100"). */
  counterText?: string;
  className?: string;
  style?: React.CSSProperties;
  /** The field row (field box, leading/trailing row, stepper, etc.). */
  children: React.ReactNode;
}

export function FieldChrome({
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
  disabled = false,
  counterText,
  className,
  style,
  children,
}: FieldChromeProps) {
  // Message line: error > warning > helper.
  const message = error ?? warning ?? (showHelper ? helperText : undefined);
  const messageColor = error
    ? 'var(--text-error-label)'
    : warning
      ? 'var(--text-warning-label)'
      : disabled
        ? 'var(--text-disabled-helper-disabled)'
        : 'var(--text-default-helper)';
  const messageIcon: IconName | null = error ? 'Error' : warning ? 'Warning' : null;
  const messageIconColor = error ? 'var(--icons-error-default)' : 'var(--icons-warning-default)';
  const showMessageLine = !!message || counterText != null;

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

      {/* Field row */}
      {children}

      {/* Helper / message / counter */}
      {showMessageLine && (
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 'var(--spacing-4px)', minHeight: 16 }}>
          {messageIcon && (
            <span style={{ display: 'flex', flexShrink: 0, color: messageIconColor }}>
              <Icon name={messageIcon} outlined={false} size={16} />
            </span>
          )}
          {message && (
            <span className="text-label-s-regular" style={{ color: messageColor, flex: 1, minWidth: 0 }}>
              {message}
            </span>
          )}
          {counterText != null && (
            <span
              className="text-label-s-regular"
              style={{ color: 'var(--text-default-helper)', marginLeft: 'auto', flexShrink: 0 }}
            >
              {counterText}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

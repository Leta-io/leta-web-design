import * as React from 'react';
import { Icon } from '@leta-io/icons';
import { Button } from '../Button/Button.js';

export type StepperVariant = 'discrete' | 'segmented';

export interface StepperProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange' | 'defaultValue'> {
  /**
   * `discrete` — a bordered field with the value; the up/down spinner
   * (`Icon/Stepper`) reveals on hover. `segmented` — a `[−] [count] [+]` control
   * whose −/+ are Icon-Only Buttons.
   */
  variant?: StepperVariant;
  /** Controlled value. */
  value?: number;
  /** Uncontrolled initial value. */
  defaultValue?: number;
  /** Fired with the next clamped value. */
  onChange?: (value: number) => void;
  /** Lower bound (inclusive). Defaults to `0` — steppers model non-negative
   * quantities/counts/durations, so the value cannot be decremented below 0
   * unless a lower `min` is supplied. */
  min?: number;
  /** Upper bound (inclusive). */
  max?: number;
  /** Increment/decrement amount. Default 1. */
  step?: number;
  disabled?: boolean;
  'aria-label'?: string;
}

const STYLE_ID = 'leta-stepper-styles';
const STYLES = `
.leta-stepper-field { box-shadow: inset 0 0 0 var(--stroke-xs) var(--border-neutral-default); }
.leta-stepper-field:hover { box-shadow: inset 0 0 0 var(--stroke-xs) var(--border-neutral-default), var(--shadow-neutral-1); }
.leta-stepper-field:focus-within { box-shadow: inset 0 0 0 var(--stroke-sm) var(--border-secondary-component-focus); }
.leta-stepper-count:focus-within { box-shadow: inset 0 0 0 var(--stroke-sm) var(--border-secondary-component-focus); border-radius: var(--rounding-md); }
.leta-stepper-spinner { opacity: 0; pointer-events: none; transition: opacity 150ms ease-out; }
.leta-stepper-field:hover .leta-stepper-spinner { opacity: 1; pointer-events: auto; }
.leta-stepper-input::-webkit-outer-spin-button,
.leta-stepper-input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
`;
function ensureStyles(): void {
  if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return;
  const el = document.createElement('style');
  el.id = STYLE_ID;
  el.textContent = STYLES;
  document.head.appendChild(el);
}

const inputReset: React.CSSProperties = {
  border: 'none',
  outline: 'none',
  backgroundColor: 'transparent',
  padding: 0,
  margin: 0,
};

/**
 * Stepper — a numeric input with increment/decrement affordances for adjusting
 * a value in discrete steps.
 *
 * **When to use:** bounded numeric entry where ± nudging is faster than typing
 * (quantities, counts, durations).
 *
 * **When NOT to use:** unbounded numbers, ranges (use a slider), or step-through
 * wizards.
 *
 * Two types (`4524:205932`): **Discrete** — a bordered field with the value; the
 * up/down spinner (`Icon/Stepper`) appears on hover and the field lifts with a
 * drop shadow. **Segmented** — a `[−] [count] [+]` control whose buttons reuse the
 * Desktop {@link Button} atom (− disables at `min`, + at `max`). Controlled via
 * `value`/`onChange` or uncontrolled via `defaultValue`; ArrowUp/ArrowDown nudge.
 */
export const Stepper = React.forwardRef<HTMLDivElement, StepperProps>(function Stepper(
  {
    variant = 'discrete',
    value,
    defaultValue = 0,
    onChange,
    min = 0,
    max = Infinity,
    step = 1,
    disabled = false,
    className,
    style,
    'aria-label': ariaLabel,
    ...rest
  },
  ref,
) {
  ensureStyles();
  const isControlled = value !== undefined;
  const [internal, setInternal] = React.useState(defaultValue);
  const current = isControlled ? (value as number) : internal;

  const clamp = (n: number) => Math.min(max, Math.max(min, n));
  const commit = (n: number) => {
    const c = clamp(n);
    if (!isControlled) setInternal(c);
    onChange?.(c);
  };
  const atMin = current <= min;
  const atMax = current >= max;
  const inc = () => {
    if (!disabled && !atMax) commit(current + step);
  };
  const dec = () => {
    if (!disabled && !atMin) commit(current - step);
  };
  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9-]/g, '');
    if (raw === '' || raw === '-') {
      if (!isControlled) setInternal(0);
      onChange?.(0);
      return;
    }
    const n = Number(raw);
    if (!Number.isNaN(n)) commit(n);
  };
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      inc();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      dec();
    }
  };

  if (variant === 'segmented') {
    return (
      <div
        ref={ref}
        role="group"
        aria-label={ariaLabel}
        className={className}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--spacing-4px)', ...style }}
        {...rest}
      >
        <Button
          variant="secondary"
          size="medium"
          prominent
          iconOnly="Minus"
          aria-label="Decrease"
          disabled={disabled || atMin}
          onClick={dec}
        />
        <div
          className="leta-stepper-count"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxSizing: 'border-box',
            width: 32,
            height: 40,
          }}
        >
          <input
            className="leta-stepper-input text-body-l-regular"
            inputMode="numeric"
            value={String(current)}
            onChange={onInputChange}
            onKeyDown={onKeyDown}
            disabled={disabled}
            aria-label={ariaLabel}
            style={{
              ...inputReset,
              width: '100%',
              minWidth: 0,
              textAlign: 'center',
              color: disabled ? 'var(--text-disabled-default)' : 'var(--text-default-label)',
              cursor: disabled ? 'not-allowed' : 'text',
            }}
          />
        </div>
        <Button
          variant="secondary"
          size="medium"
          prominent
          iconOnly="Add"
          aria-label="Increase"
          disabled={disabled || atMax}
          onClick={inc}
        />
      </div>
    );
  }

  // Discrete
  const fieldBase: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 'var(--spacing-8px)',
    boxSizing: 'border-box',
    width: 100,
    height: 40,
    paddingTop: 'var(--padding-10px)',
    paddingBottom: 'var(--padding-10px)',
    paddingLeft: 'var(--padding-12px)',
    paddingRight: 'var(--padding-12px)',
    borderRadius: 'var(--rounding-lg)',
    ...style,
  };

  if (disabled) {
    return (
      <div
        ref={ref}
        className={className}
        style={{
          ...fieldBase,
          backgroundColor: 'var(--surface-disabled-input-field)',
          boxShadow: 'inset 0 0 0 var(--stroke-xs) var(--border-disabled-default)',
        }}
        {...rest}
      >
        <input
          className="leta-stepper-input text-label-m-regular"
          inputMode="numeric"
          value={String(current)}
          disabled
          readOnly
          aria-label={ariaLabel}
          style={{
            ...inputReset,
            flex: 1,
            minWidth: 0,
            color: 'var(--text-disabled-default)',
            cursor: 'not-allowed',
          }}
        />
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className={`leta-stepper-field${className ? ` ${className}` : ''}`}
      style={{ ...fieldBase, backgroundColor: 'var(--surface-neutral-input-field)' }}
      {...rest}
    >
      <input
        className="leta-stepper-input text-label-m-regular"
        inputMode="numeric"
        value={String(current)}
        onChange={onInputChange}
        onKeyDown={onKeyDown}
        aria-label={ariaLabel}
        style={{ ...inputReset, flex: 1, minWidth: 0, color: 'var(--text-default-label)' }}
      />
      <div
        className="leta-stepper-spinner"
        style={{ position: 'relative', width: 20, height: 20, flexShrink: 0 }}
      >
        {/* Two stacked chevrons (rather than the single combined `Stepper`
            glyph) so each caret can carry its own colour: the down caret goes
            to the disabled token at `min`, the up caret at `max`. */}
        <Icon
          name="Chevron-Up"
          size={18}
          color={atMax ? 'var(--icons-disabled-default)' : 'var(--icons-neutral-default)'}
          aria-hidden
          style={{ position: 'absolute', top: -5, left: 1, pointerEvents: 'none' }}
        />
        <Icon
          name="Chevron-Down"
          size={18}
          color={atMin ? 'var(--icons-disabled-default)' : 'var(--icons-neutral-default)'}
          aria-hidden
          style={{ position: 'absolute', bottom: -5, left: 1, pointerEvents: 'none' }}
        />
        <button
          type="button"
          tabIndex={-1}
          aria-label="Increase"
          onClick={inc}
          disabled={atMax}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '50%',
            border: 'none',
            background: 'transparent',
            padding: 0,
            cursor: atMax ? 'not-allowed' : 'pointer',
          }}
        />
        <button
          type="button"
          tabIndex={-1}
          aria-label="Decrease"
          onClick={dec}
          disabled={atMin}
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '50%',
            border: 'none',
            background: 'transparent',
            padding: 0,
            cursor: atMin ? 'not-allowed' : 'pointer',
          }}
        />
      </div>
    </div>
  );
});

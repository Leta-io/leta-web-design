import * as React from 'react';
import { Icon } from '@leta-io/icons';
import { Flag } from '../Flag/Flag.js';

export type LeadingInputFieldElementVariant = 'single' | 'multiple';

export interface LeadingInputFieldElementProps
  extends Omit<React.HTMLAttributes<HTMLElement>, 'onClick'> {
  /**
   * `single` — display-only, locked to one country (flag + dial code, no
   * chevron). `multiple` — interactive selector (flag + chevron) that opens a
   * country picker.
   */
  variant: LeadingInputFieldElementVariant;
  /** ISO country code for the flag (e.g. `'KE'`, `'US'`). */
  countryCode: string;
  /** Dial code shown in the `single` variant (e.g. `'+254'`). */
  dialCode?: string;
  disabled?: boolean;
  /** `multiple` only — fired when the selector is activated (opens the picker). */
  onClick?: () => void;
  'aria-label'?: string;
}

const STYLE_ID = 'leta-leading-input-field-element-styles';
const STYLES = `
.leta-leading-ife:focus-visible {
  outline: var(--stroke-sm) solid var(--border-secondary-component-focus);
  outline-offset: 4px;
}
`;
function ensureStyles(): void {
  if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return;
  const el = document.createElement('style');
  el.id = STYLE_ID;
  el.textContent = STYLES;
  document.head.appendChild(el);
}

/**
 * Leading Input Field Element — an interactive adornment that sits at the
 * **leading** edge inside an input field. The current type is a Country Selector
 * for phone/locale inputs.
 *
 * **When to use:** inside text/phone inputs that need a leading selector or
 * context.
 *
 * **When NOT to use:** as a standalone control outside an input.
 *
 * Country Selector (`7111:43945`): **Single Country** — display-only flag + dial
 * code, non-selectable; **Multiple Countries** — flag + chevron, opens a country
 * picker (Idle / Hover / Pressed / Focus / Disabled). Styled with the
 * secondary-button token family; reuses the {@link Flag} atom.
 */
export const LeadingInputFieldElement = React.forwardRef<
  HTMLElement,
  LeadingInputFieldElementProps
>(function LeadingInputFieldElement(
  {
    variant,
    countryCode,
    dialCode,
    disabled = false,
    onClick,
    className,
    style,
    'aria-label': ariaLabel,
    ...rest
  },
  ref,
) {
  ensureStyles();
  const [hover, setHover] = React.useState(false);
  const [pressed, setPressed] = React.useState(false);

  const state = pressed ? 'pressed' : hover ? 'hover' : 'idle';
  const surface = disabled
    ? 'var(--surface-disabled-secondary-button)'
    : `var(--surface-neutral-secondary-button-${state})`;
  const border = disabled
    ? 'var(--border-disabled-button)'
    : `var(--border-neutral-secondary-button-${state})`;

  const baseStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 'var(--spacing-8px)',
    boxSizing: 'border-box',
    height: 40,
    padding: 'var(--padding-12px)',
    borderRadius: 'var(--rounding-lg)',
    backgroundColor: surface,
    boxShadow: `inset 0 0 0 var(--stroke-xs) ${border}`,
    // Disabled dims the element. `--opacity-60` resolves to the buggy `60px`
    // in the token pipeline, so use the literal 0.6 (cf. WizardTab).
    opacity: disabled ? 0.6 : 1,
    ...style,
  };

  const inner = (
    <>
      <Flag code={countryCode} />
      {variant === 'multiple' ? (
        <Icon
          name="Chevron-Down"
          size={16}
          color={disabled ? 'var(--icons-disabled-default)' : 'var(--icons-neutral-default)'}
          aria-hidden
        />
      ) : (
        dialCode && (
          <span className="text-label-m-regular" style={{ color: 'var(--text-default-label-idle)' }}>
            {dialCode}
          </span>
        )
      )}
    </>
  );

  if (variant === 'multiple') {
    return (
      <button
        ref={ref as React.Ref<HTMLButtonElement>}
        type="button"
        className={`leta-leading-ife${className ? ` ${className}` : ''}`}
        disabled={disabled}
        aria-label={ariaLabel}
        onClick={() => onClick?.()}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => {
          setHover(false);
          setPressed(false);
        }}
        onMouseDown={() => setPressed(true)}
        onMouseUp={() => setPressed(false)}
        style={{ ...baseStyle, border: 'none', appearance: 'none', cursor: disabled ? 'not-allowed' : 'pointer' }}
        {...rest}
      >
        {inner}
      </button>
    );
  }

  // Single Country is display-only (non-selectable) but still focusable so it
  // can show the focus ring (Figma has a Single Country / Focus variant).
  return (
    <span
      ref={ref as React.Ref<HTMLSpanElement>}
      className={`leta-leading-ife${className ? ` ${className}` : ''}`}
      role="img"
      aria-label={ariaLabel ?? `${countryCode}${dialCode ? ` ${dialCode}` : ''}`}
      tabIndex={disabled ? undefined : 0}
      style={baseStyle}
      {...rest}
    >
      {inner}
    </span>
  );
});

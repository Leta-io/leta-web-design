import * as React from 'react';
import { Icon, type IconName } from '@leta/icons';

/**
 * Toggle Button (Figma `10900:15545`) — a binary, icon-only switch that holds
 * its on/off state until pressed again (unlike a standard action Button, which
 * fires a one-shot command). Use it for isolated settings (Mute, Bookmark,
 * Pin) and formatting toggles (Bold / Italic / Underline in a rich toolbar).
 * Works on both desktop and mobile.
 *
 * The on/off state is exposed to assistive tech via **`aria-pressed`** ("Toggle
 * Button, pressed" / "…, not pressed"). Same press/hover micro-animations as
 * `Button` (150ms colour/shadow transitions + `scale(0.96)` on press).
 *
 * States (Figma): Idle (transparent) · Hover (neutral bg+border) · Pressed
 * (mouse-down, darker neutral) · Selected (`aria-pressed`, secondary bg+border)
 * · Focus (ring) · Disabled (dimmed icon).
 */
export interface ToggleButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onChange'> {
  /** The glyph (required — the button is icon-only). */
  icon: IconName;
  /** Render the outlined icon variant. */
  outlined?: boolean;
  /** Controlled on/off state (drives `aria-pressed`). Omit for uncontrolled. */
  pressed?: boolean;
  /** Initial on/off state when uncontrolled. Default `false`. */
  defaultPressed?: boolean;
  /** Fired with the new on/off state when toggled. */
  onPressedChange?: (pressed: boolean) => void;
  /** Accessible name — REQUIRED (the button has no text). */
  'aria-label': string;
}

const STYLE_ID = 'leta-toggle-button-styles';

// Idle is transparent (Figma Idle has no fill/stroke — the idle tokens resolve
// to white, but the variant paints nothing). Border painted via `box-shadow:
// inset` so it never shrinks the 32×32 content box. Selected wins over hover.
const TOGGLE_BUTTON_STYLES = `
  .leta-toggle-btn {
    appearance: none;
    cursor: pointer;
    user-select: none;
    border: 0;
    box-sizing: border-box;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    padding: var(--padding-8px);
    border-radius: var(--rounding-lg);
    background-color: transparent;
    color: var(--icons-neutral-button);
    box-shadow: inset 0 0 0 0 transparent;
    transition:
      background-color 150ms ease-out,
      color 150ms ease-out,
      box-shadow 150ms ease-out,
      transform 150ms ease-out;
  }
  .leta-toggle-btn:hover:not(:disabled):not([aria-pressed="true"]) {
    background-color: var(--surface-neutral-toggle-button-hover);
    box-shadow: inset 0 0 0 var(--stroke-xs) var(--border-neutral-toggle-button-hover);
  }
  .leta-toggle-btn:active:not(:disabled):not([aria-pressed="true"]) {
    background-color: var(--surface-neutral-toggle-button-pressed);
    box-shadow: inset 0 0 0 var(--stroke-xs) var(--border-neutral-toggle-button-pressed);
    transform: scale(0.96);
  }
  .leta-toggle-btn[aria-pressed="true"] {
    background-color: var(--surface-secondary-toggle-button-selected);
    box-shadow: inset 0 0 0 var(--stroke-xs) var(--border-secondary-toggle-button-selected);
  }
  .leta-toggle-btn[aria-pressed="true"]:active:not(:disabled) {
    transform: scale(0.96);
  }
  .leta-toggle-btn:focus-visible {
    outline: var(--stroke-sm) solid var(--border-secondary-component-focus);
    outline-offset: 4px;
  }
  .leta-toggle-btn:disabled {
    cursor: not-allowed;
    color: var(--icons-disabled-default);
  }
`;

function ensureStylesInjected(): void {
  if (typeof document === 'undefined') return;
  if (document.getElementById(STYLE_ID)) return;
  const el = document.createElement('style');
  el.id = STYLE_ID;
  el.textContent = TOGGLE_BUTTON_STYLES;
  document.head.appendChild(el);
}

export const ToggleButton = React.forwardRef<HTMLButtonElement, ToggleButtonProps>(
  function ToggleButton(
    {
      icon,
      outlined = false,
      pressed,
      defaultPressed = false,
      onPressedChange,
      disabled,
      type = 'button',
      className,
      onClick,
      ...rest
    },
    ref,
  ) {
    React.useEffect(ensureStylesInjected, []);

    const isControlled = pressed !== undefined;
    const [internal, setInternal] = React.useState(defaultPressed);
    const isPressed = isControlled ? pressed : internal;

    const handleClick = React.useCallback(
      (e: React.MouseEvent<HTMLButtonElement>) => {
        const next = !isPressed;
        if (!isControlled) setInternal(next);
        onPressedChange?.(next);
        onClick?.(e);
      },
      [isControlled, isPressed, onPressedChange, onClick],
    );

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled}
        aria-pressed={isPressed}
        className={['leta-toggle-btn', className].filter(Boolean).join(' ')}
        onClick={handleClick}
        {...rest}
      >
        <Icon name={icon} size={16} outlined={outlined} />
      </button>
    );
  },
);

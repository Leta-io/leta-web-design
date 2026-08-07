import * as React from 'react';
import { Icon } from '@leta-io/icons';
import type { IconName } from '@leta-io/icons';

export interface MobileChipProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  /** Chip label text. */
  label: string;
  /** Optional leading (left) icon, 16×16. */
  leadingIcon?: IconName;
  /** Optional trailing (right) icon, 16×16. */
  trailingIcon?: IconName;
  /**
   * Caller-controlled active (selected) state. Maps to Figma `State=Active`.
   */
  active?: boolean;
}

const STYLE_ID = 'leta-mobile-chip-styles';
const CHIP_STYLES = `
  .leta-mobile-chip:focus-visible {
    outline: var(--stroke-sm) solid var(--border-secondary-component-focus);
    outline-offset: 4px;
  }
`;

function ensureStyles(): void {
  if (typeof document === 'undefined') return;
  if (document.getElementById(STYLE_ID)) return;
  const el = document.createElement('style');
  el.id = STYLE_ID;
  el.textContent = CHIP_STYLES;
  document.head.appendChild(el);
}

/**
 * Mobile Chip — a compact, pill-shaped element that represents a specific
 * piece of information, an attribute, or a discrete action on touch interfaces.
 * Chips help users filter content, make selections, or trigger context-specific
 * tasks.
 *
 * **When to use:**
 * - Above **stacked lists** to filter the items shown (mobile context).
 * - As toggleable attribute tags (e.g. category, status, type).
 * - As compact triggers for a context-specific action tied to a list item.
 *
 * **When NOT to use:**
 * - To filter **table** data — use the table's built-in column filters instead.
 * - As a navigation element — use Mobile Segments or Tabs for that.
 * - To replace a full-width button or a form control.
 *
 * **Touch-first:** no hover state. Pressed is tracked via touch/mouse-down;
 * Active is caller-controlled via the `active` prop.
 *
 * 4 types (No Icon / Leading / Trailing / Leading + Trailing) × 4 states
 * (Idle / Pressed / Active / Focus) = 16 Figma variants (`8269:29237`).
 * Typography: Body/S/SemiBold (12px). Icons render at 16×16.
 */
export const MobileChip = React.forwardRef<HTMLButtonElement, MobileChipProps>(
  function MobileChip(
    {
      label,
      leadingIcon,
      trailingIcon,
      active = false,
      className,
      style,
      onTouchStart,
      onTouchEnd,
      onTouchCancel,
      onMouseDown,
      onMouseUp,
      onMouseLeave,
      ...rest
    },
    ref,
  ) {
    ensureStyles();
    const [pressed, setPressed] = React.useState(false);

    const bg = active
      ? 'var(--surface-neutral-mobile-chip-active)'
      : pressed
        ? 'var(--surface-neutral-mobile-chip-pressed)'
        : 'var(--surface-neutral-mobile-chip-idle)';

    const border = active
      ? 'var(--border-secondary-chip-active)'
      : pressed
        ? 'var(--border-neutral-mobile-chip-pressed)'
        : 'var(--border-neutral-mobile-chip-idle)';

    /* Asymmetric padding mirrors Figma exactly:
     * - Icon side: --padding-10px (tighter)
     * - Text side: --padding-12px (looser)
     * - No icons or both icons: --padding-12px / --padding-10px respectively
     */
    const hasLeading = leadingIcon != null;
    const hasTrailing = trailingIcon != null;
    const paddingLeft = hasLeading
      ? 'var(--padding-10px)'
      : 'var(--padding-12px)';
    const paddingRight = hasTrailing
      ? 'var(--padding-10px)'
      : 'var(--padding-12px)';

    return (
      <button
        ref={ref}
        type="button"
        className={`text-body-s-semibold leta-mobile-chip${className ? ` ${className}` : ''}`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 'var(--spacing-8px)',
          height: 28,
          paddingTop: 'var(--padding-6px)',
          paddingBottom: 'var(--padding-6px)',
          paddingLeft,
          paddingRight,
          borderRadius: 'var(--rounding-round)',
          backgroundColor: bg,
          color: 'var(--text-default-label)',
          /* Border painted via inset box-shadow so it doesn't shrink content area.
           * Active = 1.5px (--stroke-sm) for ARIA selected-emphasis; else 1px (--stroke-xs). */
          boxShadow: `inset 0 0 0 ${active ? 'var(--stroke-sm)' : 'var(--stroke-xs)'} ${border}`,
          border: 'none',
          cursor: 'pointer',
          userSelect: 'none',
          whiteSpace: 'nowrap',
          boxSizing: 'border-box',
          transition: 'background-color 150ms ease-out, box-shadow 150ms ease-out',
          ...style,
        }}
        onTouchStart={(e) => { setPressed(true); onTouchStart?.(e); }}
        onTouchEnd={(e) => { setPressed(false); onTouchEnd?.(e); }}
        onTouchCancel={(e) => { setPressed(false); onTouchCancel?.(e); }}
        onMouseDown={(e) => { setPressed(true); onMouseDown?.(e); }}
        onMouseUp={(e) => { setPressed(false); onMouseUp?.(e); }}
        onMouseLeave={(e) => { setPressed(false); onMouseLeave?.(e); }}
        {...rest}
      >
        {hasLeading && (
          <Icon name={leadingIcon!} size={16} color="var(--icons-neutral-button)" />
        )}
        {label}
        {hasTrailing && (
          <Icon name={trailingIcon!} size={16} color="var(--icons-neutral-button)" />
        )}
      </button>
    );
  },
);

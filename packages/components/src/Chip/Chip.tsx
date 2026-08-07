import * as React from 'react';
import { Icon } from '@leta-io/icons';
import type { IconName } from '@leta-io/icons';

export interface ChipProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  /** Chip label text. */
  label: string;
  /** Optional icon before the label. */
  leadingIcon?: IconName;
  /** Optional icon after the label. */
  trailingIcon?: IconName;
  /** When true the chip renders in the Active (selected) state. Caller-controlled. */
  active?: boolean;
}

const STYLE_ID = 'leta-chip-styles';
const CHIP_STYLES = `
  .leta-chip:focus-visible {
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
 * Desktop Chip — a compact, pill-shaped element that represents a specific
 * piece of information, an attribute, or a discrete action. Chips help users
 * filter content, make selections, or trigger context-specific tasks.
 *
 * **When to use:**
 * - Above **stacked lists** to filter the items shown.
 * - As toggleable attribute tags (e.g. category, status, type).
 * - As compact triggers for a context-specific action tied to a list item.
 *
 * **When NOT to use:**
 * - To filter **table** data — use the table's built-in column filters instead.
 * - As a navigation element — use Tabs or Segments for that.
 * - To replace a full-width button or a form control.
 *
 * 4 types (No Icon / Leading / Trailing / Leading + Trailing) × 5 states
 * (Idle / Hover / Pressed / Active / Focus) = 20 Figma variants (`7139:53343`).
 * Renders as a `<button>`; Active state is caller-controlled via the `active` prop.
 */
export const Chip = React.forwardRef<HTMLButtonElement, ChipProps>(
  function Chip(
    {
      label,
      leadingIcon,
      trailingIcon,
      active = false,
      className,
      style,
      onMouseEnter,
      onMouseLeave,
      onMouseDown,
      onMouseUp,
      ...rest
    },
    ref,
  ) {
    ensureStyles();
    const [hovered, setHovered] = React.useState(false);
    const [pressed, setPressed] = React.useState(false);

    const bg = active
      ? 'var(--surface-neutral-chip-active)'
      : pressed
        ? 'var(--surface-neutral-chip-pressed)'
        : hovered
          ? 'var(--surface-neutral-chip-hover)'
          : 'var(--surface-neutral-chip-idle)';

    const border = active
      ? 'var(--border-secondary-chip-active)'
      : pressed
        ? 'var(--border-neutral-chip-pressed)'
        : hovered
          ? 'var(--border-neutral-chip-hover)'
          : 'var(--border-neutral-chip-idle)';

    /* Asymmetric padding per Figma `7139:53343` —
     * - Icon side: --padding-10px (smaller, tightens spacing to icon)
     * - Text side: --padding-12px (larger, gives text breathing room)
     * - No Icon / Leading + Trailing: both sides --padding-10px
     */
    const hasLeading = leadingIcon != null;
    const hasTrailing = trailingIcon != null;
    const paddingLeft =
      hasLeading || (!hasLeading && !hasTrailing)
        ? 'var(--padding-10px)' // icon on left, OR no icons (both sides 10)
        : 'var(--padding-12px)'; // text on left (trailing-icon variant)
    const paddingRight =
      hasTrailing || (!hasLeading && !hasTrailing)
        ? 'var(--padding-10px)' // icon on right, OR no icons (both sides 10)
        : 'var(--padding-12px)'; // text on right (leading-icon variant)

    return (
      <button
        ref={ref}
        type="button"
        className={`text-label-s-semibold leta-chip${className ? ` ${className}` : ''}`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 'var(--spacing-8px)',
          paddingTop: 'var(--padding-6px)',
          paddingBottom: 'var(--padding-6px)',
          paddingLeft,
          paddingRight,
          borderRadius: 'var(--rounding-round)',
          backgroundColor: bg,
          color: 'var(--text-default-label)',
          boxShadow: `inset 0 0 0 var(--stroke-sm) ${border}`,
          border: 'none',
          cursor: 'pointer',
          userSelect: 'none',
          whiteSpace: 'nowrap',
          boxSizing: 'border-box',
          transition: 'background-color 150ms ease-out, box-shadow 150ms ease-out',
          ...style,
        }}
        onMouseEnter={(e) => { setHovered(true); onMouseEnter?.(e); }}
        onMouseLeave={(e) => { setHovered(false); setPressed(false); onMouseLeave?.(e); }}
        onMouseDown={(e) => { setPressed(true); onMouseDown?.(e); }}
        onMouseUp={(e) => { setPressed(false); onMouseUp?.(e); }}
        {...rest}
      >
        {leadingIcon && <Icon name={leadingIcon} size={16} color="var(--icons-neutral-button)" />}
        {label}
        {trailingIcon && <Icon name={trailingIcon} size={16} color="var(--icons-neutral-button)" />}
      </button>
    );
  },
);

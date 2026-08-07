import * as React from 'react';
import { Icon } from '@leta-io/icons';
import type { IconName } from '@leta-io/icons';

export interface SegmentSwitcherTabProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  /** Tab label text. */
  label: string;
  /** Optional icon before the label. */
  leadingIcon?: IconName;
  /** When true the tab renders in the Active (selected) state. Caller-controlled. */
  active?: boolean;
}

const STYLE_ID = 'leta-segment-switcher-tab-styles';
const TAB_STYLES = `
  .leta-segment-switcher-tab:focus-visible {
    outline: var(--stroke-sm) solid var(--border-secondary-component-focus);
    outline-offset: 4px;
  }
`;

function ensureStyles(): void {
  if (typeof document === 'undefined') return;
  if (document.getElementById(STYLE_ID)) return;
  const el = document.createElement('style');
  el.id = STYLE_ID;
  el.textContent = TAB_STYLES;
  document.head.appendChild(el);
}

/**
 * Segment Switcher Tab — prominent tab for high-level navigation within a
 * container. Base component for the Segment Switcher molecule.
 *
 * Larger than View Switcher Tab: 40px height, Label/L/SemiBold text, 20–24px icon.
 * 3 visual states: Default, Hover, Active (selected).
 */
export const SegmentSwitcherTab = React.forwardRef<HTMLButtonElement, SegmentSwitcherTabProps>(
  function SegmentSwitcherTab(
    {
      label,
      leadingIcon,
      active = false,
      className,
      style,
      onMouseEnter,
      onMouseLeave,
      ...rest
    },
    ref,
  ) {
    ensureStyles();
    const [hovered, setHovered] = React.useState(false);

    const bg = active
      ? 'var(--surface-neutral-segment-selected)'
      : hovered
        ? 'var(--surface-neutral-segment-hover)'
        : 'var(--surface-neutral-segment-idle)';

    const textColor = active
      ? 'var(--text-default-label)'
      : 'var(--text-default-label-idle)';

    /* Figma `5778:229946`: icon is a constant 20px across every state
     * (Active / Default / Hover), bound to the `Icons/medium` size variable
     * (`VariableID:8403:24088`). The Icon component takes a numeric prop, so
     * the literal here mirrors that token. Updated 2026-05-28 after the
     * designer flattened the prior 20/24 split. */
    const iconSize = 20;

    return (
      <button
        ref={ref}
        type="button"
        className={`text-label-l-semibold leta-segment-switcher-tab${className ? ` ${className}` : ''}`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 'var(--spacing-8px)',
          height: 40,
          paddingLeft: 'var(--padding-12px)',
          paddingRight: 'var(--padding-12px)',
          borderRadius: 'var(--rounding-md)',
          backgroundColor: bg,
          color: textColor,
          boxShadow: active ? 'var(--shadow-neutral-2)' : 'none',
          border: 'none',
          cursor: 'pointer',
          userSelect: 'none',
          whiteSpace: 'nowrap',
          boxSizing: 'border-box',
          transition: 'background-color 150ms ease-out, box-shadow 150ms ease-out',
          ...style,
        }}
        onMouseEnter={(e) => { setHovered(true); onMouseEnter?.(e); }}
        onMouseLeave={(e) => { setHovered(false); onMouseLeave?.(e); }}
        {...rest}
      >
        {leadingIcon && <Icon name={leadingIcon} size={iconSize} color={textColor} />}
        {label}
      </button>
    );
  },
);

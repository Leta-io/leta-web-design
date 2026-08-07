import * as React from 'react';
import { Icon } from '@leta-io/icons';
import type { IconName } from '@leta-io/icons';

export interface ViewSwitcherTabProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  /** Tab label text. */
  label: string;
  /** Optional icon before the label. */
  leadingIcon?: IconName;
  /** When true the tab renders in the Active (selected) state. Caller-controlled. */
  active?: boolean;
}

const STYLE_ID = 'leta-view-switcher-tab-styles';
const TAB_STYLES = `
  .leta-view-switcher-tab:focus-visible {
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
 * View Switcher Tab — compact tab for switching content layout (e.g. Grid vs
 * List). Base component for the View Switcher molecule.
 *
 * 3 visual states: Default, Hover, Active (selected).
 * Active state is caller-controlled via the `active` prop.
 */
export const ViewSwitcherTab = React.forwardRef<HTMLButtonElement, ViewSwitcherTabProps>(
  function ViewSwitcherTab(
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

    return (
      <button
        ref={ref}
        type="button"
        className={`text-label-m-semibold leta-view-switcher-tab${className ? ` ${className}` : ''}`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 'var(--spacing-8px)',
          height: 32,
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
        {leadingIcon && <Icon name={leadingIcon} size={16} color={textColor} />}
        {label}
      </button>
    );
  },
);

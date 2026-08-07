import * as React from 'react';
import { Icon } from '@leta-io/icons';
import type { IconName } from '@leta-io/icons';

export interface MobileNavTabProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  label: string;
  /** 24×24 icon shown above the label. */
  icon: IconName;
  /**
   * Caller-controlled active state. When true, the icon and label render in
   * the primary (LETA red) colour; otherwise the muted idle gray.
   */
  active?: boolean;
}

const STYLE_ID = 'leta-mobile-nav-tab-styles';
const STYLES = `
  .leta-mobile-nav-tab:focus-visible {
    outline: var(--stroke-sm) solid var(--border-secondary-component-focus);
    outline-offset: 4px;
  }
`;

function ensureStyles(): void {
  if (typeof document === 'undefined') return;
  if (document.getElementById(STYLE_ID)) return;
  const el = document.createElement('style');
  el.id = STYLE_ID;
  el.textContent = STYLES;
  document.head.appendChild(el);
}

/**
 * Mobile Nav Tab — vertical icon-over-label cell for mobile bottom navigation.
 *
 * Figma `8417:23519` — 2 variants (Idle / Active). 80×58 with bottom-aligned
 * content (icon over label, 4px gap). Mobile-only, no hover.
 *
 * - Idle: icon `--icons-neutral-idle`, text `--text-default-label-idle`
 * - Active: icon `--icons-primary-default`, text `--text-primary-label`
 */
export const MobileNavTab = React.forwardRef<HTMLButtonElement, MobileNavTabProps>(
  function MobileNavTab(
    { label, icon, active = false, className, style, ...rest },
    ref,
  ) {
    ensureStyles();

    const color = active
      ? 'var(--text-primary-label)'
      : 'var(--text-default-label-idle)';
    const iconColor = active
      ? 'var(--icons-primary-default)'
      : 'var(--icons-neutral-idle)';

    return (
      <button
        ref={ref}
        type="button"
        className={`text-label-m-regular leta-mobile-nav-tab${className ? ` ${className}` : ''}`}
        style={{
          display: 'inline-flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: 'var(--spacing-4px)',
          width: 80,
          height: 58,
          background: 'transparent',
          border: 'none',
          padding: 0,
          cursor: 'pointer',
          userSelect: 'none',
          color,
          boxSizing: 'border-box',
          transition: 'color 150ms ease-out',
          ...style,
        }}
        {...rest}
      >
        <Icon name={icon} size={24} color={iconColor} />
        <span style={{ whiteSpace: 'nowrap' }}>{label}</span>
      </button>
    );
  },
);

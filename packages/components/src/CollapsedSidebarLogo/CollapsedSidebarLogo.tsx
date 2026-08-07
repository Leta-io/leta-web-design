import * as React from 'react';
import { Icon } from '@leta-io/icons';
import { LetaLogo } from '../LetaLogo/LetaLogo.js';

export type CollapsedSidebarLogoProps = Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  'type' | 'children'
> & {
  /** Required for screen reader users. Suggested: "Expand sidebar". */
  'aria-label': string;
};

const STYLE_ID = 'leta-collapsed-sidebar-logo-styles';
const STYLES = `
  .leta-csl {
    appearance: none;
    background: transparent;
    border: 0;
    margin: 0;
    padding: 0;
    width: 40px;
    height: 40px;
    cursor: pointer;
    user-select: none;
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 8px;
  }
  .leta-csl__layer {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    pointer-events: none;
    transition:
      opacity 300ms ease-out,
      background-color 150ms ease-out,
      border-color 150ms ease-out;
  }
  .leta-csl__layer--idle { opacity: 1; }
  .leta-csl__layer--hover {
    opacity: 0;
    border-radius: 8px;
    background-color: transparent;
    color: var(--text-default-label);
    padding: 10px;
    box-shadow: inset 0 0 0 var(--stroke-xs) transparent;
  }
  .leta-csl:hover:not(:disabled) .leta-csl__layer--idle,
  .leta-csl:focus-visible .leta-csl__layer--idle,
  .leta-csl[data-force-state="hover"] .leta-csl__layer--idle {
    opacity: 0;
  }
  .leta-csl:hover:not(:disabled) .leta-csl__layer--hover,
  .leta-csl:focus-visible .leta-csl__layer--hover,
  .leta-csl[data-force-state="hover"] .leta-csl__layer--hover {
    opacity: 1;
    background-color: var(--surface-neutral-ghost-button-hover);
    box-shadow: inset 0 0 0 var(--stroke-xs) var(--border-neutral-ghost-button-hover);
  }
  .leta-csl:active:not(:disabled) .leta-csl__layer--hover {
    background-color: var(--surface-neutral-ghost-button-pressed);
    box-shadow: inset 0 0 0 var(--stroke-xs) var(--border-neutral-ghost-button-pressed);
  }
  .leta-csl:focus-visible {
    outline: var(--stroke-sm) solid var(--border-secondary-component-focus);
    outline-offset: 4px;
  }
`;

function ensureStylesInjected(): void {
  if (typeof document === 'undefined') return;
  if (document.getElementById(STYLE_ID)) return;
  const el = document.createElement('style');
  el.id = STYLE_ID;
  el.textContent = STYLES;
  document.head.appendChild(el);
}

export const CollapsedSidebarLogo = React.forwardRef<
  HTMLButtonElement,
  CollapsedSidebarLogoProps
>(function CollapsedSidebarLogo({ className, ...rest }, ref) {
  React.useEffect(ensureStylesInjected, []);

  if (process.env.NODE_ENV !== 'production' && !rest['aria-label']) {
    // eslint-disable-next-line no-console
    console.warn(
      '[CollapsedSidebarLogo] aria-label is required (suggested: "Expand sidebar")',
    );
  }

  const classes = ['leta-csl', className].filter(Boolean).join(' ');

  return (
    <button ref={ref} type="button" className={classes} {...rest}>
      <span className="leta-csl__layer leta-csl__layer--idle">
        <LetaLogo type="symbol" size="small" />
      </span>
      <span className="leta-csl__layer leta-csl__layer--hover">
        <Icon name="Sidebar" size="large" color="var(--icons-neutral-button)" />
      </span>
    </button>
  );
});

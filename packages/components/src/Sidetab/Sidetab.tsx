import * as React from 'react';
import { type IconName } from '@leta-io/icons';
import { DesktopMenuOptions } from '../DesktopMenuOptions/DesktopMenuOptions.js';

/** One side-tab entry. */
export interface SidetabItem {
  /** Tab label. Default "Tab Name". */
  label?: string;
  /** Optional leading icon. */
  leadingIcon?: IconName;
}

export interface SidetabProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children' | 'onChange'> {
  /** The tabs, top to bottom. Default five "Tab Name" items. */
  tabs?: SidetabItem[];
  /** Index of the active tab. Default 0. */
  value?: number;
  /** Fired with the index of the clicked tab. */
  onChange?: (index: number) => void;
  /** Escape hatch — raw Body content instead of the data-driven `tabs`. */
  children?: React.ReactNode;
}

const DEFAULT_TABS: SidetabItem[] = [
  { label: 'Tab Name' }, { label: 'Tab Name' }, { label: 'Tab Name' }, { label: 'Tab Name' }, { label: 'Tab Name' },
];

/**
 * Sidetab — secondary, in-module navigation: a fixed-width column of side-tab
 * menu options that switch the visible section without leaving the current
 * workflow. Data-driven (`tabs` + `value`/`onChange`), composing the side-tab
 * `DesktopMenuOptions`.
 *
 * **When to use:** navigating between sections of one module/page.
 * **When not to use:** top-level product navigation (Side Bar); page-level tabs
 * across a content area (Page Tabs Control).
 */
export const Sidetab = React.forwardRef<HTMLDivElement, SidetabProps>(function Sidetab(
  { tabs = DEFAULT_TABS, value = 0, onChange, children, className, style, ...rest },
  ref,
) {
  return (
    <div
      ref={ref}
      role="tablist"
      aria-orientation="vertical"
      className={['leta-sidetab', className].filter(Boolean).join(' ')}
      style={{
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--spacing-16px)',
        width: 160,
        backgroundColor: 'var(--surface-neutral-bg-default)',
        ...style,
      }}
      {...rest}
    >
      {children ??
        tabs.map((t, i) => (
          <DesktopMenuOptions
            key={i}
            type="side-tab"
            label={t.label}
            leadingIcon={t.leadingIcon}
            showLeadingIcon={t.leadingIcon != null}
            active={i === value}
            onClick={() => onChange?.(i)}
          />
        ))}
    </div>
  );
});

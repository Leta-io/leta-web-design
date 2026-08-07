import * as React from 'react';
import { Icon } from '@leta-io/icons';

export interface TopFilterProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  /** Filter label. Typically the dimension being filtered (e.g. "Status"). */
  label?: string;
  /**
   * When true, renders a trailing Chevron-Down affordance. Advanced filters open
   * an options dropdown on click — the overlay is a separate (later) molecule, so
   * this component only fires `onClick`; it does not own or render the dropdown.
   */
  advanced?: boolean;
  /**
   * When true, the filter is currently applied. Caller-controlled. Switches the
   * border to the secondary (active) treatment and, at rest, fills with the
   * active surface. Exposed to assistive tech via `aria-pressed`.
   */
  selected?: boolean;
  /**
   * Optional badge shown between the label and chevron when `advanced && selected`.
   * Pass a Delivery Badge (`<Badge />`) to indicate which sub-status is active.
   */
  badge?: React.ReactNode;
  /**
   * Paint the selected (secondary) border on the pill itself. Default `true`.
   * `TopFilterSection`'s `animatedSelection` mode sets this `false` — it lifts the
   * active border into a floating ring that *slides* between filters, so the pill
   * must not double-paint it. The selected *fill* stays on the pill either way.
   */
  showSelectedBorder?: boolean;
}

const STYLE_ID = 'leta-top-filter-styles';
const TOP_FILTER_STYLES = `
  .leta-top-filter:focus-visible {
    outline: var(--stroke-sm) solid var(--border-secondary-component-focus);
    outline-offset: 4px;
  }
`;

function ensureStyles(): void {
  if (typeof document === 'undefined') return;
  if (document.getElementById(STYLE_ID)) return;
  const el = document.createElement('style');
  el.id = STYLE_ID;
  el.textContent = TOP_FILTER_STYLES;
  document.head.appendChild(el);
}

/**
 * Top Filter — a compact, pill-shaped filter control for table/list toolbars.
 * Filters rows by a status (or similar categorical dimension).
 *
 * **When to use:**
 * - Quick status/category filters in a table toolbar.
 * - `advanced` for filters whose options live behind a dropdown; `basic`
 *   (default) for a single on/off toggle.
 *
 * **When NOT to use:**
 * - For navigation — use Page Tabs Control or Desktop Segment Control.
 * - For free-text search — use a search input.
 * - As a general-purpose chip/tag — use Chip or Tag.
 *
 * 2 types (Basic / Advanced) × 6 states (Idle / Hover / Pressed and their
 * `-Selected` counterparts) = 12 Figma variants (`1572:12741`). Renders a
 * `<button>`; hover/press are tracked internally, `selected` is caller-controlled.
 */
export const TopFilter = React.forwardRef<HTMLButtonElement, TopFilterProps>(
  function TopFilter(
    {
      label = 'Status',
      advanced = false,
      selected = false,
      badge,
      showSelectedBorder = true,
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

    /* Surface: hover/pressed fills are identical whether or not the filter is
     * selected; they only diverge at rest (selected → active fill). */
    const bg = pressed
      ? 'var(--surface-neutral-top-filter-tab-pressed)'
      : hovered
        ? 'var(--surface-neutral-top-filter-tab-hover)'
        : selected
          ? 'var(--surface-neutral-top-filter-tab-active)'
          : 'var(--surface-neutral-top-filter-tab-idle)';

    /* Border: selected uses the secondary (active) border in every state — unless
     * the section owns it as a floating slide ring (`showSelectedBorder: false`),
     * in which case the pill falls back to the neutral interaction borders. */
    const border = selected && showSelectedBorder
      ? 'var(--border-secondary-top-filter-tab-active)'
      : pressed
        ? 'var(--border-neutral-top-filter-tab-pressed)'
        : hovered
          ? 'var(--border-neutral-top-filter-tab-hover)'
          : 'var(--border-neutral-top-filter-tab-idle)';

    return (
      <button
        ref={ref}
        type="button"
        aria-pressed={selected}
        className={`text-label-m-semibold leta-top-filter${className ? ` ${className}` : ''}`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 'var(--spacing-8px)',
          height: 40,
          paddingTop: 'var(--padding-8px)',
          paddingBottom: 'var(--padding-8px)',
          paddingLeft: 'var(--padding-12px)',
          // Advanced tightens the right side toward the chevron (10 vs 12).
          paddingRight: advanced ? 'var(--padding-10px)' : 'var(--padding-12px)',
          borderRadius: 'var(--rounding-lg)',
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
        {label}
        {advanced && selected && badge}
        {advanced && (
          <Icon name="Chevron-Down" size={16} color="var(--icons-neutral-button)" />
        )}
      </button>
    );
  },
);

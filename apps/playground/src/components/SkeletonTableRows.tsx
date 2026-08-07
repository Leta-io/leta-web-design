import * as React from 'react';
import { Skeleton, type TableColumn } from '@leta-io/components';

interface SkeletonTableRowsProps {
  /** The active table's real column set — cell widths mirror it exactly (fixed
   * columns get their `width`, flexible ones their `flex`/`minWidth`), so the
   * placeholder reads as "this table, not yet loaded" rather than a generic grid. */
  columns: TableColumn[];
  /** Whether the real table renders the `<Table selectable>` checkbox column (not
   * part of `columns` — added by the Table itself), so the skeleton can mirror it. */
  selectable?: boolean;
  rows?: number;
  rowHeight?: number;
}

function cellFlexStyle(col: TableColumn): React.CSSProperties {
  if (col.width != null) {
    return { flex: `0 0 ${typeof col.width === 'number' ? `${col.width}px` : col.width}` };
  }
  const flex = col.flex ?? 1;
  const min = col.minWidth ?? 0;
  return { flex: `${flex} 1 ${typeof min === 'number' ? `${min}px` : min}` };
}

const CheckboxCell = () => (
  <div style={{ flex: '0 0 52px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <Skeleton width={16} height={16} borderRadius={4} />
  </div>
);

/**
 * Skeleton-row placeholder standing in for the real `Table` during a
 * *subsequent* update (filter, sort, tab switch, refresh) — never a first
 * load, which uses `LoadingOverlay` instead (see `OrdersPage`'s
 * `firstLoading`/`tableRefreshing` split). No scrim; the toolbars around this
 * region stay mounted and interactive the whole time.
 *
 * The header row renders its real labels immediately, not skeleton blocks —
 * column names are static, already-known content, never actually "loading"
 * (the same reason a shimmering block there read as a bug: the header's
 * background, `--surface-neutral-table-header-idle`, resolves to the exact
 * same color as the skeleton's own base token, so it was invisible against
 * it). The header's checkbox slot is left blank rather than a real, clickable
 * select-all — there's nothing real to select yet.
 */
export function SkeletonTableRows({ columns, selectable = false, rows = 8, rowHeight = 72 }: SkeletonTableRowsProps): React.ReactElement {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading orders"
      style={{
        flex: 1,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
        border: 'var(--stroke-xs) solid var(--border-neutral-default)',
        borderRadius: 'var(--rounding-xl)',
        overflow: 'hidden',
      }}
    >
      <div style={{ display: 'flex', height: 40, flexShrink: 0, backgroundColor: 'var(--surface-neutral-table-header-idle)' }}>
        {selectable && <div style={{ flex: '0 0 52px' }} />}
        {columns.map((col, i) => (
          <div key={i} style={{ ...cellFlexStyle(col), minWidth: 0, display: 'flex', alignItems: 'center', padding: '0 var(--padding-12px)', boxSizing: 'border-box' }}>
            {col.label && (
              <span className="text-label-s-semibold" style={{ color: 'var(--text-default-sub-heading)' }}>
                {col.label}
              </span>
            )}
          </div>
        ))}
      </div>
      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {Array.from({ length: rows }, (_, r) => (
          <div key={r} style={{ display: 'flex', height: rowHeight, borderTop: 'var(--stroke-xs) solid var(--border-neutral-default)' }}>
            {selectable && <CheckboxCell />}
            {columns.map((col, i) => (
              <div key={i} style={{ ...cellFlexStyle(col), minWidth: 0, display: 'flex', alignItems: 'center', padding: '0 var(--padding-12px)', boxSizing: 'border-box' }}>
                <Skeleton width="70%" height={16} />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

import * as React from 'react';
import { type IconName } from '@leta-io/icons';
import { Cell } from '../Cell/Cell.js';
import { DataRows, type DataRowsVariant, type DataRowCell } from '../DataRows/DataRows.js';
import { Pagination } from '../Pagination/Pagination.js';

/**
 * Column category from the Table Column Layout spec. Drives the default sizing
 * mode so the right choice is the default:
 * - `primary` — the record's main content (Driver, Route, Recipient, Customer).
 *   **Flexible**: absorbs the remaining width via a `flex` weight (defaults to 1
 *   if no `flex` is given). Never give a `primary` column a fixed `width`.
 * - `identifier` — uniquely identifies the record but doesn't benefit from extra
 *   width (Order ID, Trip ID, Invoice #). **Fixed `width`**, truncates safely.
 * - `secondary` — predictable supporting context (Depot, Service Type, Region).
 *   **Fixed `width`**.
 * - `utility` — small metadata/status (Status, Duration, Created, Priority).
 *   **Fixed `width`**, only as wide as the content needs.
 * - `control` — interactions, not information (Checkbox, Overflow, Actions). The
 *   smallest columns; **fixed `width`**; an actions column carries no header label.
 *
 * The golden rule the role enforces: **never make all columns equal width** —
 * only `primary` columns flex; everything else is fixed.
 */
export type TableColumnRole = 'primary' | 'identifier' | 'secondary' | 'utility' | 'control';

/** A column definition — drives one header cell and the matching body column width. */
export interface TableColumn {
  /** Header label. Omit (or pass `''`) for an action/utility column that should have no header — the header bar stays full-width but the cell is blank. */
  label?: string;
  /**
   * Column category (Table Column Layout spec). Sets the default sizing mode:
   * `primary` → flexible (flex weight, defaults to 1); all other roles → fixed
   * `width`. Optional, but recommended — it documents intent and makes "never all
   * equal width" the default. Explicit `width`/`flex` always win over the role.
   */
  role?: TableColumnRole;
  /**
   * Horizontal alignment of this column's header label AND every body value in it.
   * `'right'` for numeric columns (Distance, Duration) per the Cell annotations'
   * "right-align numerics" rule — figures read down a right edge, so magnitudes
   * are comparable at a glance. Defaults to left.
   *
   * Deliberately a **column** property: aligning only the cells would leave the
   * header label sitting over the opposite edge of its own numbers.
   */
  align?: 'left' | 'right';
  /** Fixed column width (px or CSS). Omit → the column flexes to fill an equal share. */
  width?: number | string;
  /**
   * Proportional flex weight (flex-grow). When set (and no `width`), the column
   * flexes to a share of the remaining width proportional to its weight — e.g.
   * a `flex: 2` column gets twice the slack of a `flex: 1` column. Lets the whole
   * table scale to any viewport with balanced, content-appropriate proportions
   * instead of equal-width flex columns. Ignored if `width` is set.
   *
   * The percentage split is the source of truth; weights are that ratio expressed
   * for `flex-grow`, with **Recipient as the 1.00 base** (spec §3.2): Route `1.48`
   * (40%), Driver `1.22` (33%), Recipient `1.00` (27%). Weights are relative, so
   * when a flexible column is added or removed the rest redistribute
   * proportionally on their own (drop Driver → Route/Recipient settle at 60/40).
   */
  flex?: number;
  /**
   * Minimum width (px or CSS) — the column's **floor** (spec §3.4): the smallest
   * width that avoids truncating its protected content. Applies to flexible and
   * bounded-flexible columns (ignored when a plain fixed `width` is set); on shrink
   * the column freezes here and the remaining shrink redistributes to columns still
   * above their floors. Base a name floor on a representative (p90) length, not the
   * longest possible. Defaults to 0.
   */
  minWidth?: number | string;
  /**
   * Maximum width (px or CSS) for a **bounded-flexible** column (spec §3.3) — a
   * Primary Identifier (e.g. Order ID) promoted to flex within a `minWidth`–
   * `maxWidth` band with a low `flex` weight: it sits at its min on constrained
   * screens, grows slowly once every primary floor is satisfied, then stops at its
   * max and cedes further width to the primary flexible columns. Never use this for
   * unbounded growth. Ignored when a plain fixed `width` is set.
   */
  maxWidth?: number | string;
  /**
   * Screen-reader-only accessible name for a column whose visible `label` is empty
   * (spec §8) — the Control/Actions and checkbox columns carry no *visible* header
   * (icons already read as interactive), but the header cell still needs an
   * accessible name (e.g. "Actions") so the column is never announced as empty.
   */
  accessibleName?: string;
  /**
   * Pin (sticky) this column to an edge while the table scrolls horizontally
   * (spec §4.3) — the **anchor** columns stay visible so every row is identifiable
   * as the middle scrolls. `'left'` for the leading identifier (Order ID; the
   * checkbox pins with it), `'right'` for the trailing Actions column. Only takes
   * effect when `scrollX` is on; a no-op otherwise (flex-fill). Pin offsets are
   * computed from the widths of preceding same-side pinned columns.
   */
  pinned?: 'left' | 'right';
  /** Render the header's leading info icon. */
  showLeadingIcon?: boolean;
  /** The header leading icon (outlined). Default `Info`. */
  leadingIcon?: IconName;
  /** Render the header's trailing (sort) icon. */
  showTrailingIcon?: boolean;
  /** The header trailing icon (outlined). Default `Info`. */
  trailingIcon?: IconName;
  /** Hover tooltip on the trailing icon (e.g. the Duration header's ⓘ). */
  trailingIconTooltip?: string;
}

/** A body row — its cells line up with `columns` by index (excluding the checkbox column). */
export interface TableRow {
  /** One cell per column. Each cell's `width` defaults to the matching column's width. */
  cells: DataRowCell[];
  /** Selected (Active) row — highlights the row and checks its checkbox. */
  selected?: boolean;
}

export interface TableProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children' | 'rows'> {
  /** Column definitions (drive the header + shared column widths). */
  columns?: TableColumn[];
  /** Body rows. */
  rows?: TableRow[];
  /** Row density for every body row. Default `basic` (52px); `complex` is 80px. */
  rowVariant?: DataRowsVariant;
  /** Prepend a 52px checkbox column (header-checkbox + per-row default-checkbox). Default true. */
  selectable?: boolean;
  /**
   * Selection is managed internally: clicking a row's checkbox toggles it;
   * clicking the header checkbox selects/clears all rows; the header shows the
   * indeterminate glyph when only some rows are selected. Seed the initial
   * selection via each row's `selected` flag. `onSelectionChange` reports the
   * selected row indices.
   */
  onSelectionChange?: (selectedIndices: number[]) => void;
  /**
   * Fired when a body row is clicked (OM §3.1 — a dynamic table's row is a
   * target, typically opening the record's detail view). Clicks that originate
   * from interactive elements inside the row — the selection checkbox, inline
   * cell buttons/links/inputs — are ignored so they keep acting independently
   * (§3.1: "the checkbox column is the only selection target"; inline buttons
   * stop propagation). Rows get `cursor: pointer` while this is set.
   */
  onRowClick?: (rowIndex: number) => void;

  /** Render the Pagination footer. Default true. */
  showPagination?: boolean;
  /** Show the Pagination page-number cluster. Default true; `false` → count + rows-per-page only. */
  showPages?: boolean;
  /**
   * Horizontal-scroll mode (spec §4.3). Keep columns at their natural widths and
   * let the table scroll **horizontally** (and vertically) instead of shrinking
   * cells below their floors. The header sticks to the top during vertical
   * scroll and scrolls in sync with the body horizontally; pinned anchor columns
   * (Order ID left / Actions right) engage.
   *
   * - `'auto'` (recommended) — measures: scroll activates **only while the
   *   table's minimum width** (checkbox + fixed columns + flexible floors)
   *   **exceeds the container** — the spec's rule. Both §4.3 triggers fall out
   *   of the same check: narrowing the window, or switching on an optional
   *   column that no longer fits. On a sparse table with surplus space, an
   *   optional column simply joins the flex-fill — no scroll.
   * - `true` — force scroll mode on unconditionally.
   * - `false` (default) — never scroll; columns flex to fill the container.
   */
  scrollX?: boolean | 'auto';
  /** Current page (1-based). */
  page?: number;
  /** Total pages. */
  pageCount?: number;
  /** Fired with the next page. */
  onPageChange?: (page: number) => void;
  /** Pagination count summary. Default "Showing 10 of 180". */
  countLabel?: string;
  /** Rows-per-page value shown in the selector. Default 10. */
  rowsPerPage?: number;
  /** Fired when the rows-per-page selector is activated. */
  onRowsPerPageClick?: () => void;

  /**
   * Constrain the body height — the body scrolls under a sticky header/footer.
   * Mirrors Figma's fixed Scroll Frame. Omit → the body sizes to its rows.
   */
  maxBodyHeight?: number | string;
  /**
   * Fill the available height of a flex-column parent (`flex: 1`) instead of
   * sizing to the rows: the body scrolls internally while the header and the
   * Pagination footer stay pinned. Use inside a Page / Table Container that owns
   * a fixed viewport so the pagination is always visible without page scroll.
   */
  fillHeight?: boolean;
  /** Escape hatch — raw body content (e.g. custom `DataRows`) instead of `rows`. */
  children?: React.ReactNode;
}

const DIVIDER = 'var(--stroke-xs) solid var(--border-neutral-default)';

/** Visually hidden but exposed to assistive tech (for empty-label column headers). */
const SR_ONLY: React.CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
  border: 0,
};

// Scrollbar chrome control:
// - `.leta-table-noscrollbar` — the default (non-scrollX) body scroller is vertical-only
//   and shows NO scrollbar at all (scroll still works via wheel/trackpad; pinned
//   pagination reads as the boundary). `scrollbar-width: none` covers Firefox and
//   `::-webkit-scrollbar { display: none }` covers WebKit/Blink in every mode
//   (including macOS "always show scroll bars" / classic scrollbars).
// - `.leta-table-scrollx` — the scrollX viewport scrolls both axes: the VERTICAL bar is
//   killed via `width: 0` on `::-webkit-scrollbar` (the `width` dimension only applies
//   to the vertical scrollbar, `height` only to the horizontal — no `:vertical`
//   pseudo-class needed, which some engines drop), while the HORIZONTAL bar stays as the
//   §4.3 overflow cue — a **6px rounded pill on a track inset 16px from each side**
//   (small + not edge-to-edge, per the design review). `scrollbar-width` is
//   intentionally omitted here (it is all-or-nothing; Firefox degrades to both bars).
//
// Pinned-edge fades (§4.3 affordance):
// - `.leta-table-pin-left/right` mark the pinned anchor cells. Each paints a soft
//   14px gradient (`::after`) over the scrolling middle at its inner edge — the
//   "content continues under here" fade (replaces the old hard 2px box-shadow).
// - The fades live INSIDE the cells (top/bottom bound to the cell box), so they can
//   never overlay the horizontal scrollbar at the viewport's bottom edge — the
//   "fade edge doesn't override scrollbar" rule.
// - They fade out at the scroll extremes: the viewport tracks `data-at-start` /
//   `data-at-end` (scroll listener) and the matching side's gradient hides — no
//   affordance when there is nothing more to reveal on that side.
const TABLE_STYLE_ID = 'leta-table-scroll';
const TABLE_CSS = `
.leta-table-noscrollbar { scrollbar-width: none; -ms-overflow-style: none; }
.leta-table-noscrollbar::-webkit-scrollbar { display: none; width: 0; height: 0; }
.leta-table-scrollx::-webkit-scrollbar { width: 0; height: 6px; }
.leta-table-scrollx::-webkit-scrollbar-track { background: transparent; margin: 0 16px; }
.leta-table-scrollx::-webkit-scrollbar-corner { background: transparent; }
.leta-table-scrollx::-webkit-scrollbar-thumb { background: var(--border-neutral-default); border-radius: 999px; }
.leta-table-scrollx::-webkit-scrollbar-thumb:hover { background: var(--icons-neutral-idle); }
.leta-table-pin-left::after, .leta-table-pin-right::after {
  content: ''; position: absolute; top: 0; bottom: 0; width: 24px;
  pointer-events: none; opacity: 1; transition: opacity 160ms ease;
}
/* Eased falloff (extra stops approximate ease-out) — a plain two-stop linear
   gradient reads as a harsh band; this melts into the background. */
.leta-table-pin-left::after { left: 100%; background: linear-gradient(to right, rgba(16,16,16,0.045), rgba(16,16,16,0.028) 30%, rgba(16,16,16,0.012) 60%, rgba(16,16,16,0)); }
.leta-table-pin-right::after { right: 100%; background: linear-gradient(to left, rgba(16,16,16,0.045), rgba(16,16,16,0.028) 30%, rgba(16,16,16,0.012) 60%, rgba(16,16,16,0)); }
.leta-table-scrollx[data-at-start="true"] .leta-table-pin-left::after { opacity: 0; }
.leta-table-scrollx[data-at-end="true"] .leta-table-pin-right::after { opacity: 0; }
`;
function ensureTableStyles(): void {
  if (typeof document === 'undefined' || document.getElementById(TABLE_STYLE_ID)) return;
  const el = document.createElement('style');
  el.id = TABLE_STYLE_ID;
  el.textContent = TABLE_CSS;
  document.head.appendChild(el);
}

const DEFAULT_COLUMNS: TableColumn[] = [
  { label: 'Label', role: 'primary' }, { label: 'Label', role: 'primary' }, { label: 'Label', role: 'primary' },
  { label: 'Label', role: 'primary' }, { label: 'Label', role: 'primary' },
  { label: 'Label', role: 'utility', width: 107 }, { role: 'control', width: 67 },
];
const DEFAULT_ROW_CELLS: DataRowCell[] = [
  { type: 'sample' }, { type: 'sample' }, { type: 'sample' }, { type: 'sample' }, { type: 'sample' },
  { type: 'status', width: 107 }, { type: 'actions', width: 67 },
];
const DEFAULT_ROWS: TableRow[] = Array.from({ length: 10 }, () => ({ cells: DEFAULT_ROW_CELLS }));

/**
 * Wrap a cell in its column box — a fixed width, or a flexible/bounded-flexible
 * weight with a `minWidth` floor and optional `maxWidth` cap (bounded flex).
 */
function Col({
  width,
  flex,
  minWidth,
  maxWidth,
  pinned,
  pinInset,
  children,
}: {
  width?: number | string;
  flex?: number;
  minWidth?: number | string;
  maxWidth?: number | string;
  /** Sticky-pin this header cell to an edge on horizontal scroll (§4.3). */
  pinned?: 'left' | 'right';
  /** Px offset from the pinned edge (summed width of preceding same-side pins). */
  pinInset?: number;
  children: React.ReactNode;
}) {
  // Flexible columns use their FLOOR as the flex-basis (spec §4.1: floors are
  // satisfied first, then the surplus is shared by weight). A 0 basis would
  // instead split the whole pool by weight — squeezing the low-weight bounded
  // identifier and over-widening Route vs the approved design.
  const basis = typeof minWidth === 'number' ? `${minWidth}px` : '0';
  const sizing =
    width != null ? { width, flexShrink: 0 } : flex != null ? { flex: `${flex} 1 ${basis}` } : { flex: '1 1 0' };
  return (
    <div
      // Pinned cells carry the edge-fade class — a soft gradient (::after) over
      // the scrolling middle replaces the old hard box-shadow; the viewport's
      // data-at-start/end attributes hide it at the scroll extremes.
      className={pinned ? `leta-table-pin-${pinned}` : undefined}
      style={{
        display: 'flex',
        minWidth: minWidth ?? 0,
        maxWidth,
        ...sizing,
        // Pinned header cell — corner (sticky top + side), so it sits above the
        // sticky header row (z1) and the pinned body cells (z2). Opaque header
        // background occludes the scrolling middle.
        ...(pinned
          ? {
              position: 'sticky',
              [pinned]: pinInset ?? 0,
              zIndex: 3,
              backgroundColor: 'var(--surface-neutral-table-header-idle)',
            }
          : null),
      }}
    >
      {children}
    </div>
  );
}

/**
 * Resolve a column's effective sizing from the Table Column Layout spec:
 * - explicit `width` → fixed;
 * - else `flex` (or a `primary` role, which defaults to flex 1) → flexible, carrying
 *   its `minWidth` floor and — for a bounded-flexible identifier (§3.3) — a `maxWidth`
 *   cap so it grows only within its band.
 * Non-primary columns with neither width nor flex are left un-sized (equal flex) —
 * a dev warning flags that as a spec violation.
 */
function resolveSizing(c: TableColumn): {
  width?: number | string;
  flex?: number;
  minWidth?: number | string;
  maxWidth?: number | string;
} {
  if (c.width != null) return { width: c.width };
  const flex = c.flex ?? (c.role === 'primary' ? 1 : undefined);
  return { flex, minWidth: c.minWidth, maxWidth: c.maxWidth };
}

/**
 * The design canvas content width the column instances are declared at
 * (1440 screen − 72 collapsed sidebar − 48 page padding). Up to this width the
 * shrink model applies (§4.2); beyond it the approved layout **scales** (§4.4).
 */
const DESIGN_CONTENT_WIDTH = 1320;

/**
 * Run the spec's allocation (§4.1) at the design width to recover every column's
 * **design width** — the px it renders at on the 1320 canvas: fixed columns →
 * their `width`; flexible columns → floor + weighted share of the design-width
 * surplus, with a bounded column (§3.3) clamped at its max and the excess
 * redistributed by weight. These px are the reference for wide-viewport
 * proportional scaling (§4.4).
 */
function computeDesignWidths(
  columns: TableColumn[],
  resolved: ReturnType<typeof resolveSizing>[],
  selectable: boolean,
): { designPx: number[]; designTotal: number } {
  const checkbox = selectable ? 52 : 0;
  const num = (v: number | string | undefined): number => (typeof v === 'number' ? v : 0);
  // Mirror the render defaults: a column with no `width` flexes — at its declared
  // weight, else weight 1 (Col's `flex: 1 1 0` fallback) — so legacy/un-roled
  // columns get a real design width instead of collapsing in scaled mode.
  const flexOf = (i: number): number => resolved[i]?.flex ?? (resolved[i]?.width == null ? 1 : 0);
  const designPx = resolved.map((r) => num(r.width));
  const fixedSum = designPx.reduce((a, b) => a + b, 0);
  let active = resolved.flatMap((r, i) => (r.width == null ? [i] : []));
  const floorsSum = active.reduce((s, i) => s + num(resolved[i]?.minWidth), 0);
  let remaining = Math.max(0, DESIGN_CONTENT_WIDTH - checkbox - fixedSum - floorsSum);
  // Iteratively clamp bounded columns at their max, ceding the excess by weight.
  for (let pass = 0; pass <= columns.length; pass++) {
    const wSum = active.reduce((s, i) => s + flexOf(i), 0);
    if (wSum <= 0) break;
    const over = active.find((i) => {
      const max = resolved[i]?.maxWidth;
      if (typeof max !== 'number') return false;
      return num(resolved[i]?.minWidth) + (flexOf(i) / wSum) * remaining > max;
    });
    if (over == null) {
      active.forEach((i) => {
        designPx[i] = num(resolved[i]?.minWidth) + (flexOf(i) / wSum) * remaining;
      });
      break;
    }
    const max = num(resolved[over]?.maxWidth);
    designPx[over] = max;
    remaining -= max - num(resolved[over]?.minWidth);
    active = active.filter((i) => i !== over);
  }
  return { designPx, designTotal: checkbox + designPx.reduce((a, b) => a + b, 0) };
}

/**
 * Table — a full LETA data table: a bordered, rounded card stacking a column
 * header (`Cell type="header"`), a body of `DataRows`, and a `Pagination` footer.
 * Columns are defined once (`columns`) and shared by the header and every row so
 * they always align; set `selectable` for the leading checkbox column. The body
 * can scroll under a sticky header via `maxBodyHeight`. Hairline dividers separate
 * the header and every row, matching the design.
 *
 * **Width:** the table fills its container (`width: 100%`) — it expands to the
 * viewport/content frame it sits in; the Figma frame's fixed width is just the
 * design canvas, not a constraint. **Selection is internal** — the header
 * checkbox selects/clears all rows and shows the indeterminate glyph for a
 * partial selection; per-row checkboxes toggle individually.
 *
 * **When to use:** displaying a paged set of tabular records.
 * **When not to use:** a single record's fields → a form / Content Card; the
 * surrounding toolbar + empty-state shell → Table Container.
 */
export const Table = React.forwardRef<HTMLDivElement, TableProps>(function Table(
  {
    columns = DEFAULT_COLUMNS,
    rows = DEFAULT_ROWS,
    rowVariant = 'basic',
    selectable = true,
    onSelectionChange,
    onRowClick,
    showPagination = true,
    showPages = true,
    scrollX = false,
    page = 1,
    pageCount = 10,
    onPageChange,
    countLabel = 'Showing 10 of 180',
    rowsPerPage = 10,
    onRowsPerPageClick,
    maxBodyHeight,
    fillHeight = false,
    children,
    className,
    style,
    ...rest
  },
  ref,
) {
  ensureTableStyles();

  // Selection is internal: seeded from each row's `selected`, then toggled by
  // the row + header checkboxes. The header is checked when all rows are
  // selected, indeterminate when only some are.
  const [selected, setSelected] = React.useState<Set<number>>(
    () => new Set(rows.flatMap((r, i) => (r.selected ? [i] : []))),
  );
  // Re-sync when the caller drives `rows[].selected` externally (e.g. "clear
  // selection" or deselecting one row from a bulk-actions overlay) — without
  // this, only the initial mount seed ever applied, so callers had to force a
  // full remount (via `key`) to reset checkboxes, which visibly flashed the
  // whole table. A toggle-driven change round-trips through `onSelectionChange`
  // and comes back as an identical seed, so this is a no-op in that path.
  const selectionSeed = React.useMemo(
    () => rows.flatMap((r, i) => (r.selected ? [i] : [])).join(','),
    [rows],
  );
  const lastSeedRef = React.useRef(selectionSeed);
  React.useEffect(() => {
    if (lastSeedRef.current === selectionSeed) return;
    lastSeedRef.current = selectionSeed;
    setSelected(new Set(selectionSeed ? selectionSeed.split(',').map(Number) : []));
  }, [selectionSeed]);
  const allSelected = selectable && rows.length > 0 && selected.size === rows.length;
  const someSelected = selectable && selected.size > 0 && selected.size < rows.length;

  // Effective per-column sizing, derived from `role`/`width`/`flex` (spec model).
  const resolved = React.useMemo(() => columns.map(resolveSizing), [columns]);

  // §4.4 Wide viewports — scale the design. Beyond the design width (the 1320px
  // canvas the instances were approved at), dumping every surplus pixel into the
  // primaries breaks visual balance on sparse instances (voids inside Route/
  // Recipient). Instead the whole approved layout scales: information columns
  // grow proportionally to their design px (and never render below them);
  // control columns (checkbox/actions) hold their fixed px; a bounded identifier
  // keeps its §3.3 max. The two models agree exactly at the design width.
  const design = React.useMemo(
    () => computeDesignWidths(columns, resolved, selectable),
    [columns, resolved, selectable],
  );
  // §4.3 — the table's minimum width: checkbox + every fixed column's width +
  // every flexible column's floor. Scroll (in `scrollX="auto"`) activates only
  // while the container is narrower than this — the spec's "viewport below the
  // minimum" rule; above it, optional columns just join the flex-fill.
  const minTotal = React.useMemo(() => {
    const num = (v: number | string | undefined): number => (typeof v === 'number' ? v : 0);
    return (
      (selectable ? 52 : 0) +
      resolved.reduce((sum, r) => sum + (r.width != null ? num(r.width) : num(r.minWidth)), 0)
    );
  }, [resolved, selectable]);

  const rootRef = React.useRef<HTMLDivElement | null>(null);
  const [wide, setWide] = React.useState(false);
  const [needScroll, setNeedScroll] = React.useState(false);
  React.useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const check = () => {
      setWide(el.clientWidth > design.designTotal + 1);
      setNeedScroll(el.clientWidth < minTotal - 1);
    };
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, [design.designTotal, minTotal]);
  // Resolved scroll mode: 'auto' → measured (§4.3), booleans pass through.
  const scrollActive = scrollX === 'auto' ? needScroll : scrollX;

  // Scroll-extreme tracking for the pinned-edge fades: `data-at-start`/`data-at-end`
  // on the scroll viewport hide the left/right gradient when there is nothing more
  // to reveal on that side. Written straight to the DOM (dataset) — scroll events
  // must not re-render the table.
  const scrollerRef = React.useRef<HTMLDivElement | null>(null);
  const updateScrollEdges = React.useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    el.dataset.atStart = String(el.scrollLeft <= 1);
    el.dataset.atEnd = String(el.scrollLeft + el.clientWidth >= el.scrollWidth - 1);
  }, []);
  React.useEffect(() => {
    if (!scrollActive) return;
    updateScrollEdges();
    const el = scrollerRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(updateScrollEdges);
    ro.observe(el);
    return () => ro.disconnect();
  }, [scrollActive, columns, updateScrollEdges]);
  const effective = React.useMemo(() => {
    if (!wide) return resolved;
    return resolved.map((r, i) => {
      if (columns[i]?.role === 'control') return r; // controls never scale
      const dpx = design.designPx[i] ?? 0;
      if (dpx <= 0) return r;
      return { flex: dpx, minWidth: dpx, maxWidth: r.maxWidth };
    });
  }, [wide, resolved, columns, design]);

  // Sticky-pin offsets for the anchor columns (spec §4.3) — only in scrollX mode.
  // Left-pinned columns stack after the (pinned) checkbox; right-pinned stack from
  // the right edge. A pinned column's inset is the summed width of the preceding
  // same-side pinned columns; use its fixed `width`, else its `minWidth` floor.
  const pins = React.useMemo(() => {
    const info: (undefined | { side: 'left' | 'right'; inset: number })[] = columns.map(() => undefined);
    if (!scrollActive) return info;
    const numW = (i: number): number => {
      const w = effective[i]?.width;
      if (typeof w === 'number') return w;
      const mw = effective[i]?.minWidth;
      return typeof mw === 'number' ? mw : 0;
    };
    let leftAcc = selectable ? 52 : 0; // the checkbox pins at left:0 and occupies 52
    for (let i = 0; i < columns.length; i++) {
      if (columns[i]?.pinned === 'left') {
        info[i] = { side: 'left', inset: leftAcc };
        leftAcc += numW(i);
      }
    }
    let rightAcc = 0;
    for (let i = columns.length - 1; i >= 0; i--) {
      if (columns[i]?.pinned === 'right') {
        info[i] = { side: 'right', inset: rightAcc };
        rightAcc += numW(i);
      }
    }
    return info;
  }, [columns, effective, scrollActive, selectable]);

  // Dev guard: the spec forbids equal-width tables — there must be at least one
  // flexible (primary) column to absorb the remaining space.
  if (process.env.NODE_ENV !== 'production') {
    const hasFlexible = resolved.some((r) => r.flex != null) || columns.some((c) => c.role === 'primary');
    if (columns.length > 1 && !hasFlexible) {
      // eslint-disable-next-line no-console
      console.warn(
        '[Table] No flexible (primary) column. Per the Table Column Layout spec, never make all columns equal width — give the main content column(s) `role: "primary"` (or a `flex` weight) so they absorb the remaining space. See the table-column-layout skill / column presets.',
      );
    }
  }

  const emit = (next: Set<number>) => {
    setSelected(next);
    onSelectionChange?.([...next].sort((a, b) => a - b));
  };
  const toggleRow = (i: number) => {
    const next = new Set(selected);
    next.has(i) ? next.delete(i) : next.add(i);
    emit(next);
  };
  const toggleAll = () => emit(allSelected ? new Set() : new Set(rows.map((_, i) => i)));

  // Header row. In scrollX mode it lives inside the scroll viewport: it sticks to the
  // top during vertical scroll and scrolls in sync with the body horizontally.
  const headerRow = (
    <div
      role="row"
      style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'stretch',
        height: 40,
        borderBottom: DIVIDER,
        flexShrink: 0,
        backgroundColor: 'var(--surface-neutral-table-header-idle)',
        ...(scrollActive ? { position: 'sticky', top: 0, zIndex: 4 } : null),
      }}
    >
      {selectable && (
        <Col width={52} pinned={scrollActive ? 'left' : undefined} pinInset={0}>
          <Cell
            type="header-checkbox"
            checked={allSelected}
            indeterminate={someSelected}
            onCheckedChange={toggleAll}
            style={{ height: '100%' }}
          />
        </Col>
      )}
      {columns.map((c, i) => (
        <Col key={i} width={effective[i]?.width} flex={effective[i]?.flex} minWidth={effective[i]?.minWidth} maxWidth={effective[i]?.maxWidth} pinned={pins[i]?.side} pinInset={pins[i]?.inset}>
          {/* Control/Actions & checkbox columns carry no visible label but keep an
              SR-only accessible name so the column is never announced as empty (§8). */}
          {!c.label && c.accessibleName ? <span style={SR_ONLY}>{c.accessibleName}</span> : null}
          <Cell
            type="header"
            columnName={c.label ?? ''}
            showLeadingIcon={c.showLeadingIcon}
            leadingIcon={c.leadingIcon}
            showTrailingIcon={c.showTrailingIcon}
            trailingIcon={c.trailingIcon}
            trailingIconTooltip={c.trailingIconTooltip}
            align={c.align}
            style={{ height: '100%' }}
          />
        </Col>
      ))}
    </div>
  );

  const bodyRows =
    children ??
    rows.map((row, i) => {
      const isSelected = selectable && selected.has(i);
      // In wide (scaled, §4.4) mode the column's effective sizing must win over any
      // per-cell width, or a cell's own px would desync the body from the scaled
      // header. In normal mode, per-cell overrides keep their precedence.
      const mergeCol = (c: DataRowCell, j: number) => ({
        ...c,
        width: wide ? effective[j]?.width : c.width ?? effective[j]?.width,
        flex: wide ? effective[j]?.flex : c.flex ?? effective[j]?.flex,
        minWidth: wide ? effective[j]?.minWidth : c.minWidth ?? effective[j]?.minWidth,
        maxWidth: wide ? effective[j]?.maxWidth : c.maxWidth ?? effective[j]?.maxWidth,
        // Pin the anchor columns identically to the header (§4.3), scrollX only.
        pinned: pins[j]?.side,
        pinInset: pins[j]?.inset,
        // Alignment is a COLUMN property, so the header label and every body value
        // right-align together. Setting it per-cell would drift the numbers away
        // from their own header.
        align: c.align ?? columns[j]?.align,
      });
      const cells: DataRowCell[] = selectable
        ? [
            {
              type: 'default-checkbox',
              width: 52,
              checked: isSelected,
              onCheckedChange: () => toggleRow(i),
              // Checkbox pins left with Order ID so the selection anchor stays put.
              ...(scrollActive ? { pinned: 'left' as const, pinInset: 0 } : null),
            },
            ...row.cells.map(mergeCol),
          ]
        : row.cells.map(mergeCol);
      // Between-row dividers only; the body→footer separator is the Pagination's
      // top border (so the last row carries no border and the separator stays
      // fixed even when the body scrolls).
      const isLast = i === rows.length - 1;
      return (
        <div
          key={i}
          style={{ borderBottom: isLast ? undefined : DIVIDER, cursor: onRowClick ? 'pointer' : undefined }}
          onClick={
            onRowClick
              ? (e) => {
                  // §3.1 — the checkbox + inline cell controls act independently
                  // of the row target: a click that originates inside any
                  // interactive element never opens the row.
                  const el = e.target as HTMLElement;
                  if (el.closest('button, a, input, label, [role="button"]')) return;
                  onRowClick(i);
                }
              : undefined
          }
        >
          <DataRows variant={rowVariant} selected={isSelected} cells={cells} />
        </div>
      );
    });

  const pagination = showPagination ? (
    <Pagination
      variant="table"
      showPages={showPages}
      page={page}
      pageCount={pageCount}
      onPageChange={onPageChange ?? (() => {})}
      countLabel={countLabel}
      rowsPerPage={rowsPerPage}
      onRowsPerPageClick={onRowsPerPageClick}
      style={{ boxShadow: 'none', borderTop: DIVIDER, borderBottomLeftRadius: 0, borderBottomRightRadius: 0, flexShrink: 0 }}
    />
  ) : null;

  return (
    <div
      ref={(node) => {
        rootRef.current = node;
        if (typeof ref === 'function') ref(node);
        else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
      }}
      className={['leta-table', className].filter(Boolean).join(' ')}
      style={{
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        backgroundColor: 'var(--surface-neutral-bg-default)',
        border: 'var(--stroke-xs) solid var(--border-neutral-default)',
        borderRadius: 'var(--rounding-xl)',
        overflow: 'hidden',
        ...(fillHeight ? { flex: 1, minHeight: 0 } : null),
        ...style,
      }}
      {...rest}
    >
      {scrollActive ? (
        // Both-axis scroll viewport (§4.3): columns overflow horizontally, rows overflow
        // vertically, the header sticks to the top, and the pinned columns (Order ID left,
        // Actions right) are sticky relative to THIS scroller — a single scroller keeps
        // that pinning correct. Only the *vertical* scrollbar chrome is hidden
        // (`leta-table-scrollx`) so pinned pagination reads as the bottom boundary, while
        // a slim horizontal scrollbar stays visible as the overflow cue. No phantom bar:
        // horizontal only scrolls on real overflow.
        <div
          ref={scrollerRef}
          className="leta-table-scrollx"
          onScroll={updateScrollEdges}
          style={{
            flex: maxBodyHeight == null ? '1 1 auto' : undefined,
            maxHeight: maxBodyHeight,
            minHeight: 0,
            overflow: 'auto',
            overscrollBehavior: 'none',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', width: 'max-content', minWidth: '100%' }}>
            {headerRow}
            {bodyRows}
          </div>
        </div>
      ) : (
        <>
          {headerRow}
          <div
            // No scrollbar chrome on the default body scroller — scroll still works and
            // the pinned pagination reads as the boundary (the scrollbar was also eating
            // horizontal real estate in classic-scrollbar environments).
            className={fillHeight || maxBodyHeight != null ? 'leta-table-noscrollbar' : undefined}
            style={{
              display: 'flex',
              flexDirection: 'column',
              // `overflowX: hidden` is explicit so an `overflowY: auto` region can't be
              // promoted to `overflowX: auto` (the CSS visible→auto rule), which would
              // surface a phantom horizontal scrollbar when columns exceed the width.
              ...(fillHeight
                ? { flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', overscrollBehavior: 'none' }
                : maxBodyHeight != null
                  ? { maxHeight: maxBodyHeight, overflowY: 'auto', overflowX: 'hidden', overscrollBehavior: 'none' }
                  : null),
            }}
          >
            {bodyRows}
          </div>
        </>
      )}

      {pagination}
    </div>
  );
});

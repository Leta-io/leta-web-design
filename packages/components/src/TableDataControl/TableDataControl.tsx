import * as React from 'react';
import { SearchInput } from '../SearchInput/SearchInput.js';
import { Button } from '../Button/Button.js';
import { Badge } from '../Badge/Badge.js';
import { TopFilterSection, type TopFilterSectionItem } from '../TopFilterSection/TopFilterSection.js';
import { SelectionControl } from '../SelectionControl/SelectionControl.js';

/**
 * - `search-create` — search + filter buttons (Created / Filter / Sort By) on the
 *   left, primary CTAs (Add Order / Import-Export) on the right.
 * - `search-column` — the same search + filters, with a data count + an
 *   Auto-refresh switch + Columns control on the right.
 * - `filters-column` — a Top Filter Section on the left, data count +
 *   Auto-refresh switch + Columns on the right.
 */
export type TableDataControlVariant = 'search-create' | 'search-column' | 'filters-column';

export interface TableDataControlProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children'> {
  /** Which toolbar layout to render. Default `search-create`. */
  variant?: TableDataControlVariant;
  /** Data count shown in the column-control group (e.g. "10 Orders"). Default "10 Orders". */
  dataCount?: string;
  /** Show the data count (column-control variants). Default true. */
  showDataCount?: boolean;
  /**
   * Show the right-hand column-control group (data count + Columns button) on the
   * `search-column` / `filters-column` variants. Mirrors the Figma
   * `Show Column Control & Count` property. Default true; set `false` for a
   * search/filter-only toolbar (e.g. the Table Section's table).
   */
  showColumnControl?: boolean;

  /**
   * Number of active filter rules currently applied. When > 0, a Coral Red (Alt)
   * count badge is overlaid at the top-right corner of the Filter icon button.
   * Filter and Sort are always icon-only buttons in both base and active states.
   * Mirrors the Figma `search-create` / `search-column` variants and their
   * "Active Filter" counterparts (Figma nodes `10697:60514` / `10697:60683`).
   * Default 0 (no active filters).
   */
  filterCount?: number;

  /** Left section for the search variants — overrides the default search + filter buttons. */
  searchSection?: React.ReactNode;
  /** Left section for `filters-column` — overrides the default Top Filter Section. */
  filters?: React.ReactNode;
  /** Right section for `search-create` — overrides the default Add Order + Import/Export. */
  ctas?: React.ReactNode;
  /**
   * Show the Primary "Add Order" button in the default `search-create` CTAs.
   * Default true; set `false` for the Empty State toolbar, where the primary
   * Add Order CTA lives beside the illustration instead (per Figma
   * `4368:154614`). Ignored when `ctas` is overridden.
   */
  showAddOrder?: boolean;
  /** Right column-control content (search-column / filters-column) — overrides the default Columns button. */
  columnControl?: React.ReactNode;

  /** Search field placeholder. Default "Search here...". */
  searchPlaceholder?: string;
  /** Controlled search field value. Omit for an uncontrolled field. */
  searchValue?: string;
  /** Fired as the user types in the search field. */
  onSearchChange?: (value: string) => void;
  /** Fired when the search field's clear (×) button is clicked. */
  onSearchClear?: () => void;
  /** Label for the Created date-filter button. Default "Created: Today". */
  createdLabel?: string;
  // optional callbacks for the default controls
  onCreatedClick?: () => void;
  onFilterClick?: () => void;
  onSortClick?: () => void;
  onAddOrderClick?: () => void;
  onImportExportClick?: () => void;
  onColumnsClick?: () => void;
  /**
   * Controlled state of the **Auto-refresh** switch (column-control variants).
   * When on, orders auto-refresh into the table — replaces the old manual
   * Refresh button (Figma `7575:36637`). Omit for uncontrolled.
   */
  autoRefresh?: boolean;
  /** Fired with the next value when the Auto-refresh switch is toggled. */
  onAutoRefreshChange?: (checked: boolean) => void;
}

const GROUP: React.CSSProperties = { display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 'var(--spacing-8px)' };

/** Default search + filter buttons (left of the search-* variants). */
function SearchAndFilter({
  placeholder,
  filterCount = 0,
  createdLabel = 'Created: Today',
  onCreated,
  onFilter,
  onSort,
  searchValue,
  onSearchChange,
  onSearchClear,
}: {
  placeholder: string;
  filterCount?: number;
  createdLabel?: string;
  onCreated?: () => void;
  onFilter?: () => void;
  onSort?: () => void;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  onSearchClear?: () => void;
}) {
  return (
    <div style={GROUP}>
      <SearchInput
        placeholder={placeholder}
        value={searchValue}
        onChange={onSearchChange ? (e) => onSearchChange(e.target.value) : undefined}
        onClear={onSearchClear}
        style={{ width: 250 }}
      />
      <Button variant="secondary" size="medium" iconLeft="Calendar" onClick={onCreated}>{createdLabel}</Button>
      {/* Filter is always icon-only; badge appears when filterCount > 0 */}
      <div style={{ position: 'relative', display: 'inline-flex' }}>
        <Button
          variant="secondary"
          size="medium"
          iconOnly="Filter"
          aria-label={filterCount > 0 ? `${filterCount} active filter${filterCount !== 1 ? 's' : ''}. Click to manage.` : 'Filter'}
          onClick={onFilter}
        />
        {filterCount > 0 && (
          <Badge
            color="primary-alt"
            label={String(filterCount)}
            style={{ position: 'absolute', top: -5, right: -5, pointerEvents: 'none' }}
          />
        )}
      </div>
      {/* Sort is always icon-only */}
      <Button variant="secondary" size="medium" iconOnly="Sort" aria-label="Sort" onClick={onSort} />
    </div>
  );
}

/**
 * Default column-control group: data count + divider, then an **Auto-refresh**
 * Selection Control (switch), then the Columns button — per Figma `7575:36637`.
 * The old Refresh icon-only button was removed: when the Auto-refresh toggle is
 * ON, orders auto-refresh into the table, so a manual refresh is no longer
 * needed. Columns = Secondary outlined `Icon/Columns`. Figma layout: the Count
 * sub-frame (text + divider) has a 12px inner gap; the group flows at 8px.
 */
function ColumnControl({
  dataCount,
  showCount,
  onColumns,
  autoRefresh,
  onAutoRefreshChange,
}: {
  dataCount: string;
  showCount: boolean;
  onColumns?: () => void;
  autoRefresh?: boolean;
  onAutoRefreshChange?: (checked: boolean) => void;
}) {
  return (
    <div style={GROUP}>
      {showCount && (
        <div style={{ ...GROUP, gap: 'var(--spacing-12px)' }}>
          <span className="text-label-m-medium" style={{ color: 'var(--text-default-label)', whiteSpace: 'nowrap' }}>{dataCount}</span>
          <div aria-hidden style={{ width: 'var(--stroke-xs)', height: 24, backgroundColor: 'var(--border-neutral-default)' }} />
        </div>
      )}
      <SelectionControl
        variant="switch"
        label="Auto-refresh"
        checked={autoRefresh}
        onChange={onAutoRefreshChange}
      />
      <Button variant="secondary" size="medium" iconOnly="Columns" iconOutlined aria-label="Columns" onClick={onColumns} />
    </div>
  );
}

const DEFAULT_FILTERS: TopFilterSectionItem[] = [
  { label: 'Status', advanced: true, selected: true, badge: <Badge color="primary" label="Scheduled" /> },
  { label: 'Status', advanced: true },
  { label: 'Status', advanced: true },
  { label: 'Status', advanced: true },
  { label: 'Status', advanced: true },
];

/**
 * Table Data Control — the toolbar that sits above a data table to search,
 * filter, sort, and act on its rows. Three layouts (`variant`) cover the common
 * table headers: search + create, search + column control, and top-level filters
 * + column control. The left/right sections are slot props with Figma-faithful
 * defaults (reusing Search Input, Button, and Top Filter Section).
 *
 * **When to use:** as the controls row of a `Table Container`.
 * **When not to use:** acting on a multi-row selection (Bulk Actions Toolbar);
 * in-table pagination (the Table's Pagination footer).
 */
export const TableDataControl = React.forwardRef<HTMLDivElement, TableDataControlProps>(
  function TableDataControl(
    {
      variant = 'search-create',
      dataCount = '10 Orders',
      showDataCount = true,
      showColumnControl = true,
      filterCount = 0,
      searchSection,
      filters,
      ctas,
      showAddOrder = true,
      columnControl,
      searchPlaceholder = 'Search here...',
      searchValue,
      onSearchChange,
      onSearchClear,
      createdLabel,
      onCreatedClick,
      onFilterClick,
      onSortClick,
      onAddOrderClick,
      onImportExportClick,
      onColumnsClick,
      autoRefresh,
      onAutoRefreshChange,
      className,
      style,
      ...rest
    },
    ref,
  ) {
    const left =
      variant === 'filters-column'
        ? filters ?? <TopFilterSection filters={DEFAULT_FILTERS} />
        : searchSection ?? (
            <SearchAndFilter placeholder={searchPlaceholder} searchValue={searchValue} onSearchChange={onSearchChange} onSearchClear={onSearchClear} filterCount={filterCount} createdLabel={createdLabel} onCreated={onCreatedClick} onFilter={onFilterClick} onSort={onSortClick} />
          );

    const right =
      variant === 'search-create'
        ? ctas ?? (
            <div style={GROUP}>
              {showAddOrder && (
                <Button variant="primary" size="medium" iconLeft="Add" onClick={onAddOrderClick}>Add Order</Button>
              )}
              <Button variant="secondary" size="medium" iconRight="Chevron-Down" onClick={onImportExportClick}>Import/Export</Button>
            </div>
          )
        : !showColumnControl
          ? null
          : columnControl ?? <ColumnControl dataCount={dataCount} showCount={showDataCount} onColumns={onColumnsClick} autoRefresh={autoRefresh} onAutoRefreshChange={onAutoRefreshChange} />;

    return (
      <div
        ref={ref}
        className={['leta-table-data-control', className].filter(Boolean).join(' ')}
        style={{
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 'var(--spacing-16px)',
          width: '100%',
          minHeight: 40,
          ...style,
        }}
        {...rest}
      >
        {left}
        {right}
      </div>
    );
  },
);

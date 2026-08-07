import * as React from 'react';
import { type IconName } from '@leta-io/icons';
import { SearchField } from '../SearchInput/SearchField.js';
import { DesktopMenuOptions } from '../DesktopMenuOptions/DesktopMenuOptions.js';
import { Button } from '../Button/Button.js';
import { Chip } from '../Chip/Chip.js';
import { EmptyState } from '../EmptyState/EmptyState.js';

export type MapSearchState =
  | 'idle'
  | 'no-history'
  | 'active-history'
  | 'empty-results'
  | 'active-results';

export interface MapSearchInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /** Panel state. `idle` = field only; the rest attach a results panel. Default `active-results`. */
  state?: MapSearchState;
  /** Placeholder. Default "Search here...". */
  placeholder?: string;
  /** Leading icon. Default `Search`. */
  icon?: IconName;
  /** Notified when the clear (×) is clicked. Optional — the field clears itself. */
  onClear?: () => void;
  /** `active-history` header title. Default "Recent Searches". */
  recentTitle?: string;
  /** `active-history` "Clear All" handler. */
  onClearHistory?: () => void;
  /** Filter chip labels in the results Top Section. Default three "Filter"s. */
  filters?: string[];
  /** Index of the active filter chip. Default 0. */
  activeFilter?: number;
  /** Results count shown in the Top Section heading ("Results (N)"). Default 5. */
  resultsCount?: number;
  /** Empty-results copy below the no-results illustration. */
  noResultsText?: string;
  /** "No recent searches" copy. */
  noHistoryText?: string;
  /** Menu-options list — defaults to a `<Placeholder>` standing in for Desktop Menu Options `1531:5056`. */
  children?: React.ReactNode;
  disabled?: boolean;
}

const PANEL_PAD = 'var(--padding-16px)';
/** Figma: the Empty/Active Results dropdown panel is a fixed 400px (whole card → 440px). */
const RESULTS_PANEL_HEIGHT = 400;

/** 1px full-width divider between result rows (Figma `Divider`, strokeWeight 1). */
const ResultsDivider = () => (
  <div aria-hidden style={{ height: 0, borderTop: 'var(--stroke-xs) solid var(--border-neutral-default)' }} />
);

/**
 * Web-map search — the `Search Input` type of Data Entry `38:42` (Web Map variant):
 * a 480px `--surface-neutral-alt-search-field` field with an attached results dropdown.
 * The `state` prop drives the panel (Figma states):
 * - `idle` — field only.
 * - `no-history` — "No recent searches" helper.
 * - `active-history` — "Recent Searches" header + Clear All + a recent-search list.
 * - `empty-results` — filter chips + "Results (0)" + a no-results `<EmptyState>`.
 * - `active-results` — filter chips + "Results (N)" + a results list.
 * The list slots default to `DesktopMenuOptions` rows; pass your own via `children`.
 *
 * The field shows a trailing clear (×) — always while the panel is open, and as soon
 * as the closed (idle) field has text. Clicking it clears the field and fires `onClear`.
 */
export const MapSearchInput = React.forwardRef<HTMLInputElement, MapSearchInputProps>(function MapSearchInput(
  {
    state = 'active-results',
    placeholder = 'Search here...',
    icon = 'Search',
    onClear,
    recentTitle = 'Recent Searches',
    onClearHistory,
    filters = ['Filter', 'Filter', 'Filter'],
    activeFilter = 0,
    resultsCount = 5,
    noResultsText,
    noHistoryText = 'No recent searches',
    children,
    disabled = false,
    value,
    defaultValue,
    onChange,
    className,
    style,
    ...inputProps
  },
  ref,
) {
  const open = state !== 'idle';

  const field = (
    <SearchField
      ref={ref}
      surfaceVar="var(--surface-neutral-alt-search-field)"
      radiusVar={open ? '0' : 'var(--rounding-lg)'}
      noBorder={open}
      icon={icon}
      placeholder={placeholder}
      onClear={onClear}
      showClear={open}
      disabled={disabled}
      value={value}
      defaultValue={defaultValue}
      onChange={onChange}
      style={open ? { borderBottom: 'var(--stroke-xs) solid var(--border-neutral-default)' } : undefined}
      {...inputProps}
    />
  );

  if (!open) {
    return (
      <div
        className={className}
        style={{ width: 480, boxSizing: 'border-box', borderRadius: 'var(--rounding-lg)', boxShadow: 'var(--shadow-neutral-2)', ...style }}
      >
        {field}
      </div>
    );
  }

  const topSection = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-20px)', padding: `${PANEL_PAD} ${PANEL_PAD} 0 ${PANEL_PAD}` }}>
      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 'var(--spacing-8px)', flexWrap: 'wrap' }}>
        {filters.map((f, i) => (
          <Chip key={i} label={f} active={i === activeFilter} />
        ))}
      </div>
      <span className="text-heading-s-semibold" style={{ color: 'var(--text-default-heading)' }}>
        Results ({resultsCount})
      </span>
    </div>
  );

  let panel: React.ReactNode;
  if (state === 'no-history') {
    panel = (
      <div style={{ padding: PANEL_PAD }}>
        <span className="text-label-m-regular" style={{ color: 'var(--text-default-helper)' }}>{noHistoryText}</span>
      </div>
    );
  } else if (state === 'active-history') {
    panel = (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-20px)', padding: PANEL_PAD }}>
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--spacing-8px)' }}>
          <span className="text-heading-s-semibold" style={{ color: 'var(--text-default-heading)' }}>{recentTitle}</span>
          <Button variant="plain" size="small" onClick={onClearHistory}>Clear All</Button>
        </div>
        {children ?? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4px)' }}>
            {['LTA-ID-001', 'LTA-ID-002', 'Michael', 'Kitisuru'].map((l) => (
              <DesktopMenuOptions key={l} type="dropdown-basic" label={l} showChevron={false} />
            ))}
          </div>
        )}
      </div>
    );
  } else if (state === 'empty-results') {
    // Figma: the Results panel is a fixed 400px region (card → 440); the no-results
    // illustration is centred in the space below the Top Section.
    panel = (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-20px)', height: RESULTS_PANEL_HEIGHT, boxSizing: 'border-box' }}>
        {topSection}
        <div style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: PANEL_PAD }}>
          <EmptyState type="no-results" size="mobile" description={noResultsText} />
        </div>
      </div>
    );
  } else {
    // active-results — same fixed 400px region; the list fills it and scrolls.
    // Figma: the Results list pads [0,10,40,10] with rows split by 1px Dividers.
    const rows = ['1', '2', '3', '4'];
    panel = (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-20px)', height: RESULTS_PANEL_HEIGHT, boxSizing: 'border-box' }}>
        {topSection}
        <div style={{ flex: 1, minHeight: 0, overflow: 'auto', overscrollBehavior: 'contain', padding: `0 var(--padding-10px) var(--padding-40px) var(--padding-10px)` }}>
          {children ?? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-8px)' }}>
              {rows.map((id, i) => (
                <React.Fragment key={id}>
                  <DesktopMenuOptions type="dropdown-advanced" label="Title" subtext="Enter description here" />
                  {i < rows.length - 1 && <ResultsDivider />}
                </React.Fragment>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={className}
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: 480,
        boxSizing: 'border-box',
        borderRadius: 'var(--rounding-xl)',
        overflow: 'hidden',
        border: `var(--stroke-xs) solid var(--border-neutral-default)`,
        backgroundColor: 'var(--surface-neutral-bg-default)',
        boxShadow: 'var(--shadow-neutral-2)',
        ...style,
      }}
    >
      {field}
      {panel}
    </div>
  );
});

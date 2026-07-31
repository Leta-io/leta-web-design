import * as React from 'react';
import { type IconName } from '@leta/icons';
import { DesktopMenuOptions } from '../DesktopMenuOptions/DesktopMenuOptions.js';
import { Button } from '../Button/Button.js';
import { SearchInput } from '../SearchInput/SearchInput.js';
import { EmptyState } from '../EmptyState/EmptyState.js';
import { NotificationBanner } from '../NotificationBanner/NotificationBanner.js';
import { Avatar, type AvatarTone } from '../Avatar/Avatar.js';
import { FooterFrame } from '../FooterFrame/FooterFrame.js';

/**
 * Which ready-made dropdown panel to render:
 *
 * - `combobox` — a scrollable single-select list (no pagination footer; Figma `8230:26475` — 350×248).
 * - `combobox-empty` — the plain combobox with no options at all: the whole card body is a
 *   centered text-only Empty State ("No Matching Results" / "Try adjusting your search."),
 *   no search box and no pagination footer (Figma `8230:26475` — 350×248, same card height
 *   as `combobox`).
 * - `combobox-search` — the same list with a search box on top (no pagination footer; 350×304).
 * - `combobox-search-empty` — the search state shown when nothing matches. Its results
 *   region is the **same height as `combobox-search`** (Figma `8230:26475` — both variants
 *   are 304px tall) so the panel does not resize between states; the "No Matching Results" /
 *   "Try adjusting your search." message is centered in that region.
 * - `combobox-create` — a list plus an 'Add "…"' action to create a new entry.
 * - `combobox-create-empty` — the create state when nothing matches, with a hint.
 * - `actions` — a context / "⋯" menu of commands, ending in a red destructive action.
 * - `user-menu` — the account menu: avatar, name and email, then grouped links ending in Logout.
 * - `sort` — pick a field to sort by (radio) and a direction (ascending / descending).
 * - `basic-filter` — one checklist of filters; footer shows the result count + Close / Show Results.
 * - `filter-group` — a two-pane filter: groups on the left, their searchable options on the
 *   right. The active group shows how many options are ticked; the footer shows the live
 *   result count with Reset / Show Results.
 * - `filter-group-empty` — the same when the search finds no options.
 * - `timepicker` — a scrollable list of times.
 * - `stacked-list` — a list of richer two-line rows (title + description) for results / entities.
 */
export type DesktopDropdownVariant =
  | 'combobox'
  | 'combobox-empty'
  | 'combobox-search'
  | 'combobox-search-empty'
  | 'combobox-create'
  | 'combobox-create-empty'
  | 'actions'
  | 'user-menu'
  | 'sort'
  | 'basic-filter'
  | 'basic-filter-search'
  | 'basic-filter-search-empty'
  | 'filter-group'
  | 'filter-group-empty'
  | 'timepicker'
  | 'stacked-list';

/** One rail dimension of a `filter-group` panel — its label plus the full option list shown when it's active. */
export interface FilterGroupDimension {
  /** Rail label, e.g. "Recipient", "Depot", "Driver", "Created By". */
  label: string;
  /** Full option list for this dimension (checkbox rows on the right when it's the active rail selection). */
  options: string[];
}

export interface DesktopDropdownsProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children'> {
  /** Which assembled dropdown panel to render (Figma `8230:26475`). Default `combobox`. */
  variant?: DesktopDropdownVariant;
  /** Row labels for the main list (combobox / timepicker / basic-filter / filter list / actions). */
  options?: string[];
  /** Initially-selected option index (combobox / timepicker). */
  activeIndex?: number;
  /**
   * Dimension definitions for `filter-group`/`filter-group-empty` — rail label +
   * its full option list. Falls back to a 3-dimension demo set when omitted.
   */
  groups?: FilterGroupDimension[];
  /**
   * Pre-checked option values per group, index-aligned with `groups` — restores
   * a previously-applied filter when the panel is reopened (the panel itself
   * remounts fresh each time it opens, so this is the host's hook to persist
   * selections across opens).
   */
  initialGroupSelections?: string[][];
  /**
   * Fires with the full current per-group selection (index-aligned with
   * `groups`) whenever any checkbox toggles. These are a live/draft preview —
   * per Doc 3 §9, nothing is applied to the host's data until `onApply` fires;
   * use this to recompute and pass back a live `resultsText` preview count.
   */
  onGroupSelectionChange?: (selected: string[][]) => void;
  /** "Show Results" clicked (`filter-group`) — the host should commit the last selection reported via `onGroupSelectionChange` and typically close the panel. */
  onApply?: () => void;
  /** "Reset" clicked (`filter-group`) — clears every dimension's selection (both here and on the host's applied filter). */
  onReset?: () => void;
  /** Disable "Show Results" (`filter-group`) — e.g. the host's live preview count is 0. */
  showResultsDisabled?: boolean;
  /**
   * Footer summary for the filter panels (basic-filter / filter-group). This is
   * the host table's current matching-row count — a placeholder the consuming
   * screen recomputes as filters narrow (Figma shows "30 results"). The leading
   * number is emphasized automatically.
   */
  resultsText?: string;
  /** Combobox-Create "Add" footer label. */
  createLabel?: string;
  /**
   * Override the empty-state message for the `combobox-empty` / `combobox-search-empty`
   * variants (e.g. "No depots found"). Defaults to the `no-results` preset copy
   * ("Try adjusting your search.").
   */
  emptyDescription?: string;
  /** User Menu display name. */
  userName?: string;
  /** User Menu email shown under the name. */
  userEmail?: string;
  /** User Menu avatar monogram tone (used when there is no uploaded photo). Default `teal`. */
  userTone?: AvatarTone;
  /** User Menu avatar photo URL. When set, shown in place of the monogram. */
  userAvatarSrc?: string;
  /**
   * Sort fields + per-field direction labels (Figma `1050:209224`). The selected
   * field's `ascLabel`/`descLabel` drive the two direction rows — e.g. a date field
   * reads "Oldest to Newest / Newest to Oldest" while a numeric field reads
   * "Low to High / High to Low". Defaults to Created / Duration / Last Updated.
   */
  sortOptions?: Array<{ label: string; ascLabel?: string; descLabel?: string }>;
  /** Fired when the sort field or direction changes (`sort` variant). */
  onSortChange?: (sel: { index: number; label: string; direction: 'asc' | 'desc' }) => void;
  /** Fired with the new selected-count whenever the filter selection changes (host updates `resultsText`). */
  onSelectionChange?: (count: number) => void;
  /** Override the panel body entirely. */
  children?: React.ReactNode;
}

const WIDTH: Record<DesktopDropdownVariant, number> = {
  combobox: 350,
  'combobox-empty': 350,
  'combobox-search': 350,
  'combobox-search-empty': 350,
  'combobox-create': 350,
  'combobox-create-empty': 350,
  actions: 250,
  'user-menu': 250,
  sort: 250,
  'basic-filter': 350,
  'basic-filter-search': 350,
  'basic-filter-search-empty': 350,
  'filter-group': 480,
  'filter-group-empty': 480,
  timepicker: 250,
  'stacked-list': 480,
};

const DEFAULT_OPTIONS = Array.from({ length: 18 }, () => 'Insert Text');
const DEFAULT_FILTER_OPTIONS = Array.from({ length: 12 }, () => 'Label');
/** Storybook/demo default for `filter-group` when the host doesn't supply real `groups`. */
const DEFAULT_FILTER_GROUPS: FilterGroupDimension[] = [
  { label: 'Recipient', options: Array.from({ length: 8 }, (_, i) => `Recipient ${i + 1}`) },
  { label: 'Driver', options: Array.from({ length: 6 }, (_, i) => `Driver ${i + 1}`) },
  { label: 'Depot', options: Array.from({ length: 4 }, (_, i) => `Depot ${i + 1}`) },
];
/**
 * The no-match sub-copy names the real dimension (Doc 3 §9: "All {dimension}s
 * will be displayed here" — never a placeholder). Most labels pluralize by
 * appending "s"; a couple of compound labels read better as a fixed phrase.
 */
const DIMENSION_PLURALS: Record<string, string> = { 'Created By': 'creators' };
function pluralizeDimension(label: string): string {
  return DIMENSION_PLURALS[label] ?? `${label.toLowerCase()}s`;
}
const TIMES = [
  '12:00 AM', '12:30 AM', '1:00 AM', '1:30 AM', '2:00 AM', '2:30 AM', '3:00 AM', '3:30 AM',
  '4:00 AM', '4:30 AM', '5:00 AM', '5:30 AM', '6:00 AM', '6:30 AM', '7:00 AM', '7:30 AM',
  '8:00 AM', '8:30 AM', '9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
];

/** Figma `1050:209224` Sort fields, with date vs. numeric direction labels. */
const DEFAULT_SORT_OPTIONS = [
  { label: 'Created', ascLabel: 'Oldest to Newest', descLabel: 'Newest to Oldest' },
  { label: 'Duration', ascLabel: 'Low to High', descLabel: 'High to Low' },
  { label: 'Last Updated', ascLabel: 'Oldest to Newest', descLabel: 'Newest to Oldest' },
];

const USER_MENU_GROUPS: { label: string; icon: IconName; chevron?: boolean }[][] = [
  [
    { label: 'Personal Information', icon: 'Account' },
    { label: 'Account Settings', icon: 'Settings' },
    { label: 'Change Theme', icon: 'Palette', chevron: true },
  ],
  [
    { label: 'Invite User', icon: 'User-Add' },
    { label: 'Contact Support', icon: 'Support' },
  ],
  [{ label: 'Logout', icon: 'Logout' }],
];

// ─── Layout primitives ───────────────────────────────────────────
const col4: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4px)' };

function List({ children }: { children: React.ReactNode }) {
  return <div style={{ ...col4, padding: 'var(--padding-8px)' }}>{children}</div>;
}
/**
 * Fixed-height scroll viewport so long lists actually scroll. Bottom padding
 * matches the other three sides by default (the list is the last element in
 * the card); pass `flushBottom` only when a bordered footer follows immediately
 * (its own top padding/border provides the separation — a second 8px here would
 * double the gap).
 */
function ScrollList({ height, flushBottom, children }: { height: number; flushBottom?: boolean; children: React.ReactNode }) {
  return (
    <div style={{ ...col4, padding: `var(--padding-8px) var(--padding-8px) ${flushBottom ? '0px' : 'var(--padding-8px)'}`, maxHeight: height, overflowY: 'auto', overscrollBehavior: 'contain' }}>
      {children}
    </div>
  );
}
function Divider() {
  return <div style={{ height: 'var(--stroke-xs)', backgroundColor: 'var(--border-neutral-default)', width: '100%', flexShrink: 0 }} />;
}
/** "30 results" with the leading number emphasized. */
function ResultsLabel({ text }: { text: string }) {
  const m = text.match(/^(\d[\d,]*)(.*)$/);
  return (
    <span className="text-body-l-regular" style={{ color: 'var(--text-default-body)', whiteSpace: 'nowrap' }}>
      {m ? (<><span className="text-body-l-semibold">{m[1]}</span>{m[2]}</>) : text}
    </span>
  );
}
/** Filter footer: result count (left) + Secondary / Primary CTAs (right). */
/**
 * Filter panel footer — now the real `FooterFrame` instance (Figma `8230:26475`
 * Basic Filter / Filter Group footers compose Footer Frame for scalability):
 * - Basic Filter → Footer Frame **Default** (Reset + Show Results, no leading).
 * - Filter Group → Footer Frame **Data Summary** (leading "{n} results" + the buttons).
 */
function FilterFooter({
  resultsText,
  showLeading,
  secondaryLabel,
  secondaryDisabled,
  primaryDisabled,
  onSecondaryClick,
  onPrimaryClick,
}: {
  resultsText: string;
  /** Show the Data Summary leading count (Filter Group). Default false (Basic Filter). */
  showLeading?: boolean;
  secondaryLabel: string;
  secondaryDisabled?: boolean;
  /** Disable the primary "Show Results" CTA (Basic Filter empty search — nothing to show). */
  primaryDisabled?: boolean;
  onSecondaryClick?: () => void;
  onPrimaryClick?: () => void;
}) {
  return (
    <FooterFrame
      variant={showLeading ? 'data-summary' : 'default'}
      leading={showLeading ? <ResultsLabel text={resultsText} /> : undefined}
      scrollShadow
      style={{ flexShrink: 0 }}
    >
      <Button variant="secondary" size="medium" disabled={secondaryDisabled} onClick={onSecondaryClick}>{secondaryLabel}</Button>
      <Button variant="primary" size="medium" disabled={primaryDisabled} onClick={onPrimaryClick}>Show Results</Button>
    </FooterFrame>
  );
}
/**
 * Desktop Dropdowns — a ready-made floating panel that appears when you open a
 * menu, select, filter, or picker. It's the white rounded card with a soft shadow
 * that holds a list of **Desktop Menu Options** rows plus whatever extra pieces the
 * chosen `variant` needs: a search box, a pagination footer, an empty-state message,
 * an account header, or footer buttons. Position it directly under the control that
 * opens it.
 *
 * The selection-bearing variants manage their own state so the panel behaves like
 * the real thing: ticking rows updates the Filter Group "{n} selected" chip,
 * clicking a combobox / time / sort row moves the active checkmark, and long lists
 * scroll. Pass `options` for the row labels and `onSelectionChange` to mirror the
 * footer result count from your data.
 *
 * **Height & scroll model (Figma `8230:26475`).** The scrollable results region
 * **hugs its content** by default, growing row-by-row until it reaches the variant's
 * own **max height** — then the height locks and the list **scrolls** (the rest sits
 * below the fold). Per-variant scroll-region maxes: Combobox / Combobox-Create /
 * Combobox-Search = **240**; Basic Filter = **256**; Basic Filter-Search = **200**
 * (the search row eats 56 of the 256). This same hug→max→scroll rule governs the
 * bulk-toolbar "N selected" combobox. **Exception — the search-empty variants**
 * (`combobox-search-empty`, `basic-filter-search-empty`) do **not** hug: they render
 * at the **full max height** with the "No Matching Results / Try adjusting your
 * search." message centered, so the panel does not shrink when a query returns
 * nothing. **Create-empty** (`combobox-create-empty`) is NOT a search-empty state —
 * it **hugs** its short content (hint banner + "Add …").
 *
 * **When to use:** for any overlay that lets the user pick or filter something.
 * **When not to use:** for full pages or confirmation dialogs (use a Modal), or for
 * content shown inline on the page.
 */
export const DesktopDropdowns = React.forwardRef<HTMLDivElement, DesktopDropdownsProps>(function DesktopDropdowns(
  {
    variant = 'combobox',
    options,
    activeIndex = 0,
    resultsText = '30 results',
    createLabel = 'Add “Input”',
    emptyDescription,
    userName = 'Ify Kiplimo',
    userEmail = 'ifykiplimo@gmail.com',
    userTone = 'teal',
    userAvatarSrc,
    sortOptions = DEFAULT_SORT_OPTIONS,
    onSortChange,
    onSelectionChange,
    groups,
    initialGroupSelections,
    onGroupSelectionChange,
    onApply,
    onReset,
    showResultsDisabled,
    children,
    style,
    ...rest
  },
  ref,
) {
  const opts = options ?? DEFAULT_OPTIONS;
  const filterOpts = options ?? DEFAULT_FILTER_OPTIONS;
  const dims = groups ?? DEFAULT_FILTER_GROUPS;
  // The two-pane filter panels are a fixed height (Figma 480×360) so their inner
  // panes can flex and the right-hand list scrolls beneath a pinned footer.
  const fixedHeight =
    variant === 'filter-group' || variant === 'filter-group-empty'
      ? 360
      : variant === 'basic-filter' || variant === 'basic-filter-search' || variant === 'basic-filter-search-empty'
        ? 328
        : undefined;

  // Interactive state (hooks declared unconditionally; used per variant).
  const [active, setActive] = React.useState(activeIndex);
  const [checked, setChecked] = React.useState<Set<number>>(() => new Set());
  const [sortField, setSortField] = React.useState(0);

  // filter-group: which rail dimension is showing on the right, its own
  // in-panel search, and per-dimension checked VALUES (index-aligned with `dims`).
  const [activeGroup, setActiveGroup] = React.useState(0);
  const [groupSearch, setGroupSearch] = React.useState(variant === 'filter-group-empty' ? 'Xyzzy' : '');
  const [groupChecked, setGroupChecked] = React.useState<string[][]>(
    () => dims.map((_, i) => initialGroupSelections?.[i] ?? []),
  );
  // Compute-then-set (not the `setGroupChecked(prev => ...)` functional-updater
  // form) deliberately: `onGroupSelectionChange` calls back into the HOST's own
  // setState (e.g. OrdersPage's draft-filter state). Calling a different
  // component's setState from inside a state updater function is invalid — React
  // may invoke updater functions outside a committed render — so the state
  // update and the host notification must be two plain statements in the event
  // handler, not one nested inside the other.
  const toggleGroupChecked = (groupIdx: number, value: string) => {
    const next = groupChecked.map((arr, i) => (i === groupIdx ? (arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value]) : arr));
    setGroupChecked(next);
    onGroupSelectionChange?.(next);
  };
  const clearGroupChecked = (groupIdx: number) => {
    const next = groupChecked.map((arr, i) => (i === groupIdx ? [] : arr));
    setGroupChecked(next);
    onGroupSelectionChange?.(next);
  };
  const clearAllGroups = () => {
    const next = groupChecked.map(() => []);
    setGroupChecked(next);
    onGroupSelectionChange?.(next);
    onReset?.();
  };
  const [sortDir, setSortDir] = React.useState(1);

  const toggleChecked = (i: number) => {
    const next = new Set(checked);
    if (next.has(i)) next.delete(i); else next.add(i);
    setChecked(next);
    onSelectionChange?.(next.size);
  };
  const clearChecked = () => {
    setChecked(new Set());
    onSelectionChange?.(0);
  };

  let body: React.ReactNode;
  if (children) {
    body = children;
  } else {
    switch (variant) {
      case 'combobox':
        body = (
          <ScrollList height={240}>
            {opts.map((l, i) => (
              <DesktopMenuOptions key={i} type="combobox" label={l} active={i === active} onSelect={() => setActive(i)} />
            ))}
          </ScrollList>
        );
        break;

      case 'combobox-empty':
        // No options at all: the whole 248-tall card is the centered text-only
        // Empty State — no search box, no pagination footer (Figma `10845:11406`).
        body = (
          <div style={{ height: 248, boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--padding-8px)' }}>
            <EmptyState type="no-results" size="desktop" showIcon={false} description={emptyDescription} />
          </div>
        );
        break;

      case 'combobox-search':
        body = (
          <>
            <div style={{ padding: 'var(--padding-8px)', borderBottom: 'var(--stroke-xs) solid var(--border-neutral-default)' }}>
              <SearchInput placeholder="Search here..." style={{ width: '100%' }} />
            </div>
            <ScrollList height={240}>
              {opts.map((l, i) => (
                <DesktopMenuOptions key={i} type="combobox" label={l} active={i === active} onSelect={() => setActive(i)} />
              ))}
            </ScrollList>
          </>
        );
        break;

      case 'combobox-search-empty':
        body = (
          <>
            <div style={{ padding: 'var(--padding-8px)', borderBottom: 'var(--stroke-xs) solid var(--border-neutral-default)' }}>
              <SearchInput defaultValue="Xyzzy" onClear={() => {}} style={{ width: '100%' }} />
            </div>
            <div style={{ height: 248, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--padding-16px)' }}>
              <EmptyState type="no-results" size="desktop" showIcon={false} description={emptyDescription} />
            </div>
          </>
        );
        break;

      case 'combobox-create':
        body = (
          <>
            <ScrollList height={240} flushBottom>
              {opts.map((l, i) => (
                <DesktopMenuOptions key={i} type="combobox" label={l} active={i === active} onSelect={() => setActive(i)} />
              ))}
            </ScrollList>
            <div style={{ padding: 'var(--padding-8px)', borderTop: 'var(--stroke-xs) solid var(--border-neutral-default)', flexShrink: 0 }}>
              <Button variant="ghost" size="medium" iconLeft="Add" style={{ width: '100%', justifyContent: 'flex-start' }}>{createLabel}</Button>
            </div>
          </>
        );
        break;

      case 'combobox-create-empty':
        body = (
          <>
            <div style={{ padding: 'var(--padding-16px)' }}>
              <NotificationBanner type="info" variant="subtle" description="Can’t find a match? Try adding it instead." />
            </div>
            <div style={{ padding: 'var(--padding-8px)', borderTop: 'var(--stroke-xs) solid var(--border-neutral-default)', flexShrink: 0 }}>
              <Button variant="ghost" size="medium" iconLeft="Add" style={{ width: '100%', justifyContent: 'flex-start' }}>{createLabel}</Button>
            </div>
          </>
        );
        break;

      case 'actions':
        body = (
          <>
            <List>
              {opts.map((l, i) => (
                <DesktopMenuOptions key={i} type="dropdown-basic" label={l} showLeadingIcon showChevron={false} />
              ))}
            </List>
            <Divider />
            <div style={{ padding: 'var(--padding-8px)' }}>
              <DesktopMenuOptions type="dropdown-destructive" label="Delete" showLeadingIcon leadingIcon="Delete" />
            </div>
          </>
        );
        break;

      case 'user-menu':
        body = (
          <>
            <div style={{ padding: 'var(--padding-8px)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-8px)', padding: 'var(--padding-10px)' }}>
                <Avatar name={userName} src={userAvatarSrc} size="small" tone={userTone} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4px)', minWidth: 0 }}>
                  <span className="text-label-l-semibold" style={{ color: 'var(--text-default-heading)', whiteSpace: 'nowrap' }}>{userName}</span>
                  <span className="text-label-s-regular" style={{ color: 'var(--text-default-sub-body)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{userEmail}</span>
                </div>
              </div>
            </div>
            {USER_MENU_GROUPS.map((group, gi) => (
              <React.Fragment key={gi}>
                <Divider />
                <List>
                  {group.map((item) => (
                    <DesktopMenuOptions
                      key={item.label}
                      type="dropdown-basic"
                      label={item.label}
                      showLeadingIcon
                      leadingIcon={item.icon}
                      showChevron={item.chevron ?? false}
                    />
                  ))}
                </List>
              </React.Fragment>
            ))}
          </>
        );
        break;

      case 'sort': {
        const sel = sortOptions[Math.min(sortField, sortOptions.length - 1)] ?? sortOptions[0];
        const ascLabel = sel?.ascLabel ?? 'Ascending';
        const descLabel = sel?.descLabel ?? 'Descending';
        const pickField = (i: number) => {
          setSortField(i);
          onSortChange?.({ index: i, label: sortOptions[i]?.label ?? '', direction: sortDir === 0 ? 'asc' : 'desc' });
        };
        const pickDir = (d: 0 | 1) => {
          setSortDir(d);
          onSortChange?.({ index: sortField, label: sel?.label ?? '', direction: d === 0 ? 'asc' : 'desc' });
        };
        body = (
          <>
            <List>
              {sortOptions.map((o, i) => (
                <DesktopMenuOptions key={`${o.label}-${i}`} type="radio-selection" label={o.label} selected={i === sortField} onSelect={() => pickField(i)} />
              ))}
            </List>
            <Divider />
            <List>
              <DesktopMenuOptions type="combobox" label={ascLabel} showLeadingIcon leadingIcon="Up-Arrow" active={sortDir === 0} onSelect={() => pickDir(0)} />
              <DesktopMenuOptions type="combobox" label={descLabel} showLeadingIcon leadingIcon="Down-Arrow" active={sortDir === 1} onSelect={() => pickDir(1)} />
            </List>
          </>
        );
        break;
      }

      case 'basic-filter':
      case 'basic-filter-search':
      case 'basic-filter-search-empty': {
        const search = variant !== 'basic-filter';
        const searchEmpty = variant === 'basic-filter-search-empty';
        body = (
          <>
            {search && (
              // Figma "Search" frame: pad 8 + a 1px bottom outline separating it from the list.
              <div style={{ padding: 'var(--padding-8px)', borderBottom: 'var(--stroke-xs) solid var(--border-neutral-default)', flexShrink: 0 }}>
                <SearchInput {...(searchEmpty ? { defaultValue: 'Xyzzy', onClear: () => {} } : { placeholder: 'Search here...' })} style={{ width: '100%' }} />
              </div>
            )}
            {searchEmpty ? (
              <div style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--padding-8px)' }}>
                <EmptyState type="no-results" size="desktop" showIcon={false} style={{ maxWidth: '100%' }} />
              </div>
            ) : (
              // Flex-fill the fixed 328 card (Figma): list scrolls under the footer.
              <div style={{ ...col4, flex: 1, minHeight: 0, padding: 'var(--padding-8px)', overflowY: 'auto', overscrollBehavior: 'contain' }}>
                {filterOpts.map((l, i) => (
                  <DesktopMenuOptions key={i} type="checkbox-selection" label={l} selected={checked.has(i)} onSelect={() => toggleChecked(i)} />
                ))}
              </div>
            )}
            {/* Footer Frame Default — Reset + Show Results, no leading count (Figma).
                Empty search → nothing to show, so "Show Results" is disabled (Figma
                `8230:26475` Basic Filter-Search (Empty) — the primary CTA is greyed). */}
            <FilterFooter resultsText={resultsText} secondaryLabel="Reset" primaryDisabled={searchEmpty} />
          </>
        );
        break;
      }

      case 'filter-group':
      case 'filter-group-empty': {
        // Real per-dimension search: filter the ACTIVE dimension's options by
        // `groupSearch` (case-insensitive substring). `filter-group-empty` just
        // seeds a query ("Xyzzy") that matches nothing, for a deterministic
        // Storybook demo of the same reactive path everything else uses.
        const activeDim = dims[activeGroup];
        const q = groupSearch.trim().toLowerCase();
        const visibleOptions = activeDim ? activeDim.options.filter((o) => o.toLowerCase().includes(q)) : [];
        const noMatch = visibleOptions.length === 0;
        body = (
          <>
            <div style={{ display: 'flex', flexDirection: 'row', flex: 1, minHeight: 0, justifyContent: 'space-between' }}>
              {/* Left: one rail row per dimension; the active one shows the "{n} selected" chip. */}
              <div style={{ width: 196, flexShrink: 0, boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-12px)', padding: '16px 16px 0 16px', borderRight: 'var(--stroke-xs) solid var(--border-neutral-default)', overflowY: 'auto', overscrollBehavior: 'contain' }}>
                {dims.map((d, i) => (
                  <DesktopMenuOptions
                    key={d.label}
                    type="filter-group"
                    label={d.label}
                    active={i === activeGroup}
                    selected={(groupChecked[i]?.length ?? 0) > 0}
                    selectedCount={groupChecked[i]?.length ?? 0}
                    onSelect={() => { setActiveGroup(i); setGroupSearch(''); }}
                    onDeselectAll={() => clearGroupChecked(i)}
                  />
                ))}
              </div>
              {/* Right: search + scrollable checkbox list (or the no-match empty state) for the active dimension. */}
              <div style={{ flex: 1, minWidth: 0, minHeight: 0, boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-12px)', padding: '16px 16px 0 16px' }}>
                <SearchInput placeholder="Search here..." value={groupSearch} onChange={(e) => setGroupSearch(e.target.value)} onClear={() => setGroupSearch('')} style={{ width: '100%' }} />
                {noMatch ? (
                  <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <EmptyState
                      type="no-results"
                      size="desktop"
                      showIcon={false}
                      description={activeDim ? `All ${pluralizeDimension(activeDim.label)} will be displayed here.` : undefined}
                      style={{ maxWidth: '100%' }}
                    />
                  </div>
                ) : (
                  <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', overscrollBehavior: 'contain', ...col4 }}>
                    {visibleOptions.map((l) => (
                      <DesktopMenuOptions key={l} type="checkbox-selection" label={l} selected={groupChecked[activeGroup]?.includes(l) ?? false} onSelect={() => toggleGroupChecked(activeGroup, l)} />
                    ))}
                  </div>
                )}
              </div>
            </div>
            <FilterFooter
              resultsText={resultsText}
              showLeading
              secondaryLabel="Reset"
              onSecondaryClick={clearAllGroups}
              onPrimaryClick={onApply}
              primaryDisabled={noMatch || showResultsDisabled}
            />
          </>
        );
        break;
      }

      case 'timepicker':
        body = (
          <ScrollList height={232}>
            {TIMES.map((t, i) => (
              <DesktopMenuOptions key={t} type="combobox" label={t} active={i === active} onSelect={() => setActive(i)} />
            ))}
          </ScrollList>
        );
        break;

      case 'stacked-list':
        // Figma: container pad 8 + gap 8; rows and full-width dividers are siblings
        // (the divider spans the same inner width as the rows, not edge-to-edge).
        body = (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-8px)', padding: 'var(--padding-8px)' }}>
            {(options ?? ['a', 'b', 'c', 'd']).map((_, i, arr) => (
              <React.Fragment key={i}>
                <DesktopMenuOptions type="dropdown-advanced" label="Title" subtext="Enter description here" />
                {i < arr.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </div>
        );
        break;
    }
  }

  return (
    <div
      ref={ref}
      style={{
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
        width: WIDTH[variant],
        height: fixedHeight,
        borderRadius: 'var(--rounding-xl)',
        overflow: 'hidden',
        border: 'var(--stroke-xs) solid var(--border-neutral-default)',
        backgroundColor: 'var(--surface-neutral-bg-default)',
        boxShadow: 'var(--shadow-neutral-3)',
        ...style,
      }}
      {...rest}
    >
      {body}
    </div>
  );
});

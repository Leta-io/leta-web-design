import * as React from 'react';
import { Icon, type IconName } from '@leta-io/icons';
import { SelectionControl } from '../SelectionControl/SelectionControl.js';
import { Chip } from '../Chip/Chip.js';
import { Shortcut } from '../Shortcut/Shortcut.js';

/**
 * The `Type` of menu row to render. Each value is one kind of item you'd find
 * inside a desktop menu, dropdown, sidebar, calendar, or pager:
 *
 * - `combobox` — a selectable option in a single-select list. The chosen option
 *   gets a light highlight and a trailing checkmark.
 * - `dropdown-basic` — a standard menu command. Can show a trailing chevron (to
 *   open a submenu), a keyboard shortcut, or a small badge.
 * - `dropdown-advanced` — a richer two-line item (title + description) for results
 *   or entities that need extra detail.
 * - `dropdown-destructive` — a dangerous command such as Delete, shown in red.
 * - `checkbox-selection` / `radio-selection` — a row with a built-in checkbox
 *   (pick several) or radio button (pick one).
 * - `day-cell` / `pagination` — small 32×32 square cells for calendar days and
 *   page numbers; the current one is filled dark with white text.
 * - `time-picker` — a compact time option such as "12:00 AM".
 * - `filter-group` — a bordered filter heading. Once options are ticked it reveals
 *   a single "{n} selected" chip whose × clears them all.
 * - `sidebar-main` / `sidebar-main-icon` / `sidebar-sub` / `side-tab` — items for
 *   the app's left sidebar and side tabs; the current section is highlighted and
 *   set in semibold (icon-only is the collapsed-sidebar version).
 */
export type DesktopMenuOptionType =
  | 'combobox'
  | 'dropdown-basic'
  | 'dropdown-advanced'
  | 'dropdown-destructive'
  | 'checkbox-selection'
  | 'radio-selection'
  | 'day-cell'
  | 'time-picker'
  | 'filter-group'
  | 'sidebar-main'
  | 'sidebar-main-icon'
  | 'sidebar-sub'
  | 'side-tab'
  | 'pagination';

export interface DesktopMenuOptionsProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title' | 'onSelect' | 'content'> {
  /** Which of the 15 Figma Type variants to render. Default `combobox`. */
  type?: DesktopMenuOptionType;
  /** Primary text — label / day number / time / page number / nav or tab name / filter name. */
  label?: string;
  /** Caller-controlled active (current page / selected date / current nav). */
  active?: boolean;
  /** Caller-controlled selected (checkbox/radio selection rows; filter-group reveals tags). */
  selected?: boolean;
  disabled?: boolean;
  /** Force a visual state for catalogs/stories — overrides interaction + active/selected/disabled. */
  state?: DesktopMenuOptionState;
  /** Leading icon (help marker on rows; module icon on sidebar-main / icon-only). */
  leadingIcon?: IconName;
  /** Show the leading icon. */
  showLeadingIcon?: boolean;
  /** dropdown-basic: trailing keyboard shortcut keys. */
  shortcut?: string[];
  /** Trailing badge (dropdown-basic / sidebar / side-tab). */
  badge?: React.ReactNode;
  /** Show the trailing chevron (dropdown-basic → right; sidebar-main / side-tab → down). Default per type. */
  showChevron?: boolean;
  /** dropdown-advanced: subtext beneath the title. */
  subtext?: string;
  /** dropdown-advanced: full content override (else a flat title + subtext + chevron is built from label/subtext). */
  content?: React.ReactNode;
  /**
   * filter-group: how many options are currently selected in the List section.
   * Drives the single "{n} selected" chip shown beneath the label; the chip is
   * hidden when this is 0 (the row falls back to its plain Active/Idle look).
   */
  selectedCount?: number;
  /** filter-group: fired when the "{n} selected" chip (its × icon) is clicked — clears the whole group. */
  onDeselectAll?: () => void;
  /** Fired on activation (click / Enter / Space). For selection rows, fired with the next checked value. */
  onSelect?: (next: boolean) => void;
}

export type DesktopMenuOptionState =
  | 'idle' | 'hover' | 'pressed' | 'active' | 'disabled'
  | 'idle-selected' | 'hover-selected' | 'pressed-selected' | 'active-selected';

type Eff = 'idle' | 'hover' | 'pressed';

const V = (s: string) => `var(${s})`;
const FOCUS_TYPES = new Set<DesktopMenuOptionType>(); // all focusable

const STYLE_ID = 'leta-dmo-styles';
const STYLES = `
  .leta-dmo { cursor: pointer; }
  .leta-dmo[aria-disabled="true"] { cursor: not-allowed; }
  .leta-dmo:focus-visible {
    outline: var(--stroke-sm) solid var(--border-secondary-component-focus);
    outline-offset: 2px;
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

/** Resolve the row surface CSS var for a type given the effective interaction + caller state. */
function surfaceVar(
  type: DesktopMenuOptionType,
  eff: Eff,
  active: boolean,
  selected: boolean,
  disabled: boolean,
): string | null {
  if (disabled) {
    // Sidebar/side-tab idle is transparent; their disabled stays transparent too.
    if (type === 'sidebar-main' || type === 'sidebar-main-icon' || type === 'sidebar-sub' || type === 'side-tab') return null;
    return '--surface-disabled-bg';
  }
  switch (type) {
    case 'combobox':
      if (active) return '--surface-neutral-combobox-active';
      return `--surface-neutral-combobox-${eff}`;
    case 'dropdown-basic':
      return `--surface-neutral-dropdown-basic-${eff}`;
    case 'dropdown-advanced':
      return `--surface-neutral-dropdown-advanced-${eff}`;
    case 'dropdown-destructive':
      if (eff === 'hover') return '--surface-error-dropdown-destructive-hover';
      if (eff === 'pressed') return '--surface-error-dropdown-destructive-pressed';
      return '--surface-neutral-dropdown-destructive-idle';
    case 'checkbox-selection':
    case 'radio-selection':
      if (eff === 'pressed') return '--surface-neutral-selection-pressed';
      if (eff === 'hover') return '--surface-neutral-selection-hover';
      if (selected) return '--surface-neutral-selection-active';
      return '--surface-neutral-selection-idle';
    case 'day-cell':
      if (active) return '--surface-secondary-day-cell-active';
      return `--surface-neutral-day-cell-${eff}`;
    case 'time-picker':
      if (active) return '--surface-secondary-time-picker-active';
      return `--surface-neutral-time-picker-${eff}`;
    case 'pagination':
      if (active) return '--surface-secondary-pagination-active';
      if (eff === 'idle') return '--surface-neutral-day-cell-idle';
      return `--surface-neutral-pagination-${eff}`;
    case 'filter-group':
      if (active) return '--surface-neutral-filter-group-active';
      return `--surface-neutral-filter-group-${eff}`;
    case 'sidebar-main':
    case 'sidebar-main-icon':
      if (active) return '--surface-neutral-sidebar-main-navigation-active';
      if (eff === 'idle') return null;
      return `--surface-neutral-sidebar-main-navigation-${eff}`;
    case 'sidebar-sub':
      if (active) return '--surface-neutral-sidebar-sub-navigation-active';
      if (eff === 'idle') return null;
      return `--surface-neutral-sidebar-sub-navigation-${eff}`;
    case 'side-tab':
      if (active) return '--surface-neutral-sidetab-navigation-active';
      if (eff === 'idle') return null;
      return `--surface-neutral-sidetab-navigation-${eff}`;
  }
}

function borderVar(type: DesktopMenuOptionType, active: boolean, disabled: boolean): string | null {
  if (disabled) return null;
  if (type === 'filter-group') return active ? '--border-secondary-filter-group-active' : '--border-neutral-filter-group-idle';
  if (active && (type === 'sidebar-main' || type === 'sidebar-main-icon')) return '--border-neutral-sidebar-main-navigation-active';
  if (active && type === 'sidebar-sub') return '--border-neutral-sidebar-sub-navigation-active';
  if (active && type === 'side-tab') return '--border-neutral-sidetab-navigation-active';
  return null;
}

/** Primary-text colour var. */
function textVar(type: DesktopMenuOptionType, active: boolean, disabled: boolean): string {
  if (disabled) return '--text-disabled-label';
  if (type === 'dropdown-destructive') return '--text-error-label';
  if ((type === 'day-cell' || type === 'time-picker' || type === 'pagination') && active) return '--text-on-color-label';
  if ((type === 'sidebar-main' || type === 'sidebar-sub') && !active) return '--text-default-label-idle';
  return '--text-default-label';
}

/** Primary-text typography class. */
function textClass(type: DesktopMenuOptionType, active: boolean): string {
  if ((type === 'sidebar-main' || type === 'sidebar-sub' || type === 'side-tab') && active) return 'text-label-m-semibold';
  if (type === 'filter-group' || type === 'sidebar-main' || type === 'side-tab') return 'text-label-m-medium';
  return 'text-label-m-regular';
}

const SIZE: Partial<Record<DesktopMenuOptionType, React.CSSProperties>> = {
  combobox: { width: '100%', minHeight: 40 },
  'dropdown-basic': { width: '100%', minHeight: 40 },
  'dropdown-advanced': { width: '100%', minHeight: 68 },
  'dropdown-destructive': { width: '100%', minHeight: 40 },
  'checkbox-selection': { width: '100%', minHeight: 50 },
  'radio-selection': { width: '100%', minHeight: 50 },
  'day-cell': { width: 32, height: 32 },
  'time-picker': { width: 77, height: 32 },
  'filter-group': { width: '100%', minHeight: 40 },
  'sidebar-main': { width: '100%', minHeight: 40 },
  'sidebar-main-icon': { width: 40, height: 40 },
  'sidebar-sub': { width: '100%', minHeight: 40 },
  'side-tab': { width: '100%', minHeight: 40 },
  pagination: { width: 32, height: 32 },
};

const DEFAULT_ROLE: Record<DesktopMenuOptionType, string> = {
  combobox: 'option',
  'dropdown-basic': 'menuitem',
  'dropdown-advanced': 'menuitem',
  'dropdown-destructive': 'menuitem',
  'checkbox-selection': 'menuitemcheckbox',
  'radio-selection': 'menuitemradio',
  'day-cell': 'gridcell',
  'time-picker': 'option',
  'filter-group': 'button',
  'sidebar-main': 'menuitem',
  'sidebar-main-icon': 'menuitem',
  'sidebar-sub': 'menuitem',
  'side-tab': 'tab',
  pagination: 'button',
};

/**
 * Desktop Menu Options — a single row inside a desktop menu, dropdown, sidebar,
 * calendar, or pager. It's the basic building block of the things people pick
 * from: each row shows a label plus, depending on its `type`, an optional leading
 * icon, a trailing checkmark / chevron / keyboard shortcut / badge, or an embedded
 * checkbox or radio button.
 *
 * You rarely use a row on its own — you stack several inside a **Desktop Dropdowns**
 * panel (or a sidebar / calendar) to build the full menu. Hover and pressed states
 * are handled automatically; `active` (current/selected), `selected`
 * (checkbox/radio rows), and `disabled` are caller-controlled. The `state` prop
 * forces one visual state, which is only useful for catalog/showcase stories.
 *
 * **When to use:** for the individual items of any menu, dropdown, select, filter
 * list, calendar, pager, sidebar, or side-tab.
 * **When not to use:** as a standalone button (use Button) or as a top-level page
 * tab (use Page Tabs Control).
 */
export const DesktopMenuOptions = React.forwardRef<HTMLDivElement, DesktopMenuOptionsProps>(function DesktopMenuOptions(
  {
    type = 'combobox',
    label = 'Insert Text',
    active: activeProp = false,
    selected: selectedProp = false,
    disabled: disabledProp = false,
    state,
    leadingIcon,
    showLeadingIcon = false,
    shortcut,
    badge,
    showChevron,
    subtext,
    content,
    selectedCount,
    onDeselectAll,
    onSelect,
    className,
    style,
    role,
    ...rest
  },
  ref,
) {
  ensureStyles();
  void FOCUS_TYPES;
  const [hover, setHover] = React.useState(false);
  const [press, setPress] = React.useState(false);

  // `state` override (catalogs/stories) wins over interaction + caller flags.
  const disabled = state ? state === 'disabled' : disabledProp;
  const active = state ? state === 'active' || state === 'active-selected' : activeProp;
  const selected = state ? state.endsWith('-selected') : selectedProp;
  const eff: Eff = disabled
    ? 'idle'
    : state
      ? (state.startsWith('hover') ? 'hover' : state.startsWith('pressed') ? 'pressed' : 'idle')
      : press ? 'pressed' : hover ? 'hover' : 'idle';

  const bg = surfaceVar(type, eff, active, selected, disabled);
  const bd = borderVar(type, active, disabled);
  const txtVar = textVar(type, active, disabled);
  const txtClass = textClass(type, active);

  const fire = () => { if (!disabled) onSelect?.(!selected); };

  const isCell = type === 'day-cell' || type === 'pagination';
  const center = isCell || type === 'sidebar-main-icon';

  const container: React.CSSProperties = {
    boxSizing: 'border-box',
    flexShrink: 0, // never compress below natural height inside a scroll/flex column
    display: 'flex',
    flexDirection: type === 'filter-group' ? 'column' : 'row',
    alignItems: type === 'filter-group' ? 'flex-start' : 'center',
    justifyContent: center ? 'center' : 'space-between',
    gap: 'var(--spacing-8px)',
    borderRadius: 'var(--rounding-lg)',
    ...SIZE[type],
    padding:
      type === 'sidebar-main-icon'
        ? 0
        : type === 'sidebar-sub'
          ? 'var(--padding-10px) var(--padding-10px) var(--padding-10px) var(--padding-20px)'
          : type === 'time-picker'
            ? 'var(--padding-6px) var(--padding-8px)'
            : isCell
              ? 0
              : type === 'dropdown-advanced'
                ? 'var(--padding-12px)'
                : 'var(--padding-10px)',
    backgroundColor: bg ? V(bg) : 'transparent',
    boxShadow: bd ? `inset 0 0 0 var(--stroke-sm) ${V(bd)}` : undefined,
    transition: 'background-color 120ms ease',
    ...style,
  };

  const labelEl = (
    <span className={txtClass} style={{ color: V(txtVar), overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
      {label}
    </span>
  );
  // Leading icon on combobox / dropdown-basic / dropdown-destructive: a real,
  // dark icon (`--icons-neutral-default`); destructive tints it error-red.
  const leadIconColor = type === 'dropdown-destructive' ? '--icons-error-default' : '--icons-neutral-default';
  const helpIcon = showLeadingIcon ? (
    <span style={{ flexShrink: 0, display: 'flex', color: V(leadIconColor) }}>
      <Icon name={leadingIcon ?? 'Question'} outlined size={16} />
    </span>
  ) : null;
  const chevron = (dir: 'right' | 'down', size = 16) => (
    <span style={{ flexShrink: 0, display: 'flex', color: 'var(--icons-neutral-default)' }}>
      <Icon name={dir === 'right' ? 'Chevron-Right' : 'Chevron-Down'} size={size} />
    </span>
  );
  const checkIcon = (
    <span style={{ flexShrink: 0, display: 'flex', color: 'var(--icons-neutral-default)' }}>
      <Icon name="Check" size={16} />
    </span>
  );

  let inner: React.ReactNode;
  switch (type) {
    case 'combobox':
    case 'dropdown-basic':
    case 'dropdown-destructive': {
      // dropdown-basic shows a trailing chevron by default; combobox shows a
      // trailing checkmark only when it's the selected (active) option.
      const wantChevron = showChevron ?? type === 'dropdown-basic';
      const wantCheck = type === 'combobox' && active;
      inner = (
        <>
          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 'var(--spacing-8px)', flex: 1, minWidth: 0 }}>
            {helpIcon}
            {labelEl}
          </div>
          {(shortcut || badge || wantChevron || wantCheck) && (
            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 'var(--spacing-8px)', flexShrink: 0 }}>
              {shortcut && <Shortcut keys={shortcut} disabled={disabled} />}
              {badge}
              {wantChevron && chevron('right')}
              {wantCheck && checkIcon}
            </div>
          )}
        </>
      );
      break;
    }
    case 'dropdown-advanced':
      // Decoupled from ContentPrimitives (Figma flattened this variant off the
      // Content Primitives instance to fix reparenting). Flat layout: a title +
      // subtext column on the left, a trailing chevron on the right — same visual
      // output as the previous `ContentPrimitives type="utility"` composition.
      inner = content ?? (
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 'var(--spacing-20px)', width: '100%' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4px)', flex: 1, minWidth: 0 }}>
            <span className="text-label-m-semibold" style={{ color: 'var(--text-default-heading)' }}>{label}</span>
            {subtext != null && (
              <span className="text-body-m-regular" style={{ color: 'var(--text-default-sub-body)' }}>{subtext}</span>
            )}
          </div>
          {chevron('right', 20)}
        </div>
      );
      break;
    case 'checkbox-selection':
    case 'radio-selection':
      inner = (
        <SelectionControl
          variant={type === 'checkbox-selection' ? 'checkbox' : 'radio'}
          label={label}
          checked={selected}
          disabled={disabled}
          onChange={(c) => onSelect?.(c)}
          // Rows sit in a fixed-width dropdown — fill the row so a long label
          // (e.g. an order ID) truncates with an ellipsis instead of wrapping.
          fullWidth
        />
      );
      break;
    case 'day-cell':
    case 'time-picker':
    case 'pagination':
      inner = labelEl;
      break;
    case 'filter-group': {
      const count = selectedCount ?? 0;
      const showChip = (selected || active) && count > 0;
      inner = (
        <>
          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 'var(--spacing-8px)', width: '100%' }}>
            <span className={txtClass} style={{ color: V(txtVar), flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
            {chevron('right')}
          </div>
          {showChip && (
            <Chip
              label={`${count} selected`}
              trailingIcon="Cancel"
              onClick={(e) => { e.stopPropagation(); if (!disabled) onDeselectAll?.(); }}
            />
          )}
        </>
      );
      break;
    }
    case 'sidebar-main':
      inner = (
        <>
          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 'var(--spacing-8px)', flex: 1, minWidth: 0 }}>
            {(showLeadingIcon || leadingIcon) && (
              <span style={{ flexShrink: 0, display: 'flex', color: active ? 'var(--icons-neutral-default)' : 'var(--icons-neutral-idle)' }}>
                <Icon name={leadingIcon ?? 'Question'} outlined size={16} />
              </span>
            )}
            {labelEl}
          </div>
          {(badge || showChevron) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-8px)', flexShrink: 0 }}>{badge}{showChevron && chevron('down')}</div>
          )}
        </>
      );
      break;
    case 'sidebar-main-icon':
      inner = (
        <span style={{ display: 'flex', color: active ? 'var(--icons-neutral-default)' : 'var(--icons-neutral-idle)' }}>
          <Icon name={leadingIcon ?? 'Question'} outlined size={16} />
        </span>
      );
      break;
    case 'sidebar-sub':
      inner = (
        <>
          {labelEl}
          {badge && <div style={{ flexShrink: 0 }}>{badge}</div>}
        </>
      );
      break;
    case 'side-tab':
      inner = (
        <>
          {labelEl}
          {(badge || showChevron) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-8px)', flexShrink: 0 }}>{badge}{showChevron && chevron('down')}</div>
          )}
        </>
      );
      break;
  }

  const isSelectionRow = type === 'checkbox-selection' || type === 'radio-selection';

  return (
    <div
      ref={ref}
      className={['leta-dmo', className].filter(Boolean).join(' ')}
      role={role ?? DEFAULT_ROLE[type]}
      aria-disabled={disabled || undefined}
      aria-selected={active || (selected && !isSelectionRow) || undefined}
      tabIndex={disabled || isSelectionRow ? undefined : 0}
      onClick={isSelectionRow ? undefined : fire}
      onKeyDown={
        isSelectionRow
          ? undefined
          : (e) => {
              if (disabled) return;
              if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fire(); }
            }
      }
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => { setHover(false); setPress(false); }}
      onMouseDown={() => setPress(true)}
      onMouseUp={() => setPress(false)}
      style={container}
      {...rest}
    >
      {inner}
    </div>
  );
});

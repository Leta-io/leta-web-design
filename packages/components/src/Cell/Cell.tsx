import * as React from 'react';
import { Icon, type IconName } from '@leta-io/icons';
import { Badge } from '../Badge/Badge.js';
import { Button } from '../Button/Button.js';
import { Checkbox } from '../Checkbox/Checkbox.js';
import { Chip } from '../Chip/Chip.js';
import { Avatar } from '../Avatar/Avatar.js';
import { FeaturedIcon } from '../FeaturedIcon/FeaturedIcon.js';
import { Select } from '../Select/Select.js';
import { Stepper } from '../Stepper/Stepper.js';
import { GroupedInput } from '../GroupedInput/GroupedInput.js';
import {
  DurationLabel,
  type DurationLabelVariant,
  type DurationLabelStatus,
} from '../DurationLabel/DurationLabel.js';
import { HoverTip } from '../Tooltip/HoverTip.js';

/**
 * The kind of content a Cell renders. Header types are 40px tall and label the
 * columns; the remaining body types are 72px tall and hold a row's data.
 */
export type CellType =
  | 'header'
  | 'header-checkbox'
  | 'sample'
  | 'date'
  | 'text-link'
  | 'status'
  | 'default-checkbox'
  | 'actions'
  | 'preview-chips'
  | 'duration'
  | 'select-field'
  | 'item-stepper'
  | 'time-stepper'
  | 'list-item'
  | 'address-cell'
  | 'manual-order'
  | 'automatic-order'
  | 'driver-cell'
  | 'user-cell'
  | 'api-cell';

export type CellState = 'idle' | 'hover' | 'pressed' | 'selected';

export interface CellProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title' | 'content'> {
  /** Which of the 19 Figma Types to render. Default `sample`. */
  type?: CellType;
  /** Caller-controlled selected row (body types only; ignored by Header types). */
  selected?: boolean;
  /** Force a visual state for catalogs/stories — overrides interaction + `selected`. */
  state?: CellState;

  // header
  /** `header`: the column title. Default "Label". */
  columnName?: string;
  /** `header`: render the leading info icon. Default false. */
  showLeadingIcon?: boolean;
  /** `header`: the leading icon (outlined). Default `Info`. */
  leadingIcon?: IconName;
  /** `header`: render the trailing info icon. Default false. */
  showTrailingIcon?: boolean;
  /** `header`: the trailing icon (outlined). Default `Info`. */
  trailingIcon?: IconName;

  // checkboxes
  /**
   * `header-checkbox` / `default-checkbox`: checked state. Leave undefined for
   * uncontrolled behaviour — the Checkbox self-toggles checked ↔ unchecked on
   * click (and fires `onCheckedChange`). Pass a boolean to control it.
   */
  checked?: boolean;
  /** `header-checkbox`: indeterminate (some-rows-selected) state — for the "some but not all rows selected" header checkbox. */
  indeterminate?: boolean;
  /** `header-checkbox` / `default-checkbox`: fired with the next checked value. */
  onCheckedChange?: (checked: boolean) => void;

  // text content
  /** `sample`: the plain text value. Right-align numerics for scanning. Default "Content". */
  text?: string;
  /** `sample`: right-align the value (numeric quantities/amounts). Default false. */
  alignRight?: boolean;
  /**
   * Horizontal alignment of the cell's whole content, any `type`. `'right'` for
   * numeric columns (Distance, Duration) per the annotations' "right-align
   * numerics" rule. Normally set once on the `TableColumn` so the header label and
   * its values align together, rather than per cell.
   */
  align?: 'left' | 'right';
  /** `date`: the two-line date/time value. Default "Jan 23, 2023\n9:00 AM". */
  date?: string;
  /** `text-link`: the link text. Default "contact@gmail.com". */
  link?: string;
  /** `text-link`: fired when the link is clicked. */
  onLinkClick?: () => void;
  /** `list-item`: the title (truncates with ellipsis). Default "Text". */
  title?: string;
  /** `list-item`: the description (truncates with ellipsis). Default "Enter description here". */
  subtext?: string;
  /** `address-cell`: the pickup address (truncates with ellipsis). */
  pickup?: string;
  /** `address-cell`: the dropoff address (truncates with ellipsis). */
  dropoff?: string;
  /** `manual-order` / `automatic-order`: the order ID (truncates, max 250 chars). */
  orderId?: string;

  // composed-atom content
  /** `preview-chips`: chip labels. Default three "Type" chips. */
  chips?: string[];
  /** `duration`: the embedded Duration Label variant. Default `finished`. */
  durationVariant?: DurationLabelVariant;
  /** `duration`: the Duration Label status. Default `on-target`. */
  durationStatus?: DurationLabelStatus;
  /** `duration`: the duration text. Default "0h 0m 0s". */
  durationTime?: string;
  /** `duration`: hover tooltip on the finished Duration Label's status icon
   *  ("Delivery on time" / "Delivery delayed"). No tooltip when omitted. */
  durationIconTooltip?: string;
  /** `select-field`: fired when the inline select is clicked. */
  onSelectClick?: () => void;
  /** `item-stepper`: the stepper value. */
  stepperValue?: number;
  /** `item-stepper`: fired with the next stepper value. */
  onStepperChange?: (value: number) => void;
  /** `driver-cell` / `user-cell`: the person's name (also the source for the Avatar's initials). Default "Michael Kariuki". */
  name?: string;
  /** `driver-cell` / `user-cell`: the avatar photo URL (falls back to empty-teal initials). */
  avatarSrc?: string;
  /**
   * `driver-cell`: show the trailing Swap + Call action buttons under the name.
   * Default true. Set false for **finished** orders (delivered/cancelled) — a
   * terminal order's driver can't be swapped or called, so the cell shows just
   * the name, vertically centered against the avatar.
   */
  showDriverActions?: boolean;
  /** `driver-cell`: fired when the Swap (change-driver) button is clicked. */
  onSwapDriver?: () => void;
  /** `driver-cell`: fired when the Call button is clicked. */
  onCallDriver?: () => void;
  /** `driver-cell`: hover tooltip on the Swap (change-driver) button. Default "Change Driver". */
  swapTooltip?: string;
  /** `driver-cell`: hover tooltip on the Call button. Default "Call". */
  callTooltip?: string;
  /** `user-cell`: the user's email, shown under the name in muted sub-body text. */
  email?: string;
  /** `api-cell`: the title (e.g. how the row was created). Default "Auto-created". */
  apiTitle?: string;
  /** `api-cell`: the sub-body describing the source. Default "From online store". */
  apiSubtext?: string;
  /** `api-cell`: the Featured Icon glyph. Default "Integration". */
  apiIcon?: IconName;

  /** `status`: SLA-state trailing icon (§2.3) — orange warning icon when the order
   *  is At Risk, red error icon when Delayed, no icon when On-Time. Default undefined (no icon). */
  statusIcon?: 'warning' | 'error';
  /** `status`: hover tooltip on the SLA icon ("At Risk" / "Delayed"). No tooltip when omitted. */
  statusIconTooltip?: string;
  /** `header`: hover tooltip on the trailing icon (e.g. the Duration header's ⓘ). */
  trailingIconTooltip?: string;

  // SLOTs (caller-injected; defaults mirror the visible Figma instance)
  /** `status` SLOT — the status/delivery badge(s). Default a Scheduled badge. */
  statusContent?: React.ReactNode;
  /** `actions` SLOT — row-level action buttons. Default a Ghost "More" icon button. */
  actions?: React.ReactNode;
  /** `time-stepper` SLOT — the multi-row time editor. Default a Grouped Input + Add Row. */
  timeStepperContent?: React.ReactNode;
  /** `manual-order` SLOT — order ID + interactive elements. Default built from `orderId`. */
  manualOrderContent?: React.ReactNode;
  /** `automatic-order` SLOT — order ID + interactive elements. Default built from `orderId`. */
  automaticOrderContent?: React.ReactNode;
  /** `manual-order` / `automatic-order`: fired when the Copy icon button is clicked. */
  onCopyOrderId?: () => void;
  /** `manual-order` / `automatic-order`: hover tooltip on the Copy button. Default "Copy ID". */
  copyTooltip?: string;
  /** `manual-order` / `automatic-order`: hover tooltip on the provenance icon
   *  (Manual-Touch / Integration). Defaults "Created manually" / "Created via integration". */
  sourceTooltip?: string;
  /** `manual-order` / `automatic-order`: show the Calendar scheduled-origin icon.
   *  Default true (the Figma default renders it). */
  showScheduledIcon?: boolean;
  /** `manual-order` / `automatic-order`: hover tooltip on the Calendar icon —
   *  the order's scheduled delivery date/time (e.g. "Scheduled: 09 Jun 2027, 12:30 PM").
   *  No tooltip when omitted. */
  scheduledTooltip?: string;
  /** `manual-order` / `automatic-order`: show the Broadcast auto-broadcast icon.
   *  Default false (data-driven — only auto-broadcasted orders carry it). */
  showBroadcastIcon?: boolean;
  /** `manual-order` / `automatic-order`: hover tooltip on the Broadcast icon. Default "Auto-broadcast". */
  broadcastTooltip?: string;
}

type Eff = 'idle' | 'hover' | 'pressed';
const V = (s: string) => `var(${s})`;

const HEADER_TYPES = new Set<CellType>(['header', 'header-checkbox']);
const COL_TYPES = new Set<CellType>([
  'time-stepper', 'list-item', 'address-cell', 'manual-order', 'automatic-order', 'driver-cell', 'user-cell', 'api-cell',
]);
const CENTER_ROW = new Set<CellType>(['header-checkbox', 'default-checkbox', 'actions', 'preview-chips']);

const GAP: Partial<Record<CellType, number | string>> = {
  header: 'var(--spacing-8px)',
  status: 'var(--spacing-8px)',
  actions: 'var(--spacing-12px)',
  'preview-chips': 'var(--spacing-12px)',
  'time-stepper': 'var(--spacing-20px)',
  'list-item': 'var(--spacing-4px)',
};

const STYLE_ID = 'leta-cell-styles';
const STYLES = `
  .leta-cell { box-sizing: border-box; transition: background-color 120ms ease; }
  .leta-cell:focus-visible {
    outline: var(--stroke-sm) solid var(--border-secondary-component-focus);
    outline-offset: -2px;
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

/** Background surface var for a type given the effective interaction + selected. */
function surfaceVar(type: CellType, eff: Eff, selected: boolean): string {
  // Header types have only an Idle state in Figma — no hover/pressed/selected.
  if (HEADER_TYPES.has(type)) return '--surface-neutral-table-header-idle';
  if (selected) return '--surface-secondary-table-cell-selected';
  return `--surface-neutral-table-cell-${eff}`;
}

/** A truncating text span (ellipsis when the column constrains it). */
const Truncate = ({ children, className, color }: { children: React.ReactNode; className: string; color: string }) => (
  <span
    className={className}
    style={{ color, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block', maxWidth: '100%' }}
  >
    {children}
  </span>
);

/**
 * Cell — the building block of LETA data tables. Each Cell renders one column's
 * value for one row inside a fixed-height, padded container that carries the
 * table's interaction states (Idle, Hover, Pressed, Selected). Header cells (40px)
 * label and sort columns; body cells (72px) hold row data. The `type` prop chooses
 * what the cell renders, from a plain value to rich composite content (addresses,
 * order IDs, driver profiles).
 *
 * Hover/pressed are tracked at runtime for the cell background; `selected` is
 * caller-controlled (highlights the cell with the secondary selection surface;
 * Header types have no Selected state). The `state` prop forces one visual state,
 * useful only for catalog/showcase stories. The width fills the table column —
 * give the Cell a bounded width (the column) for the truncating types to clip.
 *
 * **When to use:** as the cell renderer inside a data table / list row.
 * **When not to use:** standalone content blocks → Content Card; calendar day
 * cells → the day-cell Menu Option; selectable choice tiles → Option Card.
 */
export const Cell = React.forwardRef<HTMLDivElement, CellProps>(function Cell(
  {
    type = 'sample',
    selected: selectedProp = false,
    state,
    columnName = 'Label',
    showLeadingIcon = false,
    leadingIcon = 'Info',
    showTrailingIcon = false,
    trailingIcon = 'Info',
    checked,
    indeterminate = false,
    onCheckedChange,
    text = 'Content',
    alignRight = false,
    align,
    date = 'Jan 23, 2023\n9:00 AM',
    link = 'contact@gmail.com',
    onLinkClick,
    title = 'Text',
    subtext = 'Enter description here',
    pickup = 'Arc Kitisuru Depot',
    dropoff = '1A Plum Grove, Westlands, Nairobi',
    orderId = 'test001-qPRQYUs-j2k2k2',
    chips = ['Type', 'Type', 'Type'],
    durationVariant = 'finished',
    durationStatus = 'on-target',
    durationTime = '0h 0m 0s',
    durationIconTooltip,
    onSelectClick,
    stepperValue,
    onStepperChange,
    name = 'Michael Kariuki',
    avatarSrc,
    showDriverActions = true,
    onSwapDriver,
    onCallDriver,
    swapTooltip = 'Change Driver',
    callTooltip = 'Call',
    email = 'davemungai@gmail.com',
    apiTitle = 'Auto-created',
    apiSubtext = 'From online store',
    apiIcon = 'Integration',
    statusContent,
    statusIcon,
    statusIconTooltip,
    trailingIconTooltip,
    actions,
    timeStepperContent,
    manualOrderContent,
    automaticOrderContent,
    onCopyOrderId,
    copyTooltip = 'Copy ID',
    sourceTooltip,
    showScheduledIcon = true,
    scheduledTooltip,
    showBroadcastIcon = false,
    broadcastTooltip = 'Auto-broadcast',
    className,
    style,
    ...rest
  },
  ref,
) {
  ensureStyles();
  const [hover, setHover] = React.useState(false);
  const [press, setPress] = React.useState(false);

  const isHeader = HEADER_TYPES.has(type);
  const selected = state ? state === 'selected' : isHeader ? false : selectedProp;
  const eff: Eff = state
    ? state === 'hover' ? 'hover' : state === 'pressed' ? 'pressed' : 'idle'
    : press ? 'pressed' : hover ? 'hover' : 'idle';

  const bg = surfaceVar(type, eff, selected);

  // ----- per-type inner content -----
  let inner: React.ReactNode;
  switch (type) {
    case 'header':
      inner = (
        <>
          {showLeadingIcon && (
            <span style={{ flexShrink: 0, display: 'flex', color: 'var(--icons-neutral-idle)' }}>
              <Icon name={leadingIcon} outlined size={16} />
            </span>
          )}
          <span className="text-label-s-semibold" style={{ color: 'var(--text-default-sub-heading)' }}>{columnName}</span>
          {showTrailingIcon && (
            trailingIconTooltip ? (
              <HoverTip label={trailingIconTooltip} style={{ flexShrink: 0, color: 'var(--icons-neutral-idle)' }}>
                <Icon name={trailingIcon} outlined size={16} />
              </HoverTip>
            ) : (
              <span style={{ flexShrink: 0, display: 'flex', color: 'var(--icons-neutral-idle)' }}>
                <Icon name={trailingIcon} outlined size={16} />
              </span>
            )
          )}
        </>
      );
      break;
    case 'header-checkbox':
    case 'default-checkbox':
      inner = (
        <Checkbox
          checked={checked}
          indeterminate={type === 'header-checkbox' ? indeterminate : false}
          onChange={onCheckedChange}
        />
      );
      break;
    case 'sample':
      inner = (
        <span
          className="text-label-m-regular"
          style={{ color: 'var(--text-default-label)', width: '100%', textAlign: alignRight || align === 'right' ? 'right' : 'left' }}
        >
          {text}
        </span>
      );
      break;
    case 'date': {
      // Figma splits the value across two colours: the date line uses
      // `--text-default-label`, the time line `--text-default-label-idle`.
      const nl = date.indexOf('\n');
      const dateLine = nl === -1 ? date : date.slice(0, nl);
      const timeLine = nl === -1 ? '' : date.slice(nl + 1);
      inner = (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span className="text-label-m-regular" style={{ color: 'var(--text-default-label)' }}>{dateLine}</span>
          {timeLine && (
            <span className="text-label-m-regular" style={{ color: 'var(--text-default-label-idle)' }}>{timeLine}</span>
          )}
        </div>
      );
      break;
    }
    case 'text-link':
      inner = (
        <Button variant="plain" size="medium" onClick={onLinkClick}>{link}</Button>
      );
      break;
    case 'status': {
      const slaIcon = statusIcon && (
        <Icon
          name={statusIcon === 'warning' ? 'Warning' : 'Error'}
          outlined={false}
          size={16}
          color={statusIcon === 'warning' ? 'var(--icons-warning-default)' : 'var(--icons-error-default)'}
        />
      );
      inner = (
        <>
          {statusContent ?? <Badge color="primary" label="Scheduled" />}
          {slaIcon && (statusIconTooltip ? <HoverTip label={statusIconTooltip}>{slaIcon}</HoverTip> : slaIcon)}
        </>
      );
      break;
    }
    case 'actions':
      inner = actions ?? <Button variant="ghost" size="small" iconOnly="More" aria-label="More actions" />;
      break;
    case 'preview-chips':
      inner = chips.map((c, i) => <Chip key={i} label={c} />);
      break;
    case 'duration':
      inner = <DurationLabel variant={durationVariant} status={durationStatus} time={durationTime} iconTooltip={durationIconTooltip} />;
      break;
    case 'select-field':
      inner = (
        <Select
          showLabel={false}
          showHelper={false}
          onSelectClick={onSelectClick}
          style={{ width: '100%' }}
        />
      );
      break;
    case 'item-stepper':
      inner = (
        <Stepper variant="segmented" value={stepperValue} defaultValue={stepperValue === undefined ? 0 : undefined} onChange={onStepperChange} />
      );
      break;
    case 'time-stepper':
      inner = timeStepperContent ?? (
        <>
          <GroupedInput variant="time-input-stepper" showHelperText={false} editableLabel="10 Km - 100 Km" style={{ width: '100%' }} />
          <Button variant="dashed" size="medium" iconLeft="Add" style={{ width: '100%' }}>Add Row</Button>
        </>
      );
      break;
    case 'list-item':
      inner = (
        <>
          <Truncate className="text-label-m-medium" color="var(--text-default-heading)">{title}</Truncate>
          <Truncate className="text-body-m-regular" color="var(--text-default-sub-body)">{subtext}</Truncate>
        </>
      );
      break;
    case 'address-cell':
      // A single continuous solid 1px line runs through the 12px icon column,
      // connecting the pickup and dropoff icons (negative margins let it bridge
      // into the icon rows so it touches both icons with no gaps).
      inner = (
        <div style={{ display: 'flex', flexDirection: 'column', width: '100%', minWidth: 0 }}>
          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 'var(--spacing-8px)', minWidth: 0 }}>
            <span style={{ flexShrink: 0, display: 'flex', color: 'var(--icons-neutral-idle)' }}><Icon name="Trip-Origin" size={12} /></span>
            <Truncate className="text-label-m-regular" color="var(--text-default-label)">{pickup}</Truncate>
          </div>
          <div style={{ width: 12, display: 'flex', justifyContent: 'center' }}>
            <div style={{ width: 0, height: 20, marginTop: -4, marginBottom: -4, borderLeft: 'var(--stroke-xs) solid var(--border-neutral-default)' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 'var(--spacing-8px)', minWidth: 0 }}>
            <span style={{ flexShrink: 0, display: 'flex', color: 'var(--icons-neutral-idle)' }}><Icon name="Location" outlined size={12} /></span>
            <Truncate className="text-label-m-regular" color="var(--text-default-label)">{dropoff}</Truncate>
          </div>
        </div>
      );
      break;
    case 'manual-order':
    case 'automatic-order': {
      const slotContent = type === 'manual-order' ? manualOrderContent : automaticOrderContent;
      const manual = type === 'manual-order';
      // Interactive Elements row — copy + provenance icons, each with the
      // wireframes' hover tooltips (`1334:178838`): Copy ID · Created
      // manually / Created via integration · Scheduled: {date} · Auto-broadcast.
      const sourceIcon = manual
        ? <span style={{ display: 'flex', color: 'var(--icons-caution-badge)' }}><Icon name="Manual-Touch" outlined size={16} /></span>
        : <span style={{ display: 'flex', color: 'var(--icons-notice-badge)' }}><Icon name="Integration" size={16} /></span>;
      const calendarIcon = <span style={{ display: 'flex', color: 'var(--icons-information-badge)' }}><Icon name="Calendar" size={16} /></span>;
      const broadcastIcon = <span style={{ display: 'flex', color: 'var(--icons-highlight-default)' }}><Icon name="Broadcast" size={16} /></span>;
      inner = slotContent ?? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4px)', minWidth: 0, width: '100%' }}>
          <Truncate className="text-label-m-medium" color="var(--text-default-heading)">{orderId}</Truncate>
          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 'var(--spacing-8px)' }}>
            <HoverTip label={copyTooltip}>
              <Button variant="secondary" size="extra-small" iconOnly="Copy" iconOutlined copyIcon="Check-Circle" aria-label="Copy order ID" onClick={onCopyOrderId} />
            </HoverTip>
            <HoverTip label={sourceTooltip ?? (manual ? 'Created manually' : 'Created via integration')}>
              {sourceIcon}
            </HoverTip>
            {showScheduledIcon &&
              (scheduledTooltip ? <HoverTip label={scheduledTooltip}>{calendarIcon}</HoverTip> : calendarIcon)}
            {showBroadcastIcon && <HoverTip label={broadcastTooltip}>{broadcastIcon}</HoverTip>}
          </div>
        </div>
      );
      break;
    }
    case 'driver-cell':
      inner = (
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 'var(--spacing-12px)', minWidth: 0 }}>
          <Avatar name={name} size="small" src={avatarSrc} decorative />
          {showDriverActions ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4px)', minWidth: 0 }}>
              <Truncate className="text-label-m-medium" color="var(--text-default-heading)">{name}</Truncate>
              {/* Swap + Call are Secondary Extra-Small icon buttons (their own
                  :hover state) that also open a hover tooltip, like the other
                  row icons — Change Driver / Call. */}
              <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 'var(--spacing-8px)' }}>
                <HoverTip label={swapTooltip}>
                  <Button variant="secondary" size="extra-small" iconOnly="Swap" aria-label="Change driver" onClick={onSwapDriver} />
                </HoverTip>
                <HoverTip label={callTooltip}>
                  <Button variant="secondary" size="extra-small" iconOnly="Phone" iconOutlined aria-label="Call driver" onClick={onCallDriver} />
                </HoverTip>
              </div>
            </div>
          ) : (
            // Finished orders — name only, centered against the avatar (no actions).
            <Truncate className="text-label-m-medium" color="var(--text-default-heading)">{name}</Truncate>
          )}
        </div>
      );
      break;
    case 'user-cell':
      // Avatar (Medium 40px — photo via avatarSrc, else empty-teal initials from
      // the name) + name (heading) + email (muted sub-body). Figma Cell "User" 10757:9057.
      inner = (
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 'var(--spacing-12px)', minWidth: 0 }}>
          <Avatar name={name} size="medium" tone="teal" src={avatarSrc} decorative />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4px)', minWidth: 0 }}>
            <Truncate className="text-label-m-medium" color="var(--text-default-heading)">{name}</Truncate>
            <Truncate className="text-body-m-regular" color="var(--text-default-sub-body)">{email}</Truncate>
          </div>
        </div>
      );
      break;
    case 'api-cell':
      // Featured Icon (Large, Teal, Integration glyph, CIRCULAR — the API-cell
      // instance overrides the component's rounded-square radius) + title (heading)
      // + source subtext (muted sub-body). Figma Cell "API" 10787:17505 — the
      // machine/integration counterpart of user-cell.
      inner = (
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 'var(--spacing-12px)', minWidth: 0 }}>
          <FeaturedIcon icon={apiIcon} color="teal" size="large" shape="circle" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4px)', minWidth: 0 }}>
            <Truncate className="text-label-m-medium" color="var(--text-default-heading)">{apiTitle}</Truncate>
            <Truncate className="text-body-m-regular" color="var(--text-default-sub-body)">{apiSubtext}</Truncate>
          </div>
        </div>
      );
      break;
  }

  const isCol = COL_TYPES.has(type);
  const height = isHeader ? 40 : type === 'time-stepper' ? undefined : 72;

  const content: React.CSSProperties = {
    boxSizing: 'border-box',
    width: '100%',
    height: '100%',
    minWidth: 0,
    display: 'flex',
    flexDirection: isCol ? 'column' : 'row',
    alignItems: isCol ? 'flex-start' : 'center',
    // Column cells (manual-order / address-cell / list-item / driver-cell …) stack
    // vertically — justify-content is their *vertical* axis, so it must be `center`
    // to match Figma's `primary:CENTER` (otherwise the stack pins to the cell top
    // while neighbouring row cells centre, misaligning the row). Row cells centre
    // vertically via align-items; justify-content stays their horizontal axis.
    justifyContent: isCol || CENTER_ROW.has(type) ? 'center' : 'flex-start',
    gap: GAP[type] ?? (isCol ? 0 : 'var(--spacing-8px)'),
    // Numeric columns right-align ("right-align numerics", Cell annotations). A
    // column cell stacks vertically, so its horizontal axis is `align-items`;
    // a row cell's is `justify-content`.
    ...(align === 'right'
      ? isCol
        ? { alignItems: 'flex-end' as const }
        : { justifyContent: 'flex-end' as const }
      : null),
    paddingTop: 'var(--padding-10px)',
    paddingBottom: 'var(--padding-10px)',
    paddingLeft: 'var(--padding-12px)',
    paddingRight: type === 'status' ? 'var(--padding-20px)' : 'var(--padding-12px)',
  };

  return (
    <div
      ref={ref}
      className={['leta-cell', className].filter(Boolean).join(' ')}
      data-cell-type={type}
      style={{
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        width: '100%',
        height,
        backgroundColor: V(bg),
        transition: 'background-color 120ms ease',
        ...style,
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => { setHover(false); setPress(false); }}
      onMouseDown={() => setPress(true)}
      onMouseUp={() => setPress(false)}
      {...rest}
    >
      <div style={content}>{inner}</div>
    </div>
  );
});

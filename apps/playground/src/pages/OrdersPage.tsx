import * as React from 'react';
import {
  ALL_ORDER_COLUMNS,
  AVATAR_PHOTOS,
  Badge,
  BROADCASTED_ORDER_COLUMNS,
  BulkActionsToolbar,
  Button,
  CREATED_BY_COLUMN,
  DateTimePicker,
  DesktopDropdowns,
  DesktopMenuOptions,
  LAST_UPDATED_COLUMN,
  LoadingOverlay,
  ORDER_TABLE_COLUMNS,
  ORDER_TABLE_COLUMNS_FINISHED,
  SCHEDULED_ORDER_COLUMNS,
  Table,
  TableContainer,
  TableDataControl,
  Title,
  TopFilterSection,
  UNASSIGNED_ORDER_COLUMNS,
  type FilterGroupDimension,
  type TableColumn,
  type TableRow,
  type TopFilterSectionItem,
} from '@leta/components';
import type { IconName } from '@leta/icons';
import { useStore } from '../store/useStore.js';
import type { NewOrderInput } from '../store/useStore.js';
import type { DepotOption, Order, OrderStatus, SlaConfig } from '../store/types.js';
import { ORDER_STATUS_BADGE, ORDER_STATUS_BADGE_ICON, ORDER_STATUS_ICON, ORDER_STATUS_LABEL } from '../store/types.js';
import { Popover, MenuPanel, MenuDivider } from '../components/Popover.js';
import { SkeletonTableRows } from '../components/SkeletonTableRows.js';
import {
  CREATORS,
  creatorFor,
  creatorLabelFor,
  depotForOrder,
  distanceKmFor,
  distanceLabelFor,
  durationSecondsFor,
  formatCreated,
  idHash,
  mockDurationFor,
  nextHourToday,
  scheduledDateFor,
  scheduledLabelFor,
  slaStateFor,
  type SlaState,
} from '../lib/orderMeta.js';
import { buildDispatchNarrative } from '../lib/dispatchNarrative.js';
import { AddOrderDrawer } from '../components/AddOrderDrawer.js';
import { CancelOrderModal } from '../components/CancelOrderModal.js';
import { ReturnOrderModal } from '../components/ReturnOrderModal.js';
import { UpdateStatusModal, type UpdateStatusTarget } from '../components/UpdateStatusModal.js';
import { RescheduleModal } from '../components/RescheduleModal.js';
import { OrderDetailDrawer } from '../components/orderDetail/OrderDetailDrawer.js';

// ── Filter groups ───────────────────────────────────────────────────────────────
type FilterTab = 'unassigned' | 'dispatched' | 'finished' | 'all';

// Group → sub-statuses, mirroring the Figma status-filter dropdowns
// (Unassigned `606:138936`, Dispatched `608:74407`, Finished `852:166443`).
// Broadcasted is Unassigned; Assigned belongs to Dispatched (not Unassigned).
// Returned is Unassigned (the goods came back and need re-dispatching — no driver);
// `returning` (in-transit back) stays in Dispatched. Finished = terminal only.
const GROUP_STATUSES: Record<Exclude<FilterTab, 'all'>, OrderStatus[]> = {
  unassigned: ['scheduled', 'pending', 'broadcasted', 'returned'],
  dispatched: ['assigned', 'at-depot', 'in-transit', 'returning', 'arrived'],
  finished: ['delivered', 'cancelled'],
};

// Rows-per-page (Doc 3 §6): default 10, selector offers 10/25/50, and the
// choice persists per user across sessions (localStorage) — a dispatcher who
// picks 50 sees 50 next time they log in.
const PAGE_SIZE_OPTIONS = [10, 25, 50] as const;
const PAGE_SIZE_STORAGE_KEY = 'leta.playground.rowsPerPage';
function loadRowsPerPage(): number {
  if (typeof window === 'undefined') return 10;
  const stored = Number(window.localStorage.getItem(PAGE_SIZE_STORAGE_KEY));
  return (PAGE_SIZE_OPTIONS as readonly number[]).includes(stored) ? stored : 10;
}
// ── Optional columns (Columns control) ───────────────────────────────────────────
// Hidden by default — the Figma status tables don't render them. Toggled on from the
// Columns dropdown; any active extra splices in before Status and switches the table
// into horizontal-scroll mode (spec §4.3: pinned Order ID/Actions, middle scrolls).
// Both LAST_UPDATED_COLUMN and CREATED_BY_COLUMN are canonical presets from
// @leta/components — Created By renders the `user-cell` (avatar + name + email);
// the playground only supplies the per-row name/email/avatarSrc data (from the
// shared CREATORS mock in lib/orderMeta.ts — also used by the Order Detail drawer).
type ExtraColumnKey = 'lastUpdated' | 'createdBy';
const EXTRA_COLUMN_OPTIONS: { key: ExtraColumnKey; label: string }[] = [
  { key: 'lastUpdated', label: 'Last Updated' },
  { key: 'createdBy', label: 'Created By' },
];

function canDispatch(o: Order): boolean {
  return GROUP_STATUSES.unassigned.includes(o.status);
}

// ── Order action success/toast decision tree ────────────────────────────────
// Single source of truth: does a status still belong to the current
// filterTab/subStatus view? Lifted verbatim from `filtered`'s first two lines
// (the same "is this in view" check, already used twice in this file) so
// action handlers never re-derive status-group membership their own way.
function matchesCurrentView(status: OrderStatus, filterTab: FilterTab, subStatus: OrderStatus | null): boolean {
  if (filterTab !== 'all' && !GROUP_STATUSES[filterTab].includes(status)) return false;
  if (subStatus && status !== subStatus) return false;
  return true;
}

// Singular toast copy never leads with a count ("Order cancelled", not "1
// order cancelled"); plural keeps the count ("3 orders cancelled").
function pluralOrderCopy(n: number, verb: string, verbPast: string): { toastTitle: string; toastSubtitle: string } {
  return n === 1
    ? { toastTitle: `Order ${verb}`, toastSubtitle: `Your order has been ${verbPast}.` }
    : { toastTitle: `${n} orders ${verb}`, toastSubtitle: `Your orders have been ${verbPast}.` };
}

/** The filterTab/subStatus view a given status lives in — for a "View order(s)"
 *  CTA to navigate the dispatcher to where the acted-upon order(s) landed. */
function viewFor(status: OrderStatus): { filterTab: FilterTab; subStatus: OrderStatus } {
  const tab = (Object.keys(GROUP_STATUSES) as Exclude<FilterTab, 'all'>[]).find((t) =>
    GROUP_STATUSES[t].includes(status),
  )!;
  return { filterTab: tab, subStatus: status };
}

/** Mock trip id for Add to Trip — same `TRP-10x` pattern mockData.ts seeds. */
function mockTripId(h: number): string {
  return `TRP-${101 + (h % 8)}`;
}

// The Reschedule modal's opening state (OM §11.2 + 2026-07-17 changelog):
//  - anchor    → manual-field default: a single scheduled order uses its own
//    slot; unscheduled single / any bulk uses today's next full hour.
//  - chipBase  → what the +1h/+4h/+8h/tomorrow chips compute from: a single
//    order's own time; a bulk set computes from "now".
//  - noOp      → the value that would be a no-op (single scheduled order's time),
//    so the confirm starts disabled; null for unscheduled single / bulk.
//  - hasDriverHeld → any selected order is Assigned/At Depot → show the
//    "rescheduling will unassign orders from their current drivers" warning.
interface RescheduleData { anchor: Date; chipBase: Date; noOp: Date | null; hasDriverHeld: boolean }
function rescheduleData(selected: Order[]): RescheduleData {
  const single = selected.length === 1 ? selected[0]! : null;
  const scheduledSingle = single && single.status === 'scheduled' ? scheduledDateFor(single) : null;
  const anchor = scheduledSingle ?? nextHourToday();
  const chipBase = single ? anchor : new Date();
  const hasDriverHeld = selected.some((o) => o.status === 'assigned' || o.status === 'at-depot');
  return { anchor, chipBase, noOp: scheduledSingle, hasDriverHeld };
}

// Mock SLA state + duration (Table spec §2.3, Doc 4) now live in lib/orderMeta.ts —
// shared with the Order Detail drawer so the table and drawer show identical values.

// ── Sort (Table spec's Sort dropdown — Created / Duration / Last Updated) ───
// "Last Updated" has no distinct field in this mock data (the Last Updated
// *column* already just aliases createdAt too — see the cellByLabel map
// below), so it orders by the same value as Created; that's consistent with
// what's actually displayed, not a stand-in for a missing feature.
// Distance sorts by the real derived km (the same value the cell shows and the
// map draws), so "Low to High" / "High to Low" order by actual trip length.
type SortField = 'created' | 'duration' | 'lastUpdated' | 'distance';
const SORT_FIELDS: SortField[] = ['created', 'duration', 'lastUpdated', 'distance'];
function sortValueFor(o: Order, field: SortField, slaConfig: SlaConfig): number {
  if (field === 'distance') return distanceKmFor(o);
  if (field === 'duration') {
    const isFinished = o.status === 'delivered' || o.status === 'cancelled';
    return durationSecondsFor(o, slaConfig, isFinished);
  }
  return new Date(o.createdAt).getTime();
}

// ── Overlay model ────────────────────────────────────────────────────────────────
type OverlayKind = 'created' | 'filter' | 'sort' | 'importExport' | 'subStatus' | 'rowActions' | 'selection' | 'columns' | 'rowsPerPage' | 'bulkOverflow';
interface OverlayState {
  kind: OverlayKind;
  anchor: DOMRect | null;
  orderId?: string;
  /** The row's status — drives the per-status overflow menu (OM §12.5). */
  orderStatus?: OrderStatus;
  group?: Exclude<FilterTab, 'all'>;
}

// ── Per-status row overflow (⋯) menu (OM §12.5) ──────────────────────────────────
// The menu contents vary by lifecycle stage — divider-separated groups top→bottom,
// with a trailing destructive action (Cancel Order for Ready/Returned, Return Order
// once in transit). DesktopMenuOptions renders leading icons outlined automatically.
type RowMenuAction = { label: string; icon: IconName };
interface RowMenu { groups: RowMenuAction[][]; destructive?: RowMenuAction }

const VIEW_LOGS: RowMenuAction = { label: 'View Logs', icon: 'Document' };
const EDIT_ORDER: RowMenuAction = { label: 'Edit Order', icon: 'Edit' };
const ADD_TO_TRIP: RowMenuAction = { label: 'Add To Trip', icon: 'Add' };
const CHANGE_DRIVER: RowMenuAction = { label: 'Change Driver', icon: 'Swap' };
const UPDATE_STATUS_ACTION: RowMenuAction = { label: 'Update Status', icon: 'Update' };
const RESCHEDULE_ACTION: RowMenuAction = { label: 'Reschedule Order', icon: 'Calendar' };
const ADD_COMMENT: RowMenuAction = { label: 'Add Comment', icon: 'Comment' };
const CANCEL_ORDER_ACTION: RowMenuAction = { label: 'Cancel Order', icon: 'Delete' };
const RETURN_ORDER_ACTION: RowMenuAction = { label: 'Return Order', icon: 'Undo' };

function rowMenuFor(status: OrderStatus): RowMenu {
  switch (status) {
    case 'in-transit':
    case 'arrived':
      // Moving — no edit/reschedule/cancel; the recourse is Return.
      return { groups: [[VIEW_LOGS, UPDATE_STATUS_ACTION], [ADD_COMMENT]], destructive: RETURN_ORDER_ACTION };
    case 'returning':
      // Coming back — read-only apart from a comment; no destructive action.
      return { groups: [[VIEW_LOGS], [ADD_COMMENT]] };
    case 'assigned':
    case 'at-depot':
      // A driver holds it at the depot — adds Change Driver; still fully editable.
      return { groups: [[VIEW_LOGS, EDIT_ORDER, ADD_TO_TRIP, CHANGE_DRIVER, UPDATE_STATUS_ACTION], [RESCHEDULE_ACTION, ADD_COMMENT]], destructive: CANCEL_ORDER_ACTION };
    case 'returned':
      // Holding bay — the Ready menu MINUS Update Status: Mark as Delivered/Pending
      // are both invalid on a returned order (OM §10.1 / §12.6, Ruled 2026-07-20;
      // verified against Figma `1213:97251`).
      return { groups: [[VIEW_LOGS, EDIT_ORDER, ADD_TO_TRIP], [RESCHEDULE_ACTION, ADD_COMMENT]], destructive: CANCEL_ORDER_ACTION };
    default:
      // Ready (Scheduled/Pending/Broadcasted) share the 7-item menu.
      return { groups: [[VIEW_LOGS, EDIT_ORDER, ADD_TO_TRIP, UPDATE_STATUS_ACTION], [RESCHEDULE_ACTION, ADD_COMMENT]], destructive: CANCEL_ORDER_ACTION };
  }
}

// ── Bulk Actions toolbar — per-status action gating ─────────────────────────
// Doc 1 §12.9: bulk operations are "limited to actions valid for every selected
// row's status" — so (unlike the row ⋯ menu, which is per-row) the toolbar's
// fixed buttons + overflow are the INTERSECTION of what each selected order's
// status allows, not a fixed static set. Mirrors the drawer-footer action sets
// (§12.7) minus Edit Order (not bulk-friendly — one order at a time).
type BulkAction = 'cancel' | 'return' | 'addToTrip' | 'changeDriver' | 'dispatch' | 'updateStatus' | 'reschedule';
// Left-to-right render order in the bulk toolbar, matching the Figma per-status
// Multi-Select wireframes: the forward/progress actions come first (Dispatch ·
// Add To Trip · Change Driver · Update Status), then the destructive ones on the
// right (Cancel Order · Return Order) — the opposite of the drawer footer, which
// puts destructive far-left. Update Status precedes Return so In Transit / Arrived
// read "Update Status · Return Order". `reschedule` is overflow-only (never a fixed
// toolbar button) but MUST appear here so the `intersect` below preserves it — it
// sits after `updateStatus` so the ⋯ menu reads "Update Status · Reschedule Order".
const BULK_ACTION_ORDER: BulkAction[] = ['dispatch', 'addToTrip', 'changeDriver', 'updateStatus', 'reschedule', 'cancel', 'return'];

function bulkActionsForStatus(status: OrderStatus): { fixed: BulkAction[]; overflow: BulkAction[] } {
  switch (status) {
    case 'in-transit':
    case 'arrived':
      // Moving — the only recourse is Update Status or Return; no overflow menu
      // (Figma: toolbar = Update Status · Return Order, no ⋯).
      return { fixed: ['updateStatus', 'return'], overflow: [] };
    case 'returning':
    case 'delivered':
    case 'cancelled':
      // Coming back / terminal — no bulk actions apply.
      return { fixed: [], overflow: [] };
    case 'assigned':
    case 'at-depot':
      // A driver already holds it — Change Driver replaces Dispatch (Figma:
      // toolbar = Add To Trip · Change Driver · Cancel Order; ⋯ = Update Status ·
      // Reschedule Order).
      return { fixed: ['cancel', 'addToTrip', 'changeDriver'], overflow: ['updateStatus', 'reschedule'] };
    case 'returned':
      // Holding bay — like Ready (Dispatch · Add To Trip · Cancel Order) but its ⋯
      // overflow is Reschedule Order ONLY: Update Status is excluded on Returned
      // (OM §10.1 / §12.6; verified against Figma `1433:102001`).
      return { fixed: ['cancel', 'addToTrip', 'dispatch'], overflow: ['reschedule'] };
    default:
      // Ready (Scheduled/Pending/Broadcasted) — Figma: toolbar = Dispatch · Add To
      // Trip · Cancel Order; ⋯ = Update Status · Reschedule Order.
      return { fixed: ['cancel', 'addToTrip', 'dispatch'], overflow: ['updateStatus', 'reschedule'] };
  }
}

function bulkActionsForSelection(selected: Order[]): { fixed: BulkAction[]; overflow: BulkAction[] } {
  if (selected.length === 0) return { fixed: [], overflow: [] };
  const perOrder = selected.map((o) => bulkActionsForStatus(o.status));
  const intersect = (key: 'fixed' | 'overflow'): BulkAction[] =>
    BULK_ACTION_ORDER.filter((a) => perOrder.every((p) => p[key].includes(a)));
  return { fixed: intersect('fixed'), overflow: intersect('overflow') };
}

// Enter/exit motion for the floating Bulk Actions toolbar (slides up in / down out).
const BULKBAR_STYLE_ID = 'leta-bulkbar-motion';
const BULKBAR_CSS = `
@keyframes leta-bulkbar-in  { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
@keyframes leta-bulkbar-out { from { opacity: 1; transform: translateY(0); } to { opacity: 0; transform: translateY(16px); } }
@keyframes leta-table-in    { from { opacity: 0; } to { opacity: 1; } }
.leta-bulkbar-enter { animation: leta-bulkbar-in 200ms cubic-bezier(0.16, 1, 0.3, 1); }
.leta-bulkbar-exit  { animation: leta-bulkbar-out 180ms cubic-bezier(0.4, 0, 1, 1) forwards; }
@media (prefers-reduced-motion: reduce) { .leta-bulkbar-enter, .leta-bulkbar-exit { animation: none; } }
`;
function ensureBulkbarStyles(): void {
  if (typeof document === 'undefined' || document.getElementById(BULKBAR_STYLE_ID)) return;
  const el = document.createElement('style');
  el.id = BULKBAR_STYLE_ID;
  el.textContent = BULKBAR_CSS;
  document.head.appendChild(el);
}

// Synthetic "incoming" orders injected while the Auto-refresh switch is on
// (simulates live orders flowing into the table, like the server-driven console).
// Cycled by index; capped by AUTO_REFRESH_MAX so a left-on demo doesn't grow
// unbounded — past the cap, ticks still flash the table (re-pull) without adding.
const AUTO_REFRESH_MAX = 12;
const AUTO_REFRESH_ORDERS: NewOrderInput[] = [
  { customer: 'Brian Otieno', phone: '+254 733 010 201', depot: 'Westlands Fulfillment Hub', pickup: { label: '23 Ring Rd, Westlands, Nairobi', lat: -1.2683, lng: 36.808 }, dropoff: { label: '5 Peponi Rd, Spring Valley, Nairobi', lat: -1.246, lng: 36.783 }, package: 'Pharmacy delivery', items: 1, priority: 'express' },
  { customer: 'Wanjiku Mwangi', phone: '+254 722 010 202', depot: 'Arc Kitisuru Depot', pickup: { label: '14 Kitisuru Rd, Kitisuru, Nairobi', lat: -1.242, lng: 36.777 }, dropoff: { label: '12 Riara Rd, Kilimani, Nairobi', lat: -1.293, lng: 36.782 }, package: 'Grocery order', items: 3, priority: 'standard' },
  { customer: 'Samuel Kariuki', phone: '+254 711 010 203', depot: 'Industrial Area Depot', pickup: { label: '9 Enterprise Rd, Industrial Area, Nairobi', lat: -1.308, lng: 36.851 }, dropoff: { label: '44 Ngong Rd, Dagoretti, Nairobi', lat: -1.301, lng: 36.76 }, package: 'Auto parts', items: 2, priority: 'standard' },
  { customer: 'Halima Abdi', phone: '+254 720 010 204', depot: 'Westlands Fulfillment Hub', pickup: { label: '23 Ring Rd, Westlands, Nairobi', lat: -1.2683, lng: 36.808 }, dropoff: { label: '2 Limuru Rd, Gigiri, Nairobi', lat: -1.233, lng: 36.812 }, package: 'Documents', items: 1, priority: 'express' },
];

export function OrdersPage(): React.ReactElement {
  ensureBulkbarStyles();
  const orders = useStore((s) => s.orders);
  const drivers = useStore((s) => s.drivers);
  const getDriver = useStore((s) => s.getDriver);
  const updateOrderStatus = useStore((s) => s.updateOrderStatus);
  const updateOrder = useStore((s) => s.updateOrder);
  const assignOrder = useStore((s) => s.assignOrder);
  const cancelOrder = useStore((s) => s.cancelOrder);
  const returnOrder = useStore((s) => s.returnOrder);
  const recordOrderEdit = useStore((s) => s.recordOrderEdit);
  const rebroadcastOrder = useStore((s) => s.rebroadcastOrder);
  const exhaustBroadcast = useStore((s) => s.exhaustBroadcast);
  const pushToast = useStore((s) => s.pushToast);
  const addOrder = useStore((s) => s.addOrder);
  // Active client config — drives the Add Order drawer's fields/sections.
  const clientConfig = useStore((s) => s.client.config);

  // Optional columns from the Columns control (all off by default = the Figma tables).
  // Extras just join the flex-fill; the table (scrollX="auto", spec §4.3) flips to
  // h-scroll + pinned anchors ONLY if the column minimums exceed the container.
  const [extraCols, setExtraCols] = React.useState<Record<ExtraColumnKey, boolean>>({
    lastUpdated: false,
    createdBy: false,
  });
  const [filterTab, setFilterTab] = React.useState<FilterTab>('unassigned');
  // Default Unassigned view = the Scheduled sub-status (shows the badge), per Figma.
  const [subStatus, setSubStatus] = React.useState<OrderStatus | null>('scheduled');
  const [page, setPage] = React.useState(1);
  // Selection is keyed by order ID and persists across pages (the bulk toolbar +
  // its "N selected" overlay manage selections from every page, not just the
  // current one). The Table's own index-based selection is re-seeded per page
  // from this set (see the Table `key` + each row's `selected` flag).
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(() => new Set());
  const [tableKey, setTableKey] = React.useState(0);
  const [createdLabel, setCreatedLabel] = React.useState('Created: Today');
  // Live search query — matches Order ID, recipient name, or recipient phone.
  const [search, setSearch] = React.useState('');
  // The Filter Group (Doc 3 §9): `appliedFilters` is what actually narrows the
  // table (AND across dimensions); `draftFilters` is the panel's live/uncommitted
  // selection while it's open, only committed to `appliedFilters` on "Show
  // Results" — checking boxes must not reflow the table on every tick. Both are
  // keyed by dimension LABEL (not index) since which dimensions exist varies by
  // status view/client. `filterPreviewCount` is what the footer's "N results"
  // shows while the panel is open — a live preview of `draftFilters`, computed
  // against the status-scoped order pool (independent of the free-text search).
  const [appliedFilters, setAppliedFilters] = React.useState<Record<string, Set<string>>>({});
  const [draftFilters, setDraftFilters] = React.useState<Record<string, Set<string>>>({});
  const [filterPreviewCount, setFilterPreviewCount] = React.useState(0);
  // Sort — null field = no active sort (the natural order); only becomes active
  // once the user actually picks a field/direction from the Sort dropdown, so
  // opening it doesn't silently reorder the table the user hasn't touched yet.
  const [sortFieldIndex, setSortFieldIndex] = React.useState<number | null>(null);
  const [sortDir, setSortDir] = React.useState<'asc' | 'desc'>('desc');
  // Rows-per-page (Doc 3 §6) — seeded from the persisted per-user choice;
  // changing it re-paginates from page 1 and persists for future sessions.
  const [rowsPerPage, setRowsPerPage] = React.useState<number>(loadRowsPerPage);
  const handleRowsPerPage = (size: number) => {
    setRowsPerPage(size);
    setPage(1);
    try { window.localStorage.setItem(PAGE_SIZE_STORAGE_KEY, String(size)); } catch { /* private mode */ }
  };
  // The Orders view boots into the Empty State (wireframe 1176:171818); the
  // populated table appears only after a load is triggered (Import).
  const [loaded, setLoaded] = React.useState(false);
  // Loading pattern (applies going forward, not just here): a FIRST load, with
  // nothing to show yet, blocks behind the page-level LoadingOverlay scrim — the
  // LETA loader holds until it completes a full animation cycle, then the table
  // reveals. A SUBSEQUENT update to already-visible content (filter, sort, tab
  // switch, table refresh) never uses that scrim — it shows Skeleton rows in the
  // table region only, so the toolbars/search/filters stay mounted and fully
  // usable throughout. These are two distinct pieces of state on purpose: they
  // drive different visual treatments and can't be unified into one boolean.
  const [firstLoading, setFirstLoading] = React.useState(false);
  const firstLoadTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const runFirstLoad = () => {
    if (firstLoading) return;
    setFirstLoading(true);
    firstLoadTimer.current = setTimeout(() => {
      setFirstLoading(false);
      setLoaded(true);
      setTableKey((k) => k + 1);
    }, 2000);
  };
  // Every "subsequent update" trigger shares this one flash — status/sub-status
  // switch, Filter Group apply, sort pick, search (debounced), and the manual
  // Refresh button. Restarts the timer rather than ignoring a re-trigger (e.g.
  // picking a sort field then a direction in quick succession still reflects
  // the latest action) — the trailing tableKey bump remounts the real Table
  // (replaying its enter animation, reseeding index-based selection) exactly
  // when the Skeleton swaps back out, not before.
  const [tableRefreshing, setTableRefreshing] = React.useState(false);
  const tableRefreshTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const flashTableLoading = (duration = 450) => {
    if (tableRefreshTimer.current) clearTimeout(tableRefreshTimer.current);
    setTableRefreshing(true);
    tableRefreshTimer.current = setTimeout(() => {
      tableRefreshTimer.current = null;
      setTableRefreshing(false);
      setTableKey((k) => k + 1);
    }, duration);
  };
  // Auto-refresh (Table Data Control switch — replaces the old manual Refresh
  // button; default OFF per design). When ON, orders auto-refresh into the
  // table: on an interval we inject a fresh pending order (up to a cap) and
  // flash the table, simulating live incoming orders. Toggling off / unmounting
  // stops the interval.
  const [autoRefresh, setAutoRefresh] = React.useState(false);
  const autoAddedRef = React.useRef(0);
  React.useEffect(() => {
    if (!autoRefresh || !loaded) return;
    const timer = setInterval(() => {
      if (autoAddedRef.current < AUTO_REFRESH_MAX) {
        const sample = AUTO_REFRESH_ORDERS[autoAddedRef.current % AUTO_REFRESH_ORDERS.length]!;
        addOrder({ ...sample, status: 'pending' });
        autoAddedRef.current += 1;
      }
      flashTableLoading(450);
    }, 9000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefresh, loaded]);
  // Add Order — opens the config-aware side drawer (empty-state CTA + toolbar both
  // route here). Submitting creates the order, reveals the table, and toasts.
  const [addOrderOpen, setAddOrderOpen] = React.useState(false);
  const handleAddOrder = () => setAddOrderOpen(true);
  const handleOrderCreated = (input: NewOrderInput, scheduled: boolean) => {
    const created = addOrder(input);
    setAddOrderOpen(false);
    // Land the new order in the view it belongs to so it's visible.
    setFilterTab('unassigned');
    setSubStatus(scheduled ? 'scheduled' : 'pending');
    setPage(1);
    setLoaded(true);
    setTableKey((k) => k + 1);
    pushToast({
      type: 'success',
      title: 'Order created',
      subtitle: scheduled ? 'Your order is scheduled for delivery.' : 'Your order is ready for dispatch.',
      cta: {
        label: 'View Order',
        onClick: () => setViewOrderId(created.id),
      },
    });
  };
  // Order Detail drawer (OM §7 / wireframes 320:99590) — opened by clicking a
  // table row (§3.1) or the "Order created" toast's View Order CTA.
  const [viewOrderId, setViewOrderId] = React.useState<string | null>(null);
  // When an "Add Comment" entry point opens the drawer, this holds that order id so
  // the drawer opens straight into the Activity tab with the composer expanded.
  // Cleared on close (and never matches a plain row-click open of the same order).
  const [commentIntentOrderId, setCommentIntentOrderId] = React.useState<string | null>(null);
  const openOrderForComment = React.useCallback((id: string) => {
    setViewOrderId(id);
    setCommentIntentOrderId(id);
  }, []);
  // "View Logs" (row ⋯ menu + the Finished table's Actions button) opens the
  // drawer straight into the Dispatch Logs tab — same intent pattern as
  // Add Comment above.
  const [dispatchLogsIntentOrderId, setDispatchLogsIntentOrderId] = React.useState<string | null>(null);
  const openOrderForDispatchLogs = React.useCallback((id: string) => {
    setViewOrderId(id);
    setDispatchLogsIntentOrderId(id);
  }, []);
  // Externally-driven drawer skeleton (§9) — set briefly whenever an action's
  // outcome keeps the View Order drawer open, so the refreshed data reads as
  // "just fetched" rather than silently swapping in place.
  const [drawerLoading, setDrawerLoading] = React.useState(false);
  const drawerLoadingTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const flashDrawerLoading = (duration = 450) => {
    if (drawerLoadingTimer.current) clearTimeout(drawerLoadingTimer.current);
    setDrawerLoading(true);
    drawerLoadingTimer.current = setTimeout(() => {
      drawerLoadingTimer.current = null;
      setDrawerLoading(false);
    }, duration);
  };
  React.useEffect(() => () => {
    if (firstLoadTimer.current) clearTimeout(firstLoadTimer.current);
    if (tableRefreshTimer.current) clearTimeout(tableRefreshTimer.current);
    if (drawerLoadingTimer.current) clearTimeout(drawerLoadingTimer.current);
  }, []);
  const [overlay, setOverlay] = React.useState<OverlayState | null>(null);

  // Live duration timer — recompute each second; `duration` cells re-render.
  const [, setTick] = React.useState(0);
  React.useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // Bulk toolbar mount lifecycle — keep it mounted briefly after deselect so its
  // exit animation can play before unmount.
  const bulkVisible = selectedIds.size > 0;
  const [bulkMounted, setBulkMounted] = React.useState(false);
  React.useEffect(() => {
    if (bulkVisible) { setBulkMounted(true); return; }
    if (!bulkMounted) return;
    const t = setTimeout(() => setBulkMounted(false), 200);
    return () => clearTimeout(t);
  }, [bulkVisible, bulkMounted]);

  // Close the "N selected" overlay once nothing is selected (its anchor — the
  // toolbar — is gone, and an empty list has nothing to manage).
  React.useEffect(() => {
    if (selectedIds.size === 0) setOverlay((o) => (o?.kind === 'selection' ? null : o));
  }, [selectedIds]);

  // ── Filtering + pagination ─────────────────────────────────────────────────
  // Search debounces ~300ms after the last keystroke (Doc 3 §8) before it
  // actually re-filters — `search` itself stays instant (the field's own typed
  // value), only the value that drives `query`/the Skeleton flash is delayed.
  const [debouncedSearch, setDebouncedSearch] = React.useState('');
  const searchDebounceTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  React.useEffect(() => {
    if (searchDebounceTimer.current) clearTimeout(searchDebounceTimer.current);
    searchDebounceTimer.current = setTimeout(() => setDebouncedSearch(search), 300);
    return () => { if (searchDebounceTimer.current) clearTimeout(searchDebounceTimer.current); };
  }, [search]);
  // Search matches the field's promise ("Search orders by ID or recipient"):
  // Order ID, recipient name, or recipient phone — case-insensitive substring;
  // phones compare digits-only so "0712 345" matches "+254 712 345 678".
  const query = debouncedSearch.trim().toLowerCase();
  const queryDigits = query.replace(/\D/g, '');

  // Orders in the current status view (filterTab + subStatus), before search or
  // the Filter Group — the pool the filter dimensions' option lists and live
  // preview count are drawn from.
  const ordersInView = React.useMemo(
    () => orders.filter((o) => (filterTab === 'all' || GROUP_STATUSES[filterTab].includes(o.status)) && (!subStatus || o.status === subStatus)),
    [orders, filterTab, subStatus],
  );

  // AND-across-dimensions predicate for the Filter Group's applied selections.
  const matchesFilters = React.useCallback((o: Order, filters: Record<string, Set<string>>): boolean => {
    if (filters['Recipient']?.size && !filters['Recipient'].has(o.customer)) return false;
    if (filters['Created By']?.size && !filters['Created By'].has(creatorLabelFor(o))) return false;
    if (filters['Depot']?.size) {
      const name = depotForOrder(o, clientConfig.depots)?.name;
      if (!name || !filters['Depot'].has(name)) return false;
    }
    if (filters['Driver']?.size) {
      const name = getDriver(o.driverId)?.name;
      if (!name || !filters['Driver'].has(name)) return false;
    }
    return true;
  }, [clientConfig.depots, getDriver]);

  // Filter Group dimensions — Recipient + Created By always; Depot only for a
  // multi-depot client (single-depot clients have nothing to filter by there —
  // every order shows the same one); Driver only where orders actually have an
  // assigned driver (Dispatched/Finished — Unassigned has none yet, All mixes
  // too many statuses to stay meaningful).
  const filterGroups = React.useMemo(() => {
    const dims: { label: string; options: string[] }[] = [];
    dims.push({ label: 'Recipient', options: [...new Set(ordersInView.map((o) => o.customer))] });
    dims.push({ label: 'Created By', options: [...new Set(ordersInView.map(creatorLabelFor))] });
    if (clientConfig.depots.length > 1) {
      dims.push({ label: 'Depot', options: clientConfig.depots.map((d) => d.name) });
    }
    if (filterTab === 'dispatched' || filterTab === 'finished') {
      const driverNames = [...new Set(ordersInView.map((o) => getDriver(o.driverId)?.name).filter((n): n is string => Boolean(n)))];
      if (driverNames.length) dims.push({ label: 'Driver', options: driverNames });
    }
    return dims;
  }, [ordersInView, clientConfig.depots, filterTab, getDriver]);

  const filtered = React.useMemo(() => {
    return orders.filter((o) => {
      if (filterTab !== 'all' && !GROUP_STATUSES[filterTab].includes(o.status)) return false;
      if (subStatus && o.status !== subStatus) return false;
      if (!matchesFilters(o, appliedFilters)) return false;
      if (query) {
        const idMatch = o.id.toLowerCase().includes(query);
        const nameMatch = o.customer.toLowerCase().includes(query);
        // Local-format queries ("0712...") also match the stored international
        // form ("+254 712...") — retry without the leading 0.
        const phoneDigits = o.phone.replace(/\D/g, '');
        const phoneMatch =
          queryDigits.length > 0 &&
          (phoneDigits.includes(queryDigits) ||
            (queryDigits.startsWith('0') && phoneDigits.includes(queryDigits.slice(1))));
        if (!idMatch && !nameMatch && !phoneMatch) return false;
      }
      return true;
    });
  }, [orders, filterTab, subStatus, query, queryDigits, matchesFilters, appliedFilters]);

  // Sort — applied on top of the filtered set, ahead of pagination; the count
  // (`filtered.length`) and dimension option lists are unaffected by it.
  const sortedFiltered = React.useMemo(() => {
    if (sortFieldIndex == null) return filtered;
    const field = SORT_FIELDS[sortFieldIndex]!;
    const dir = sortDir === 'asc' ? 1 : -1;
    return [...filtered].sort((a, b) => (sortValueFor(a, field, clientConfig.sla) - sortValueFor(b, field, clientConfig.sla)) * dir);
  }, [filtered, sortFieldIndex, sortDir, clientConfig.sla]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const clampedPage = Math.min(page, pageCount);
  const pageOrders = sortedFiltered.slice((clampedPage - 1) * rowsPerPage, clampedPage * rowsPerPage);

  // Status/sub-status switch (Doc 3 §9's "tab switch") — reset page + clear
  // selection immediately, but the Skeleton flash owns the actual table
  // remount (see `flashTableLoading`): it lands at the end of the flash, not
  // the moment the tab changes, so the swap-back and the flash finishing
  // coincide instead of remounting the (still-hidden) Table early.
  React.useEffect(() => {
    setPage(1);
    setSelectedIds(new Set());
    flashTableLoading();
  }, [filterTab, subStatus]);

  // Which dimensions exist depends on the status view — a filter applied on one
  // view (e.g. a Driver selection while in Dispatched) has no meaning on another
  // (Unassigned has no Driver dimension at all), so switching views clears both
  // the applied and draft filter state.
  React.useEffect(() => {
    setAppliedFilters({});
    setDraftFilters({});
  }, [filterTab, subStatus]);

  // On (debounced) search change: back to page 1; the Skeleton flash owns the
  // table remount that reseeds the Table's index-based internal selection
  // against the new row slice. Selection itself is KEPT (it's ID-based across
  // pages) — matching rows stay checked, and orders filtered out of view
  // remain selected in the bulk toolbar.
  React.useEffect(() => {
    setPage(1);
    flashTableLoading();
  }, [query]);

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  // Merge the current page's index-based selection (from the Table) into the
  // page-spanning `selectedIds`: drop this page's old ids, add its selected ones.
  const handleSelectionChange = (indices: number[]) => {
    const pageIds = pageOrders.map((o) => o.id);
    const pageIdSet = new Set(pageIds);
    const nowSelected = new Set(
      indices.map((i) => pageOrders[i]?.id).filter((id): id is string => Boolean(id)),
    );
    setSelectedIds((prev) => {
      const next = new Set([...prev].filter((id) => !pageIdSet.has(id)));
      nowSelected.forEach((id) => next.add(id));
      return next;
    });
  };

  // Remove one order from the selection (the overlay's uncheck action). The
  // Table re-syncs its own checkboxes from `selectedIds` — no remount needed.
  const deselect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  // ── Per-status counts (for the sub-status dropdown) ─────────────────────────
  const countByStatus = React.useMemo(() => {
    const m = {} as Record<OrderStatus, number>;
    orders.forEach((o) => { m[o.status] = (m[o.status] ?? 0) + 1; });
    return m;
  }, [orders]);


  // ── Actions ────────────────────────────────────────────────────────────────
  // The shared decision tree (single source of truth for every order action):
  // did the order(s) leave the user's current view?
  //   YES → close the drawer (if it was showing one of these orders), refresh
  //         the table, toast WITH a "View order(s)"-style CTA.
  //   NO  → keep the drawer open, quietly re-flow the table in the background
  //         (no visible flash — nothing changed the visible rows), toast
  //         WITHOUT a CTA. If the drawer was open, flash its own skeleton so
  //         the refreshed data reads as "just fetched".
  // Every bulk action here applies ONE uniform target status to the whole
  // selection, so this is a single yes/no check, never a per-order split.
  interface ActionOutcomeCta {
    kind: 'view-order' | 'view-orders' | 'view-trip';
    label: string;
    targetOrderId?: string;
    targetFilterTab?: FilterTab;
    targetSubStatus?: OrderStatus | null;
  }
  const resolveActionOutcome = (opts: {
    orderIds: string[];
    newStatus: OrderStatus;
    toastType?: 'success' | 'warning' | 'error';
    toastTitle: string;
    toastSubtitle: string;
    cta?: ActionOutcomeCta;
    /** Cancel Order's documented exception — never shows a CTA, regardless of view. */
    suppressCta?: boolean;
  }) => {
    const leftView = !matchesCurrentView(opts.newStatus, filterTab, subStatus);
    const drawerWasOpen = viewOrderId != null && opts.orderIds.includes(viewOrderId);
    if (leftView) {
      if (drawerWasOpen) setViewOrderId(null);
      flashTableLoading();
    } else if (drawerWasOpen) {
      flashDrawerLoading();
    }
    const cta = opts.cta;
    pushToast({
      type: opts.toastType ?? 'success',
      title: opts.toastTitle,
      subtitle: opts.toastSubtitle,
      cta: !opts.suppressCta && leftView && cta
        ? {
            label: cta.label,
            onClick: () => {
              if (cta.targetFilterTab !== undefined) {
                setFilterTab(cta.targetFilterTab);
                setSubStatus(cta.targetSubStatus ?? null);
              }
              if (cta.kind !== 'view-orders' && cta.targetOrderId) setViewOrderId(cta.targetOrderId);
              setPage(1);
              flashTableLoading();
            },
          }
        : undefined,
    });
  };

  const dispatchOrder = (orderId: string) => {
    updateOrderStatus(orderId, 'broadcasted');
    resolveActionOutcome({
      orderIds: [orderId],
      newStatus: 'broadcasted',
      toastTitle: 'Order dispatched',
      toastSubtitle: `${orderId} is now broadcasted to nearby drivers.`,
      cta: { kind: 'view-order', label: 'View Order', targetOrderId: orderId, ...viewFor('broadcasted') },
    });
  };

  const selectedOrders = (): Order[] => orders.filter((o) => selectedIds.has(o.id));

  const bulkDispatch = () => {
    const ids = selectedOrders().filter(canDispatch).map((o) => o.id);
    if (ids.length === 0) return;
    ids.forEach((id) => updateOrderStatus(id, 'broadcasted'));
    resolveActionOutcome({
      orderIds: ids,
      newStatus: 'broadcasted',
      ...pluralOrderCopy(ids.length, 'dispatched', 'dispatched'),
      cta: { kind: 'view-orders', label: 'View Orders', ...viewFor('broadcasted') },
    });
    clearSelection();
  };

  // Cancel Order (row + bulk) is destructive and irreversible — Doc 3 §5
  // rules this "required, no exceptions". Both entry points open the Cancel
  // Order modal (Figma `1382:104119`): reason checkboxes + optional note,
  // destructive confirm disabled until ≥1 reason ("Other" additionally
  // requires the note, OM §11.1). Cancel is the one documented exception to
  // the decision tree's generic CTA rule — it NEVER shows a "View order" CTA,
  // even when the order stays in view (the dispatcher doesn't want to revisit
  // an order they just cancelled).
  const [cancelConfirm, setCancelConfirm] = React.useState<string[] | null>(null);
  const requestCancel = (ids: string[]) => setCancelConfirm(ids);
  const confirmCancel = (reasons: string[], note: string) => {
    const ids = cancelConfirm ?? [];
    ids.forEach((id) => cancelOrder(id, reasons, note));
    setCancelConfirm(null);
    if (ids.length === 0) return;
    resolveActionOutcome({
      orderIds: ids,
      newStatus: 'cancelled',
      suppressCta: true,
      ...pluralOrderCopy(ids.length, 'cancelled', 'cancelled'),
    });
    if (ids.length > 1) clearSelection();
  };
  const bulkCancel = () => requestCancel(selectedOrders().map((o) => o.id));

  // Return Order (§11.3) — a dispatcher marking an in-progress order for
  // return, distinct from a driver failing the delivery from the Driver App.
  // Same reason-capture-then-confirm shape as Cancel Order, sharing the modal
  // across the row ⋯ menu, the bulk toolbar, and the View drawer footer.
  const [returnConfirm, setReturnConfirm] = React.useState<string[] | null>(null);
  const requestReturn = (ids: string[]) => setReturnConfirm(ids);
  const confirmReturn = (reason: string) => {
    const ids = returnConfirm ?? [];
    ids.forEach((id) => returnOrder(id, reason));
    setReturnConfirm(null);
    if (ids.length === 0) return;
    resolveActionOutcome({
      orderIds: ids,
      newStatus: 'returning',
      ...pluralOrderCopy(ids.length, 'marked for return', 'marked for return'),
      cta: { kind: 'view-orders', label: 'View Orders', ...viewFor('returning') },
    });
    if (ids.length > 1) clearSelection();
  };
  const bulkReturn = () => requestReturn(selectedOrders().map((o) => o.id));

  // Update Status (OM §12.6) + Reschedule (OM §11.2) — both reachable from the row
  // ⋯ menu (1 order) and the bulk toolbar's ⋯ (N selected). Each holds the order
  // id(s) awaiting the modal; the modals themselves are rendered once, below.
  const [updateStatusFor, setUpdateStatusFor] = React.useState<string[] | null>(null);
  const [rescheduleFor, setRescheduleFor] = React.useState<string[] | null>(null);
  const requestUpdateStatus = (ids: string[]) => setUpdateStatusFor(ids);
  const requestReschedule = (ids: string[]) => setRescheduleFor(ids);
  // Frozen at open time (keyed on the selection) so the bulk "chips-from-now"
  // base + the 1s duration tick don't shift the suggestions while the modal is open.
  const rescheduleInfo = React.useMemo(
    () => (rescheduleFor ? rescheduleData(orders.filter((o) => rescheduleFor.includes(o.id))) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- freeze on open; orders is current at that moment
    [rescheduleFor],
  );
  const confirmUpdateStatus = (target: UpdateStatusTarget) => {
    const ids = updateStatusFor ?? [];
    ids.forEach((id) => updateOrderStatus(id, target));
    setUpdateStatusFor(null);
    if (ids.length === 0) return;
    // Toast subtitle names the target status (wireframe 1408:237553 / 1239:108227).
    // Single → "View order" reopens that exact order's drawer; multiple →
    // "View orders" only navigates to the destination table (never reopens a
    // specific drawer), per spec.
    resolveActionOutcome({
      orderIds: ids,
      newStatus: target,
      toastTitle: pluralOrderCopy(ids.length, 'updated', '').toastTitle,
      toastSubtitle: `Your order${ids.length === 1 ? ' has' : 's have'} been marked as ${target}.`,
      cta:
        ids.length === 1
          ? { kind: 'view-order', label: 'View Order', targetOrderId: ids[0], ...viewFor(target) }
          : { kind: 'view-orders', label: 'View Orders', ...viewFor(target) },
    });
    if (ids.length > 1) clearSelection();
  };
  const confirmReschedule = () => {
    // Reschedule → the order lands in Scheduled (OM §11.2). The picked date is
    // captured by the modal; the mock store tracks status only, so we move each
    // to 'scheduled' and report the outcome.
    const ids = rescheduleFor ?? [];
    ids.forEach((id) => updateOrderStatus(id, 'scheduled'));
    setRescheduleFor(null);
    if (ids.length === 0) return;
    resolveActionOutcome({
      orderIds: ids,
      newStatus: 'scheduled',
      ...pluralOrderCopy(ids.length, 'rescheduled', 'rescheduled'),
      cta:
        ids.length === 1
          ? { kind: 'view-order', label: 'View Order', targetOrderId: ids[0], ...viewFor('scheduled') }
          : { kind: 'view-orders', label: 'View Orders', ...viewFor('scheduled') },
    });
    if (ids.length > 1) clearSelection();
  };

  // Add to Trip — assigns a mock available driver + trip id (reuses the store's
  // existing `assignOrder`, which already transitions the order to 'assigned').
  // Change Driver — reassigns to a different mock driver WITHOUT touching
  // status (deliberately NOT `assignOrder`, which force-resets status to
  // 'assigned' even mid-trip — out of scope to fix store-wide here).
  const addToTrip = (orderId: string) => {
    const order = orders.find((o) => o.id === orderId);
    if (!order) return;
    const driver = drivers.find((d) => d.status === 'available') ?? drivers[0];
    if (!driver) return;
    const tripId = mockTripId(idHash(orderId));
    assignOrder(orderId, driver.id);
    updateOrder(orderId, { tripId });
    resolveActionOutcome({
      orderIds: [orderId],
      newStatus: 'assigned',
      toastTitle: `Order added to ${tripId}`,
      toastSubtitle: 'Your order has been moved to a new trip.',
      cta: { kind: 'view-trip', label: 'View Trip', targetOrderId: orderId, ...viewFor('assigned') },
    });
  };
  const bulkAddToTrip = () => {
    const targets = selectedOrders().filter(canDispatch);
    if (targets.length === 0) return;
    const driver = drivers.find((d) => d.status === 'available') ?? drivers[0];
    if (!driver) return;
    const tripId = mockTripId(idHash(targets[0]!.id));
    targets.forEach((o) => {
      assignOrder(o.id, driver.id);
      updateOrder(o.id, { tripId });
    });
    resolveActionOutcome({
      orderIds: targets.map((o) => o.id),
      newStatus: 'assigned',
      toastTitle: `${targets.length} orders added to ${tripId}`,
      toastSubtitle: 'Your orders have been moved to a new trip.',
      cta: { kind: 'view-trip', label: 'View Trip', ...viewFor('assigned') },
    });
    clearSelection();
  };
  /**
   * The live broadcast sequence ran to its end with nobody accepting. The order
   * drops back to Pending, where Dispatch Logs shows its Exhausted shape and the
   * Re-broadcast action. No toast — the dispatcher is already looking at the tab
   * that explains it, and a sequence timing out is not an action they took.
   */
  const handleBroadcastExhausted = React.useCallback(
    (orderId: string) => {
      exhaustBroadcast(orderId);
    },
    [exhaustBroadcast],
  );

  /**
   * Dispatcher re-broadcast from the Dispatch Logs tab's Exhausted card. Puts the
   * order back out on a live sequence (Pending → Broadcasted), which also adds
   * the "{dispatcher} rebroadcasted the order" Activity entry.
   */
  const rebroadcast = (orderId: string) => {
    const order = orders.find((o) => o.id === orderId);
    if (!order) return;
    rebroadcastOrder(orderId);
    resolveActionOutcome({
      orderIds: [orderId],
      newStatus: 'broadcasted',
      toastTitle: 'Broadcast restarted',
      toastSubtitle: 'Drivers are being notified again.',
    });
  };
  const changeDriver = (orderId: string) => {
    const order = orders.find((o) => o.id === orderId);
    if (!order) return;
    const candidate = drivers.find((d) => d.id !== order.driverId);
    if (!candidate) return;
    updateOrder(orderId, { driverId: candidate.id });
    // Swapping only the driver never changes status — this always stays in
    // the current view (copy explicitly marked "not designed yet" by the user).
    resolveActionOutcome({
      orderIds: [orderId],
      newStatus: order.status,
      toastTitle: 'Driver updated',
      toastSubtitle: 'Your driver has been updated.',
    });
  };
  const bulkChangeDriver = () => {
    const targets = selectedOrders();
    if (targets.length === 0) return;
    targets.forEach((o) => {
      const candidate = drivers.find((d) => d.id !== o.driverId);
      if (candidate) updateOrder(o.id, { driverId: candidate.id });
    });
    resolveActionOutcome({
      orderIds: targets.map((o) => o.id),
      newStatus: targets[0]!.status,
      toastTitle: targets.length === 1 ? 'Driver updated' : `${targets.length} drivers updated`,
      toastSubtitle: `Your driver${targets.length === 1 ? ' has' : 's have'} been updated.`,
    });
    clearSelection();
  };

  // Edit Order (OM §8, Figma 350:38360) — reuses the Add Order drawer in edit
  // mode, prefilled. Editable for the Ready states (order still at//before the
  // depot); In Transit and beyond are frozen — the recourse there is a disruption
  // action, not an edit.
  //
  // **`returned` is editable and that is load-bearing** (OM §2.3, §8, §12.7): a
  // returned order is a holding bay, not a terminal, and most redelivery failures
  // are bad-data failures (wrong address, unreachable recipient). Fixing the cause
  // before retrying is the entire point of the bay — the spec says in as many words
  // "do not treat Returned as read-only". It was missing here, which blocked the
  // action with a "left the depot" toast that was doubly wrong: a returned order has
  // come *back*. (Fixed 2026-08-05.)
  const EDITABLE_STATUSES: OrderStatus[] = ['scheduled', 'pending', 'broadcasted', 'assigned', 'at-depot', 'returned'];
  const [editOrderId, setEditOrderId] = React.useState<string | null>(null);
  // Distinguishes "edited from inside the open View drawer" (its footer → Edit
  // Order) from "edited via the table row's overflow menu" (View drawer never
  // opened) — the two follow different branches of the decision tree.
  const editedFromDrawerRef = React.useRef(false);
  const editingOrder = editOrderId ? orders.find((o) => o.id === editOrderId) ?? null : null;
  const requestEdit = (orderId: string) => {
    const o = orders.find((x) => x.id === orderId);
    if (!o) return;
    if (!EDITABLE_STATUSES.includes(o.status)) {
      pushToast({ type: 'warning', title: 'Editing is blocked', subtitle: 'This order has left the depot — use Return instead.' });
      return;
    }
    editedFromDrawerRef.current = viewOrderId === orderId;
    setEditOrderId(orderId);
  };
  const handleOrderEdited = (input: NewOrderInput) => {
    if (!editingOrder) return;
    const status = editingOrder.status;
    // The real (not mocked) edit-history diff — one entry per field the save
    // actually changed, becoming an "Order Edited" Activity row (Figma
    // `1487:173233`). Compared against the pre-edit snapshot captured in
    // `editingOrder`, before `updateOrder` below overwrites it.
    const FIELD_LABELS: [keyof NewOrderInput | 'dropoff', string][] = [
      ['customer', 'Recipient name'],
      ['phone', 'Phone number'],
      ['depot', 'Pickup depot'],
      ['dropoff', 'Delivery address'],
      ['package', 'Package'],
    ];
    const changes = FIELD_LABELS.flatMap(([key, field]) => {
      const from = key === 'dropoff' ? editingOrder.dropoff.label : String(editingOrder[key as keyof Order] ?? '');
      const to = key === 'dropoff' ? input.dropoff.label : String(input[key as keyof NewOrderInput] ?? '');
      return from !== to && to ? [{ field, from, to }] : [];
    });
    if (input.items !== editingOrder.items) {
      changes.push({ field: 'Items', from: String(editingOrder.items), to: String(input.items) });
    }
    if (changes.length > 0) recordOrderEdit(editingOrder.id, changes);
    updateOrder(editingOrder.id, {
      customer: input.customer,
      phone: input.phone,
      depot: input.depot,
      pickup: input.pickup,
      dropoff: input.dropoff,
      package: input.package,
      items: input.items,
    });
    const notify = status === 'assigned' || status === 'at-depot';
    const orderId = editingOrder.id;
    const fromDrawer = editedFromDrawerRef.current;
    setEditOrderId(null);
    const toastSubtitle = notify ? 'Your changes are saved and the driver has been notified.' : 'Your changes have been saved.';
    if (fromDrawer) {
      // Edits alone never change status — the View drawer (already open) just
      // stays open and refreshes; no CTA, per spec.
      flashDrawerLoading();
      pushToast({ type: 'success', title: 'Order updated', subtitle: toastSubtitle });
    } else {
      // Edited straight from the table's row menu — the View drawer was never
      // open, so refresh the table and offer a CTA back into it.
      flashTableLoading();
      pushToast({
        type: 'success',
        title: 'Order updated',
        subtitle: toastSubtitle,
        cta: { label: 'View Order', onClick: () => { setViewOrderId(orderId); setPage(1); } },
      });
    }
  };

  const noop = (title = 'Coming soon') =>
    pushToast({ type: 'success', title, subtitle: 'This feature is in progress.' });

  // The toolbar / filter components fire handlers without the click event. Capture
  // the clicked control's rect in the click CAPTURE phase (fires before the handler,
  // for both real and programmatic clicks) so the overlay anchors to it regardless
  // of focus; fall back to the focused element.
  const triggerRectRef = React.useRef<DOMRect | null>(null);
  const captureTrigger = (e: React.MouseEvent) => {
    const btn = (e.target as HTMLElement).closest('button, [role="button"]');
    if (btn) triggerRectRef.current = btn.getBoundingClientRect();
  };
  const openFromFocus = (kind: OverlayKind, extra?: Partial<OverlayState>) => {
    const rect =
      triggerRectRef.current ??
      (document.activeElement instanceof HTMLElement ? document.activeElement.getBoundingClientRect() : null);
    setOverlay({ kind, anchor: rect, ...extra });
  };

  // ── Filter tabs ──────────────────────────────────────────────────────────────
  // The selected advanced filter shows its active sub-status as a delivery Badge
  // (Figma: "Unassigned [Scheduled]"). Clicking opens a status dropdown to pick a
  // sub-status within the group.
  // The pill badge is the SAME delivery badge as the table row uses for that status.
  const subBadge = (g: Exclude<FilterTab, 'all'>) =>
    filterTab === g && subStatus
      ? <Badge color={ORDER_STATUS_BADGE[subStatus]} label={ORDER_STATUS_LABEL[subStatus]} leadingIcon={ORDER_STATUS_BADGE_ICON[subStatus]} />
      : undefined;

  const TABS: TopFilterSectionItem[] = [
    { label: 'Unassigned', advanced: true, selected: filterTab === 'unassigned', badge: subBadge('unassigned') },
    { label: 'Dispatched', advanced: true, selected: filterTab === 'dispatched', badge: subBadge('dispatched') },
    { label: 'Finished', advanced: true, selected: filterTab === 'finished', badge: subBadge('finished') },
    { label: 'All', selected: filterTab === 'all' },
  ];

  const handleFilterClick = (index: number) => {
    const map: FilterTab[] = ['unassigned', 'dispatched', 'finished', 'all'];
    const next = map[index];
    if (!next) return;
    if (next === 'all') {
      // "All" isn't advanced — it filters to everything immediately, no dropdown.
      setFilterTab('all');
      setSubStatus(null);
      return;
    }
    // Advanced filters are pickers: clicking (in ANY state) only opens the dropdown
    // so the user sets which status to view. The table/selection change ONLY when a
    // sub-status is picked (see onPickStatus). Don't touch filterTab/subStatus here.
    openFromFocus('subStatus', { group: next });
  };

  // Commit a sub-status pick from a status dropdown: switch to its group + status.
  const handlePickStatus = (group: Exclude<FilterTab, 'all'>, status: OrderStatus) => {
    setFilterTab(group);
    setSubStatus(status);
  };

  // ── Columns + rows ─────────────────────────────────────────────────────────
  // Column set follows the order's lifecycle stage — each maps 1:1 to a Figma
  // wireframe instance (spec Part II Instances A–C), driven by the same
  // /table-column-layout spec used to set the wireframes:
  //  • All (search/triage) → ALL_ORDER_COLUMNS — no Checkbox/Driver/Trip/Batch/Actions;
  //    Order ID pins left on scroll; Duration shows "—" for scheduled rows.
  //  • Unassigned (no Driver/Trip; Actions = Dispatch + overflow, 154):
  //      – Scheduled/Returned → SCHEDULED_ORDER_COLUMNS (drops Duration & Batch;
  //        Returned shares this shape — no Trip/Batch/Duration — awaiting re-dispatch).
  //      – Broadcasted → BROADCASTED_ORDER_COLUMNS (adds Batch ID 90 after Order ID).
  //      – Pending → UNASSIGNED_ORDER_COLUMNS.
  //  • Dispatched → ORDER_TABLE_COLUMNS (full: Driver + Trip + Duration; Actions overflow-only, 64).
  //  • Finished (Delivered/Cancelled) → ORDER_TABLE_COLUMNS_FINISHED — same shape,
  //    but Actions renders a single "View Logs" button, no ⋯ menu (§2.1, 126px).
  const baseColumns: TableColumn[] =
    filterTab === 'all'
      ? ALL_ORDER_COLUMNS
      : filterTab === 'unassigned'
        ? subStatus === 'scheduled' || subStatus === 'returned'
          ? SCHEDULED_ORDER_COLUMNS
          : subStatus === 'broadcasted'
            ? BROADCASTED_ORDER_COLUMNS
            : UNASSIGNED_ORDER_COLUMNS
        : filterTab === 'finished'
          ? ORDER_TABLE_COLUMNS_FINISHED
          : ORDER_TABLE_COLUMNS;
  // Splice any active optional columns in between Created and Status (spec §4.3).
  const columns: TableColumn[] = React.useMemo(() => {
    const extras: TableColumn[] = [
      ...(extraCols.lastUpdated ? [LAST_UPDATED_COLUMN] : []),
      ...(extraCols.createdBy ? [CREATED_BY_COLUMN] : []),
    ];
    if (!extras.length) return baseColumns;
    const idx = baseColumns.findIndex((c) => c.label === 'Status');
    return idx === -1
      ? [...baseColumns, ...extras]
      : [...baseColumns.slice(0, idx), ...extras, ...baseColumns.slice(idx)];
  }, [baseColumns, extraCols]);

  const rows: TableRow[] = pageOrders.map((o) => {
    const driver = getDriver(o.driverId);
    const isFinished = o.status === 'delivered' || o.status === 'cancelled';
    // §2.3 SLA state — counting only for dispatched + pending/broadcasted rows;
    // finished rows keep their final verdict. Mapped onto the client's own
    // configured stage targets (Doc 4 §2/§3) — `slaStateFor` already returns
    // the binary Within/Beyond-OFT outcome (never 'at-risk') for finished rows.
    const slaCounting = GROUP_STATUSES.dispatched.includes(o.status) || o.status === 'pending' || o.status === 'broadcasted';
    const sla: SlaState = slaStateFor(o, clientConfig.sla);
    const actionsCell: TableRow['cells'][number] = {
      type: 'actions',
      // Delivered/Cancelled are terminal — a single "View Logs" button replaces
      // the overflow menu entirely (no ⋯ in these states), per §2.1.
      actions: isFinished ? (
        <Button
          variant="secondary"
          size="small"
          iconLeft="Document"
          iconOutlined
          onClick={(e) => {
            e.stopPropagation();
            openOrderForDispatchLogs(o.id);
          }}
        >
          View Logs
        </Button>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-8px)' }}>
          {canDispatch(o) && (
            <Button
              variant="secondary"
              size="small"
              iconLeft="Proceed"
              onClick={(e) => { e.stopPropagation(); dispatchOrder(o.id); }}
            >
              Dispatch
            </Button>
          )}
          <Button
            variant="secondary"
            size="small"
            iconOnly="More"
            aria-label="More actions"
            onClick={(e) => {
              e.stopPropagation();
              setOverlay({ kind: 'rowActions', anchor: e.currentTarget.getBoundingClientRect(), orderId: o.id, orderStatus: o.status });
            }}
          />
        </div>
      ),
    };

    // One cell per possible column, keyed by the column's label, so the row always
    // aligns with whichever preset (`columns`) is active — added/removed columns
    // (Driver, Trip, Duration) just drop out. `''` is the no-label Actions column.
    // Duration falls back to '—' for scheduled orders that surface in a mixed view.
    const creator = creatorFor(o);
    // The same dispatch narrative the drawer builds — provenance icons must not
    // be re-derived per surface (see lib/dispatchNarrative.ts).
    const narrative = buildDispatchNarrative(o, clientConfig, getDriver(o.driverId)?.name ?? null);
    const scheduledOrigin = narrative.scheduledOrigin;
    const cellByLabel: Record<string, TableRow['cells'][number]> = {
      // Order ID cell — manual vs automatic per the order's creation source
      // (§2.2), with the wireframes' provenance icons + hover tooltips
      // (`1334:178838`): Copy ID · Created manually / Created via integration ·
      // Scheduled: {slot} (scheduled-origin only) · Auto-broadcast.
      'Order ID': {
        type: creator.source === 'human' ? 'manual-order' : 'automatic-order',
        orderId: o.id,
        onCopyOrderId: () => navigator.clipboard.writeText(o.id),
        showScheduledIcon: scheduledOrigin,
        scheduledTooltip: scheduledOrigin ? scheduledLabelFor(o) : undefined,
        // From the shared dispatch narrative, so the table's Broadcast icon and
        // the drawer's header icon / banner / Dispatch Logs always agree.
        showBroadcastIcon: narrative.showBroadcastIcon,
      },
      'Batch ID': { type: 'sample', text: o.batchId ?? '—' }, // Broadcasted view only
      // Trip cell — a Plain button ("TRP-103 ↗", trailing Open icon, no
      // underline) once a trip exists; "--" for orders cancelled before
      // assignment (wireframes `852:166434` / `1213:98975`). The trip surface
      // itself is a future build, so the button stubs with a toast.
      'Trip': o.tripId
        ? {
            type: 'actions',
            actions: (
              <Button
                variant="plain"
                size="medium"
                iconRight="Open"
                showUnderline={false}
                onClick={(e) => {
                  e.stopPropagation();
                  pushToast({ type: 'success', title: `${o.tripId} — coming soon`, subtitle: 'Trip details are in progress.' });
                }}
              >
                {o.tripId}
              </Button>
            ),
          }
        : { type: 'sample', text: '--' },
      // Driver cell: a real driver renders the driver-cell (Swap/Call buttons on
      // active orders; name-only, centered, for finished ones — a terminal
      // order's driver can't be swapped/called). No driver (cancelled before
      // assignment) → "--", matching the empty Trip cell.
      'Driver': driver
        ? { type: 'driver-cell', name: driver.name, showDriverActions: !isFinished }
        : { type: 'sample', text: '--' },
      'Route': { type: 'address-cell', pickup: depotForOrder(o, clientConfig.depots)?.name ?? o.pickup.label, dropoff: o.dropoff.label },
      'Recipient': { type: 'list-item', title: o.customer, subtext: o.phone },
      // Depot → drop-off road distance ("4.2 Km"), derived from the same
      // coordinates the drawer's map draws the route from, so the number can
      // never contradict the route (Table Column spec §2.4).
      'Distance': { type: 'sample', text: distanceLabelFor(o) },
      // Mock times until the Configuration spec lands (real stage-clock logic then).
      // Scheduled has no SLA yet; Returned's counter reset on return — both show "—"
      // when Duration surfaces in a mixed view (their own views drop the column).
      'Duration': o.status === 'scheduled' || o.status === 'returned'
        ? { type: 'sample', text: '—' }
        : {
            type: 'duration',
            durationVariant: isFinished ? 'finished' : 'active',
            durationStatus: sla,
            durationTime: mockDurationFor(o, clientConfig.sla, isFinished),
            // Finished rows: hover tooltip on the leading Within/Beyond-OFT icon.
            durationIconTooltip: isFinished
              ? sla === 'delayed' ? 'Delivery delayed' : 'Delivery on time'
              : undefined,
          },
      'Created': { type: 'date', date: formatCreated(o.createdAt) },
      'Last Updated': { type: 'date', date: formatCreated(o.createdAt) }, // toggle column
      'Created By': (() => {
        // toggle column → human (user-cell) or automated (api-cell) source (§2.2).
        // Storefront and API share the same Featured Icon (Integration, api-cell's
        // default) — only the subtext names the channel.
        const c = CREATORS[o.id.charCodeAt(0) % CREATORS.length]!;
        if (c.source === 'human') return { type: 'user-cell', name: c.name, email: c.email, avatarSrc: c.avatarSrc };
        if (c.source === 'storefront') return { type: 'api-cell', apiTitle: 'Auto-created', apiSubtext: 'From online store' };
        return { type: 'api-cell', apiTitle: 'Auto-created', apiSubtext: 'From connected app' };
      })(),
      'Status': {
        type: 'status',
        statusContent: <Badge color={ORDER_STATUS_BADGE[o.status]} label={ORDER_STATUS_LABEL[o.status]} leadingIcon={ORDER_STATUS_BADGE_ICON[o.status]} />,
        // §2.3: SLA icon trails the badge only while the SLA is actively counting.
        statusIcon: slaCounting && sla === 'at-risk' ? 'warning' : slaCounting && sla === 'delayed' ? 'error' : undefined,
        // Spec pairing (warning → At Risk, error → Delayed) — the wireframe's
        // crossed prototype connections were ruled a mistake (2026-07-16).
        statusIconTooltip: sla === 'at-risk' ? 'At Risk' : sla === 'delayed' ? 'Delayed' : undefined,
      },
      '': actionsCell,
    };
    const cells: TableRow['cells'] = columns.map((c) => cellByLabel[c.label ?? ''] ?? { type: 'sample', text: '' });

    return { selected: selectedIds.has(o.id), cells };
  });

  // The "Filter" toolbar button badge reflects the total applied Filter Group
  // selections across every dimension (not the status sub-filter, which shows
  // as the badge on the Unassigned/Dispatched/Finished pill instead).
  const activeFilterCount = Object.values(appliedFilters).reduce((n, s) => n + s.size, 0);

  // Opens the Filter Group, seeding its draft + live preview count from whatever
  // is currently applied (the panel remounts fresh each open, so this is what
  // makes a previously-applied filter still show checked/reflected on reopen).
  const handleOpenFilter = () => {
    setDraftFilters(appliedFilters);
    setFilterPreviewCount(ordersInView.filter((o) => matchesFilters(o, appliedFilters)).length);
    openFromFocus('filter');
  };

  // The bulk toolbar's action set — the intersection of what every selected
  // order's status allows (OM §12.9); recomputed each render off `selectedIds`.
  const bulkActions = bulkActionsForSelection(selectedOrders());

  // No Checkbox on All (mixed statuses), Finished (terminal — no bulk actions),
  // or the Returning sub-status (zero bulk actions apply — matches the Figma
  // "Returning (Dispatched)" wireframe, which carries no checkbox column; the
  // freed 52px redistributes across the flexible columns automatically via the
  // Table's own flex computation, no separate column preset needed).
  const tableSelectable = filterTab !== 'all' && filterTab !== 'finished' && subStatus !== 'returning';

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div
      onClickCapture={captureTrigger}
      style={{
        flex: 1,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--spacing-24px)',
        padding: '24px 24px 0',
        boxSizing: 'border-box',
        overflow: 'hidden',
      }}
    >
      <Title text="Deliveries" variant="page-dialog" style={{ flexShrink: 0 }} />

      {/* Content frame — Figma pad [0,0,16,0]: reserves the 16px viewport gap below
          the table; the TableContainer fills it and the table scrolls internally.
          NOT keyed: the controls (search row + filter pills) must stay mounted
          across filter switches — the sliding active-filter ring can only animate
          between selections if TopFilterSection survives the switch. Only the
          table region below is keyed/remounted (replaying its enter animation).
          position:relative — the anchor for the contained LoadingOverlay, so the
          scrim dims only this region (toolbars + filters + table + pagination). */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', paddingBottom: 'var(--padding-16px)', position: 'relative' }}>
          {!loaded ? (
            // Boot state (wireframe 1176:171818): Search+Create toolbar only,
            // "No Orders Yet" + Add Order CTA. Add Order / Refresh trigger the
            // loader and reveal the populated table.
            <TableContainer
              fillHeight
              variant="empty"
              onAddOrder={handleAddOrder}
              controls={
                <TableDataControl
                  variant="search-create"
                  showAddOrder={false}
                  searchPlaceholder="Search by order or recipient..."
                  createdLabel={createdLabel}
                  onCreatedClick={() => openFromFocus('created')}
                  onFilterClick={handleOpenFilter}
                  onSortClick={() => openFromFocus('sort')}
                  onImportExportClick={() => openFromFocus('importExport')}
                />
              }
            />
          ) : (
          <TableContainer
            fillHeight
            // Zero matches (wireframe 945:210612): both toolbars stay — the
            // user's search/filters caused the state, so they must stay reachable.
            variant={filtered.length === 0 ? 'no-results' : 'default'}
            controls={
              <>
                <TableDataControl
                  variant="search-create"
                  searchPlaceholder="Search by order or recipient..."
                  searchValue={search}
                  onSearchChange={setSearch}
                  onSearchClear={() => setSearch('')}
                  filterCount={activeFilterCount}
                  createdLabel={createdLabel}
                  onCreatedClick={() => openFromFocus('created')}
                  onFilterClick={handleOpenFilter}
                  onSortClick={() => openFromFocus('sort')}
                  onAddOrderClick={handleAddOrder}
                  onImportExportClick={() => openFromFocus('importExport')}
                />
                <TableDataControl
                  variant="filters-column"
                  dataCount={`${filtered.length} Order${filtered.length === 1 ? '' : 's'}`}
                  onColumnsClick={() => openFromFocus('columns')}
                  autoRefresh={autoRefresh}
                  onAutoRefreshChange={setAutoRefresh}
                  filters={<TopFilterSection filters={TABS} onFilterClick={handleFilterClick} animatedSelection />}
                />
              </>
            }
            table={
              tableRefreshing ? (
                // Subsequent update (Refresh) — Skeleton rows only, no scrim; the
                // toolbars above stay mounted and interactive throughout.
                <SkeletonTableRows
                  columns={columns}
                  selectable={tableSelectable}
                  rows={Math.min(rowsPerPage, pageOrders.length || rowsPerPage)}
                />
              ) : (
                // Keyed wrapper: remounts (and replays the enter animation on) the
                // table alone when the view, page, or a reset changes — the controls
                // above stay mounted so the filter ring slides.
                <div
                  key={`${filterTab}-${clampedPage}-${tableKey}`}
                  style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', animation: 'leta-table-in 200ms ease-in' }}
                >
                <Table
                  rowVariant="complex"
                  // No Checkbox on All (mixed statuses, no bulk actions), Finished
                  // (Delivered/Cancelled are terminal — nothing to bulk-action), or
                  // Returning (in transit back — zero bulk actions apply, §12.9;
                  // matches the Figma "Returning (Dispatched)" wireframe, which
                  // carries no checkbox column and redistributes its 52px across the
                  // flexible columns instead of leaving a dead gap).
                  selectable={tableSelectable}
                  // §4.3 measured scroll: the table flips to h-scroll (pinned Order
                  // ID/Actions) ONLY while its column minimums exceed the container —
                  // e.g. optional columns on a dense view, or a narrowed window. On a
                  // sparse view (Returned/Scheduled) extras just join the flex-fill.
                  scrollX="auto"
                  columns={columns}
                  rows={rows}
                  onSelectionChange={handleSelectionChange}
                  // §3.1 — clicking a dynamic row opens the Order Detail View;
                  // the checkbox + inline cell buttons act independently.
                  onRowClick={(i) => { const o = pageOrders[i]; if (o) setViewOrderId(o.id); }}
                  page={clampedPage}
                  pageCount={pageCount}
                  onPageChange={setPage}
                  countLabel={`Showing ${pageOrders.length} of ${filtered.length}`}
                  rowsPerPage={rowsPerPage}
                  onRowsPerPageClick={() => openFromFocus('rowsPerPage')}
                  fillHeight
                />
                </div>
              )
            }
          />
          )}

          {/* First-load overlay (Import from empty) — contained: dims only this
              table region, holds until the loader completes a full cycle. Top edge
              extends up through the page column's 24px gap to sit 1px below the
              Title row (its divider stays undimmed). Never shown for a Refresh —
              that's a subsequent update, handled by the Skeleton rows above. */}
          <LoadingOverlay contained opaque open={firstLoading} style={{ top: 'calc(-1 * var(--spacing-24px) + 1px)' }} />
        </div>

      {/* Bulk actions toolbar — slides up in / down out as the selection changes.
          Centered via flex (not translateX) so it doesn't fight the animation's
          transform; kept mounted through the exit by `bulkMounted`. */}
      {bulkMounted && (
        <div
          style={{
            position: 'fixed',
            bottom: 80,
            left: 0,
            right: 0,
            display: 'flex',
            justifyContent: 'center',
            zIndex: 50,
            pointerEvents: 'none',
          }}
        >
          <div className={bulkVisible ? 'leta-bulkbar-enter' : 'leta-bulkbar-exit'} style={{ pointerEvents: 'auto' }}>
            <BulkActionsToolbar
              selectionLabel={`${selectedIds.size} selected`}
              onSelectionClick={() => openFromFocus('selection')}
              actions={
                // Rendered in BULK_ACTION_ORDER (bulkActions.fixed is already sorted
                // that way by the intersect), so left→right matches the Figma
                // Multi-Select wireframes: forward actions first, destructive right.
                <>
                  {bulkActions.fixed.map((a) => {
                    switch (a) {
                      case 'dispatch':
                        return <Button key={a} variant="ghost" size="medium" iconLeft="Proceed" onClick={bulkDispatch}>Dispatch</Button>;
                      case 'addToTrip':
                        return <Button key={a} variant="ghost" size="medium" iconLeft="Add" iconOutlined onClick={bulkAddToTrip}>Add To Trip</Button>;
                      case 'changeDriver':
                        return <Button key={a} variant="ghost" size="medium" iconLeft="Swap" iconOutlined onClick={bulkChangeDriver}>Change Driver</Button>;
                      case 'updateStatus':
                        return <Button key={a} variant="ghost" size="medium" iconLeft="Update" iconOutlined onClick={() => requestUpdateStatus(selectedOrders().map((o) => o.id))}>Update Status</Button>;
                      case 'cancel':
                        return <Button key={a} variant="ghost-error" size="medium" iconLeft="Delete" iconOutlined onClick={bulkCancel}>Cancel Order</Button>;
                      case 'return':
                        return <Button key={a} variant="ghost-error" size="medium" iconLeft="Undo" iconOutlined onClick={bulkReturn}>Return Order</Button>;
                      default:
                        return null;
                    }
                  })}
                </>
              }
              showOverflow={bulkActions.overflow.length > 0}
              onOverflowClick={bulkActions.overflow.length > 0 ? () => openFromFocus('bulkOverflow') : undefined}
              onClose={clearSelection}
            />
          </div>
        </div>
      )}

      {/* Overlays */}
      {overlay && (
        <OverlayHost
          overlay={overlay}
          onClose={() => setOverlay(null)}
          pushToast={pushToast}
          onRequestCancel={requestCancel}
          onRequestReturn={requestReturn}
          subStatus={subStatus}
          onPickStatus={handlePickStatus}
          countByStatus={countByStatus}
          selectedOrderList={selectedOrders()}
          deselect={deselect}
          onCreatedLabel={setCreatedLabel}
          extraCols={extraCols}
          onToggleColumn={(k) => setExtraCols((p) => ({ ...p, [k]: !p[k] }))}
          filterGroups={filterGroups}
          appliedFilters={appliedFilters}
          filterPreviewCount={filterPreviewCount}
          onFilterSelectionChange={(selected) => {
            const next: Record<string, Set<string>> = {};
            filterGroups.forEach((g, i) => { next[g.label] = new Set(selected[i] ?? []); });
            setDraftFilters(next);
            setFilterPreviewCount(ordersInView.filter((o) => matchesFilters(o, next)).length);
          }}
          onFilterApply={() => { setAppliedFilters(draftFilters); setOverlay(null); flashTableLoading(); }}
          onFilterReset={() => {
            setDraftFilters({});
            setFilterPreviewCount(ordersInView.length);
          }}
          onImport={runFirstLoad}
          rowsPerPage={rowsPerPage}
          onRowsPerPage={(size) => { handleRowsPerPage(size); setOverlay(null); }}
          onSortChange={(sel) => { setSortFieldIndex(sel.index); setSortDir(sel.direction); flashTableLoading(); }}
          onRequestUpdateStatus={requestUpdateStatus}
          onRequestReschedule={requestReschedule}
          onRequestEdit={requestEdit}
          onAddToTrip={addToTrip}
          onChangeDriver={changeDriver}
          onAddComment={openOrderForComment}
          onViewLogs={openOrderForDispatchLogs}
        />
      )}

      {/* Order Detail drawer (View Order, OM §7 / wireframes 320:99590) —
          opened by row click or the toast's View Order CTA; footer actions
          route to the same modal handlers as the table's row ⋯ menu. */}
      <OrderDetailDrawer
        orderId={viewOrderId}
        commentIntent={viewOrderId != null && commentIntentOrderId === viewOrderId}
        dispatchLogsIntent={viewOrderId != null && dispatchLogsIntentOrderId === viewOrderId}
        onClose={() => { setViewOrderId(null); setCommentIntentOrderId(null); setDispatchLogsIntentOrderId(null); }}
        loading={drawerLoading}
        actions={{
          dispatch: dispatchOrder,
          requestCancel,
          requestReturn,
          requestUpdateStatus,
          requestReschedule,
          requestEdit,
          addToTrip,
          changeDriver,
          rebroadcast: rebroadcast,
          broadcastExhausted: handleBroadcastExhausted,
          stub: (title) => noop(title),
        }}
      />

      {/* Add Order side drawer — config-aware order creation. */}
      <AddOrderDrawer
        open={addOrderOpen}
        config={clientConfig}
        onClose={() => setAddOrderOpen(false)}
        onSubmit={handleOrderCreated}
      />

      {/* Edit Order drawer — the same drawer in edit mode, prefilled (OM §8). */}
      <AddOrderDrawer
        mode="edit"
        open={Boolean(editOrderId)}
        config={clientConfig}
        editOrder={editingOrder}
        orderStatus={editingOrder?.status}
        onClose={() => setEditOrderId(null)}
        onSubmit={() => {}}
        onSave={handleOrderEdited}
      />

      {/* Cancel Order modal (Doc 3 §5 / OM §11.1, Figma 1382:104119) — reason
          capture gating every cancellation; reused for a single order and a
          bulk selection. */}
      {cancelConfirm && (
        <CancelOrderModal
          orderIds={cancelConfirm}
          onClose={() => setCancelConfirm(null)}
          onConfirm={confirmCancel}
        />
      )}

      {/* Return Order modal (OM §11.3, Figma Activity `1489:183266`) — the typed
          reason gating a dispatcher-initiated return; reused for a single order
          and a bulk selection, and from the View drawer footer. */}
      {returnConfirm && (
        <ReturnOrderModal
          orderIds={returnConfirm}
          onClose={() => setReturnConfirm(null)}
          onConfirm={confirmReturn}
        />
      )}

      {/* Update Status modal (OM §12.6, Figma 1239:108227) — status-gated options. */}
      {updateStatusFor && (
        <UpdateStatusModal
          orderIds={updateStatusFor}
          statuses={orders.filter((o) => updateStatusFor.includes(o.id)).map((o) => o.status)}
          onClose={() => setUpdateStatusFor(null)}
          onConfirm={confirmUpdateStatus}
        />
      )}

      {/* Reschedule modal (OM §11.2, Figma 1239:108226 bulk / 1408:237256 single). */}
      {rescheduleFor && rescheduleInfo && (
        <RescheduleModal
          orderIds={rescheduleFor}
          anchorDate={rescheduleInfo.anchor}
          chipBase={rescheduleInfo.chipBase}
          noOpDate={rescheduleInfo.noOp}
          hasDriverHeld={rescheduleInfo.hasDriverHeld}
          onClose={() => setRescheduleFor(null)}
          onConfirm={confirmReschedule}
        />
      )}
    </div>
  );
}

// ── Overlay host ──────────────────────────────────────────────────────────────

interface OverlayHostProps {
  overlay: OverlayState;
  onClose: () => void;
  pushToast: (t: { type: 'success' | 'warning' | 'error'; title: string; subtitle?: string }) => void;
  onRequestCancel: (ids: string[]) => void;
  onRequestReturn: (ids: string[]) => void;
  subStatus: OrderStatus | null;
  onPickStatus: (group: Exclude<FilterTab, 'all'>, status: OrderStatus) => void;
  countByStatus: Record<OrderStatus, number>;
  selectedOrderList: Order[];
  deselect: (id: string) => void;
  onCreatedLabel: (label: string) => void;
  extraCols: Record<ExtraColumnKey, boolean>;
  onToggleColumn: (key: ExtraColumnKey) => void;
  filterGroups: FilterGroupDimension[];
  appliedFilters: Record<string, Set<string>>;
  filterPreviewCount: number;
  onFilterSelectionChange: (selected: string[][]) => void;
  onFilterApply: () => void;
  onFilterReset: () => void;
  /** "Import" clicked (Import/Export dropdown) — a dev-convenience stand-in for a real
   * data import: populates/refreshes the table via the same load-and-reveal path as
   * Refresh, rather than requiring an Add Order submission first. */
  onImport: () => void;
  /** A Sort field/direction pick — DesktopDropdowns fires this on every pick (field
   * and direction are independently selectable, panel stays open, per its own design). */
  onSortChange: (sel: { index: number; label: string; direction: 'asc' | 'desc' }) => void;
  /** The current rows-per-page (marks the active option in the selector). */
  rowsPerPage: number;
  /** A rows-per-page pick (10/25/50, Doc 3 §6) — close-on-select. */
  onRowsPerPage: (size: number) => void;
  /** Open the Update Status modal for the given order id(s) (OM §12.6). */
  onRequestUpdateStatus: (ids: string[]) => void;
  /** Open the Reschedule modal for the given order id(s) (OM §11.2). */
  onRequestReschedule: (ids: string[]) => void;
  /** Open the Edit Order drawer for the given order (OM §8). */
  onRequestEdit: (orderId: string) => void;
  /** Add To Trip / Change Driver for a single order (row ⋯ menu). */
  onAddToTrip: (orderId: string) => void;
  onChangeDriver: (orderId: string) => void;
  /** Add Comment (row ⋯ menu) — opens the order drawer on the Activity tab with
   *  the comment composer expanded. */
  onAddComment: (orderId: string) => void;
  /** View Logs (row ⋯ menu) — opens the order drawer on the Dispatch Logs tab. */
  onViewLogs: (orderId: string) => void;
}

function OverlayHost({ overlay, onClose, pushToast, onRequestCancel, onRequestReturn, subStatus, onPickStatus, countByStatus, selectedOrderList, deselect, onCreatedLabel, extraCols, onToggleColumn, filterGroups, appliedFilters, filterPreviewCount, onFilterSelectionChange, onFilterApply, onFilterReset, onImport, onSortChange, rowsPerPage, onRowsPerPage, onRequestUpdateStatus, onRequestReschedule, onRequestEdit, onAddToTrip, onChangeDriver, onAddComment, onViewLogs }: OverlayHostProps): React.ReactElement {
  const { kind, anchor, orderId, orderStatus, group } = overlay;

  if (kind === 'rowsPerPage') {
    // Rows-per-page selector (Doc 3 §6) — a small close-on-select combobox of
    // the three page sizes, opened from the Pagination's "N rows per page"
    // trigger; the picked size persists per user across sessions.
    return (
      <Popover anchorRect={anchor} onClose={onClose} placement="bottom-start">
        <MenuPanel width={120}>
          {PAGE_SIZE_OPTIONS.map((size) => (
            <DesktopMenuOptions
              key={size}
              type="combobox"
              label={String(size)}
              active={size === rowsPerPage}
              onSelect={() => onRowsPerPage(size)}
            />
          ))}
        </MenuPanel>
      </Popover>
    );
  }

  if (kind === 'selection') {
    // The bulk toolbar's "N selected ⌄" overlay (Figma `945:221486`): a 250px combobox
    // listing every selected order (across all pages) as a checked checkbox row;
    // unchecking removes it from the selection. Opens *above* the bottom-fixed toolbar
    // (top-start), bottom-anchored so it grows/shrinks upward as items are deselected.
    return (
      <Popover anchorRect={anchor} onClose={onClose} placement="top-start">
        <DesktopDropdowns variant="combobox" style={{ width: 250 }}>
          {/* No scrollbar chrome — the height is tuned so the 5th row is cut off
              mid-row, which IS the scroll affordance (per design direction). */}
          <div className="leta-popover-list" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4px)', padding: 'var(--padding-8px)', maxHeight: 248, overflowY: 'auto', overscrollBehavior: 'contain' }}>
            {selectedOrderList.map((o) => (
              <DesktopMenuOptions
                key={o.id}
                type="checkbox-selection"
                label={o.id}
                selected
                onSelect={() => deselect(o.id)}
              />
            ))}
          </div>
        </DesktopDropdowns>
      </Popover>
    );
  }

  if (kind === 'columns') {
    // The "Columns" control — a checkbox combobox of the optional columns hidden by
    // default (the Figma tables don't render them). Checking one adds it to the table
    // (before Status) and switches the table into horizontal-scroll mode with pinned
    // anchors (spec §4.3). Stays open so several can be toggled in one visit.
    return (
      <Popover anchorRect={anchor} onClose={onClose} placement="bottom-end">
        <DesktopDropdowns variant="combobox" style={{ width: 250 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4px)', padding: 'var(--padding-8px)' }}>
            {EXTRA_COLUMN_OPTIONS.map((opt) => (
              <DesktopMenuOptions
                key={opt.key}
                type="checkbox-selection"
                label={opt.label}
                selected={extraCols[opt.key]}
                onSelect={() => onToggleColumn(opt.key)}
              />
            ))}
          </div>
        </DesktopDropdowns>
      </Popover>
    );
  }

  if (kind === 'created') {
    return (
      <Popover anchorRect={anchor} onClose={onClose} placement="bottom-start">
        <DateTimePicker
          type="date-range"
          platform="desktop"
          onApply={({ preset, explicit }) => { if (preset) onCreatedLabel(`Created: ${preset}`); if (explicit) onClose(); }}
          onCancel={onClose}
        />
      </Popover>
    );
  }

  if (kind === 'sort') {
    // Stays open on its own (field and direction are independently selectable —
    // DesktopDropdowns' own design, not something this call site controls).
    return (
      <Popover anchorRect={anchor} onClose={onClose} placement="bottom-start">
        <DesktopDropdowns variant="sort" onSortChange={onSortChange} />
      </Popover>
    );
  }

  if (kind === 'filter') {
    // Doc 3 §9: 1 dimension → Basic Filter Search, 2+ → Filter Group. Every
    // status view has at least Recipient + Created By, so Filter Group always
    // applies here — Basic Filter Search stays available in the DS for a future
    // screen with genuinely only one dimension.
    return (
      <Popover anchorRect={anchor} onClose={onClose} placement="bottom-start">
        <DesktopDropdowns
          variant="filter-group"
          groups={filterGroups}
          initialGroupSelections={filterGroups.map((g) => [...(appliedFilters[g.label] ?? [])])}
          resultsText={`${filterPreviewCount} results`}
          onGroupSelectionChange={onFilterSelectionChange}
          onApply={onFilterApply}
          onReset={onFilterReset}
        />
      </Popover>
    );
  }

  if (kind === 'importExport') {
    return (
      <Popover anchorRect={anchor} onClose={onClose} placement="bottom-end">
        <MenuPanel width={200}>
          {['Import', 'Export'].map((label) => (
            <DesktopMenuOptions
              key={label}
              type="dropdown-basic"
              label={label}
              showLeadingIcon
              leadingIcon={label === 'Import' ? 'Download' : 'Upload'}
              showChevron={false}
              onSelect={() => {
                // Import is a dev-convenience stand-in for a real data import: it
                // populates/refreshes the table (same load-and-reveal path as
                // Refresh) instead of requiring an Add Order submission first.
                // Export has no real target yet, so it stays a placeholder toast.
                if (label === 'Import') onImport();
                else pushToast({ type: 'success', title: label, subtitle: 'This feature is in progress.' });
                onClose();
              }}
            />
          ))}
        </MenuPanel>
      </Popover>
    );
  }

  if (kind === 'subStatus' && group) {
    const statuses = GROUP_STATUSES[group];
    return (
      <Popover anchorRect={anchor} onClose={onClose} placement="bottom-start">
        <MenuPanel width={240}>
          {statuses.map((st) => (
            <DesktopMenuOptions
              key={st}
              type="combobox"
              showLeadingIcon
              leadingIcon={ORDER_STATUS_ICON[st]}
              label={`${ORDER_STATUS_LABEL[st]} (${countByStatus[st] ?? 0})`}
              active={subStatus === st}
              onSelect={() => { onPickStatus(group, st); onClose(); }}
            />
          ))}
        </MenuPanel>
      </Popover>
    );
  }

  if (kind === 'rowActions' && orderId) {
    // Per-status menu (OM §12.5) — contents vary by lifecycle stage.
    const menu = rowMenuFor(orderStatus ?? 'pending');
    return (
      <Popover anchorRect={anchor} onClose={onClose} placement="bottom-end">
        <MenuPanel width={220}>
          {menu.groups.map((groupRows, gi) => (
            <React.Fragment key={gi}>
              {gi > 0 && <MenuDivider />}
              {groupRows.map((a) => (
                <DesktopMenuOptions
                  key={a.label}
                  type="dropdown-basic"
                  label={a.label}
                  showLeadingIcon
                  leadingIcon={a.icon}
                  showChevron={false}
                  onSelect={() => {
                    onClose();
                    if (a.label === 'Update Status') onRequestUpdateStatus([orderId]);
                    else if (a.label === 'Reschedule Order') onRequestReschedule([orderId]);
                    else if (a.label === 'Edit Order') onRequestEdit(orderId);
                    else if (a.label === 'Add To Trip') onAddToTrip(orderId);
                    else if (a.label === 'Change Driver') onChangeDriver(orderId);
                    else if (a.label === 'Add Comment') onAddComment(orderId);
                    else if (a.label === 'View Logs') onViewLogs(orderId);
                    else pushToast({ type: 'success', title: a.label, subtitle: 'This action is coming soon.' });
                  }}
                />
              ))}
            </React.Fragment>
          ))}
          {menu.destructive && (
            <>
              <MenuDivider />
              <DesktopMenuOptions
                type="dropdown-destructive"
                label={menu.destructive.label}
                showLeadingIcon
                leadingIcon={menu.destructive.icon}
                onSelect={() => {
                  onClose();
                  // Cancel and Return both open their own reason-capture modal.
                  if (menu.destructive!.label === 'Cancel Order') onRequestCancel([orderId]);
                  else onRequestReturn([orderId]);
                }}
              />
            </>
          )}
        </MenuPanel>
      </Popover>
    );
  }

  if (kind === 'bulkOverflow') {
    // Bulk toolbar's ⋯ — the secondary bulk actions for every selected order.
    // Data-driven from the selection's computed overflow (the intersection of what
    // each status allows), so e.g. a Returned selection shows Reschedule Order
    // only (no Update Status — OM §10.1 / §12.6). Opens above the toolbar (top-end).
    const ids = selectedOrderList.map((o) => o.id);
    const overflow = bulkActionsForSelection(selectedOrderList).overflow;
    const RENDER: Record<'updateStatus' | 'reschedule', { label: string; icon: IconName; onSelect: () => void }> = {
      updateStatus: { label: 'Update Status', icon: 'Update', onSelect: () => { onClose(); onRequestUpdateStatus(ids); } },
      reschedule: { label: 'Reschedule Order', icon: 'Calendar', onSelect: () => { onClose(); onRequestReschedule(ids); } },
    };
    const items = overflow.filter((a): a is 'updateStatus' | 'reschedule' => a === 'updateStatus' || a === 'reschedule');
    return (
      <Popover anchorRect={anchor} onClose={onClose} placement="top-end">
        <MenuPanel width={220}>
          {items.map((a) => (
            <DesktopMenuOptions
              key={a}
              type="dropdown-basic"
              label={RENDER[a].label}
              showLeadingIcon
              leadingIcon={RENDER[a].icon}
              showChevron={false}
              onSelect={RENDER[a].onSelect}
            />
          ))}
        </MenuPanel>
      </Popover>
    );
  }

  return <></>;
}

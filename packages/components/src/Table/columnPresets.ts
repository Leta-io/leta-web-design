import type { TableColumn } from './Table.js';

/**
 * Canonical column presets — the **Table Instances** (Part II) of the Table Column
 * Layout Specification, declared against the system rules (Part I). Import these
 * instead of re-deriving widths per screen so every screen matches the Figma
 * wireframes 1:1 ("keep widths consistent across similar tables"). Adding a table
 * = add an instance here, never redesign the system.
 *
 * Sizing model:
 * - Fixed columns use `width`.
 * - Primary flexible columns share the remaining width by `flex` weight, expressed
 *   with **Recipient = 1.00** (§3.2): Route 1.48 (40%), Driver 1.22 (33%),
 *   Recipient 1.00 (27%). Each carries a `minWidth` floor (§3.4). When Driver is
 *   removed (Unassigned/All), Route/Recipient settle at 60/40 on their own.
 * - Order ID is **low-weight flexible** (§3.3): a low `flex` weight with a 150px
 *   floor and no hard cap — the low weight (0.5 vs Route's 1.48) is the governor.
 *   It sits near 150 when constrained; on wide viewports it grows slowly (Route
 *   always gains ~3× as much from the same surplus), eventually un-truncating
 *   long IDs. (The former 224px cap was removed 2026-07-05 — it produced IDs
 *   truncating beside visibly free space on wide monitors.)
 * - The 52px checkbox/control column is added by `<Table selectable>`. Depot is NOT
 *   a column — it lives inside the Route cell (§3.5).
 * - **Actions width derives from cell content, not the view (§2.1):** 64px
 *   (icon-only overflow ⋯), 126px (a single labelled button, e.g. "View Logs"),
 *   or 154px (a labelled button + icon-only overflow, e.g. Dispatch + ⋯). On the
 *   Order table this is 64px for every state except Delivered/Cancelled (Finished
 *   — {@link ORDER_TABLE_COLUMNS_FINISHED}), which is 126px (View Logs only, no ⋯
 *   menu); Unassigned views are 154px (Dispatch + ⋯). No visible header label
 *   (`label: ''`) but a screen-reader `accessibleName` (§8).
 * - **Pinned anchors (§4.3):** Order ID `pinned: 'left'`, Actions `pinned: 'right'`
 *   — sticky on horizontal scroll so every row stays identifiable (no-op unless
 *   `<Table scrollX>`). The All view has no Actions, so it pins Order ID only.
 * - `Last Updated` (utility, 120px) is an off-by-default toggle inserted **between
 *   Created and Status** via {@link LAST_UPDATED_COLUMN}; not in the default sets.
 * - `Created By` is an off-by-default toggle inserted **after `Last Updated`, before
 *   Status** via {@link CREATED_BY_COLUMN} — a **low-weight flexible** Primary
 *   column (§3.3, same low-weight-with-floor model as Order ID): flex 0.5, 200px
 *   floor, no cap, so it never outcompetes Route/Driver/Recipient for surplus
 *   width. Renders the `user-cell` Cell type (avatar + name + email).
 *
 * @example
 *   <Table selectable columns={ORDER_TABLE_COLUMNS} rows={rows} />
 */

// Floors are p90-representative (§3.4), not longest-possible; tune per real data.
const DRIVER_FLOOR = 160; // avatar + name (phone is a call action, not text)
const ROUTE_FLOOR = 200; //  stacked composite: depot + pickup + drop-off
const RECIPIENT_FLOOR = 170; // name + full phone (phone must not truncate)

// ── Shared column parts (composed into the instances below) ──────────────────
const ORDER_ID: TableColumn = {
  label: 'Order ID',
  role: 'identifier',
  flex: 0.5,
  minWidth: 150,
  pinned: 'left',
};
const TRIP: TableColumn = { label: 'Trip', role: 'identifier', width: 90 };
const BATCH_ID: TableColumn = { label: 'Batch ID', role: 'identifier', width: 90 };
const DRIVER: TableColumn = { label: 'Driver', role: 'primary', flex: 1.22, minWidth: DRIVER_FLOOR };
const ROUTE: TableColumn = { label: 'Route', role: 'primary', flex: 1.48, minWidth: ROUTE_FLOOR };
const RECIPIENT: TableColumn = { label: 'Recipient', role: 'primary', flex: 1.0, minWidth: RECIPIENT_FLOOR };
/** The Duration header carries an ⓘ across every order table (per the wireframes'
 *  `Duration ⓘ` header) — the column shows the order's fulfilment time (Doc 4);
 *  the ⓘ's hover tooltip names it. */
const DURATION: TableColumn = {
  label: 'Duration',
  role: 'utility',
  width: 110,
  showTrailingIcon: true,
  trailingIcon: 'Info',
  trailingIconTooltip: 'Total fulfilment time',
};
/** Alias kept for the finished presets (same header + tooltip as base Duration). */
const DURATION_FINISHED: TableColumn = DURATION;
/**
 * Distance (§2.4) — depot → drop-off road distance, e.g. `"4.2 Km"`. A **Utility**
 * column: fixed width, never flexible, sized to content. The *header word* sets the
 * width, not the value (`"12.4 Km"` is far narrower than `"Distance"`), which is why
 * 90px rather than something tighter.
 *
 * Present on **every** order table — dispatchers use it to plan routes, choose whom
 * to assign, and judge fulfilment feasibility, so it is not an optional toggle.
 *
 * Consequence (§4.3, accepted 2026-08-04): it raises every table's minimum width by
 * 90px, which pushes the two densest shapes past the 1320px design canvas — the
 * dispatched (1346) and finished (1356) views therefore horizontally scroll below
 * those widths, with Order ID pinned left and Actions pinned right. The sparse views
 * (Scheduled/Returned 1076, Pending 1186, Broadcasted 1276, All 980) keep flex-filling
 * with room to spare. Trimming the flexible floors to avoid this was rejected: the
 * Recipient floor exists so the phone never truncates (§6).
 */
const DISTANCE: TableColumn = { label: 'Distance', role: 'utility', width: 90 };
const CREATED: TableColumn = { label: 'Created', role: 'utility', width: 120 };
const STATUS: TableColumn = { label: 'Status', role: 'utility', width: 140 };
/** Order table: single overflow button — 64px (§ Instance A). */
const ACTIONS_OVERFLOW: TableColumn = { label: '', role: 'control', width: 64, accessibleName: 'Actions', pinned: 'right' };
/** Unassigned views: Dispatch button + overflow — 154px (§ Instance B). */
const ACTIONS_DISPATCH: TableColumn = { label: '', role: 'control', width: 154, accessibleName: 'Actions', pinned: 'right' };
/** Order table, Delivered/Cancelled: single labelled "View Logs" button, no ⋯ menu — 126px (§2.1). */
const ACTIONS_VIEW_LOGS: TableColumn = { label: '', role: 'control', width: 126, accessibleName: 'Actions', pinned: 'right' };

/**
 * Instance A — Order Table (dispatched & finished: Assigned, At Depot, In Transit,
 * Arrived, Delivered, Returned, Cancelled). The full-column shape — any state where
 * a driver and a trip exist. Actions is 64 (overflow only). Duration carries the SLA.
 */
export const ORDER_TABLE_COLUMNS: TableColumn[] = [
  ORDER_ID, TRIP, DRIVER, ROUTE, RECIPIENT, DISTANCE, DURATION, CREATED, STATUS, ACTIONS_OVERFLOW,
];

/**
 * Instance A — Order Table, **Delivered/Cancelled (Finished) view**. Same column
 * *order* as {@link ORDER_TABLE_COLUMNS}, with two terminal-state differences:
 * - Actions is a single labelled "View Logs" button, no ⋯ menu → 126px (§2.1).
 * - **No Checkbox** (ruled 2026-07-09): terminal orders carry no bulk actions, so
 *   like the All view they omit the selection target. **Consume with
 *   `<Table selectable={false}>`** — passing `selectable` would re-add the 52px
 *   checkbox column the finished shape must not have.
 */
export const ORDER_TABLE_COLUMNS_FINISHED: TableColumn[] = [
  ORDER_ID, TRIP, DRIVER, ROUTE, RECIPIENT, DISTANCE, DURATION_FINISHED, CREATED, STATUS, ACTIONS_VIEW_LOGS,
];

/**
 * Instance B — Unassigned Orders, **Pending view**. No driver and no trip yet, so
 * both columns are removed; Route/Recipient re-weight to 60/40 automatically.
 * Actions is 154 (Dispatch + overflow). No Batch ID.
 */
export const UNASSIGNED_ORDER_COLUMNS: TableColumn[] = [
  ORDER_ID, ROUTE, RECIPIENT, DISTANCE, DURATION, CREATED, STATUS, ACTIONS_DISPATCH,
];

/**
 * Instance B — Unassigned Orders, **Broadcasted view**. Pending set **plus Batch ID**
 * (90px, Primary Identifier) after Order ID — broadcasted orders belong to a batch.
 */
export const BROADCASTED_ORDER_COLUMNS: TableColumn[] = [
  ORDER_ID, BATCH_ID, ROUTE, RECIPIENT, DISTANCE, DURATION, CREATED, STATUS, ACTIONS_DISPATCH,
];

/**
 * Instance B — Unassigned Orders, **Scheduled view**. Pending set **minus Duration**
 * (no SLA until an order enters the active queue) and no Batch ID.
 */
export const SCHEDULED_ORDER_COLUMNS: TableColumn[] = [
  ORDER_ID, ROUTE, RECIPIENT, DISTANCE, CREATED, STATUS, ACTIONS_DISPATCH,
];

/**
 * Instance C — All (search / triage) view. The dispatcher searches across mixed
 * statuses; the primary interaction is search + the Status column. No Checkbox,
 * Driver, Trip, Batch ID, or Actions (every row opens the drawer). Order ID is the
 * only pinned anchor on scroll. Duration shows "—" for scheduled rows (caller-set).
 * Use with `<Table selectable={false}>`.
 */
export const ALL_ORDER_COLUMNS: TableColumn[] = [
  ORDER_ID, ROUTE, RECIPIENT, DISTANCE, DURATION, CREATED, STATUS,
];

/**
 * Optional `Last Updated` column (utility, 120px) — hidden by default; splice it in
 * **after `Created`** (before `Status`) when the user enables it via the column
 * control. Raises the table's minimum width, which is what triggers horizontal
 * scroll (§4.3) on a constrained viewport.
 */
export const LAST_UPDATED_COLUMN: TableColumn = { label: 'Last Updated', role: 'utility', width: 120 };

/**
 * Optional `Created By` column — hidden by default; splice it in **after
 * `Last Updated`** (before `Status`) when the user enables it via the column
 * control. Low-weight flexible Primary column (§3.3): flex 0.5, 200px floor, no
 * cap — grows slowly on wide viewports without competing with Route/Driver/
 * Recipient for surplus width. Renders the `user-cell` Cell type (avatar + name
 * + email) — the caller supplies `name`/`email`/`avatarSrc` per row.
 */
export const CREATED_BY_COLUMN: TableColumn = { label: 'Created By', role: 'primary', flex: 0.5, minWidth: 200 };

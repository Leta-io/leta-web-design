import * as React from 'react';
import {
  Avatar,
  Badge,
  Button,
  Chip,
  ContentPrimitives,
  NotificationBanner,
  EmptyState,
  SearchInput,
  Table,
  TableDataControl,
  type TableColumn,
} from '@leta-io/components';
import { Icon } from '@leta-io/icons';
import { DriverGroupCard } from './DriverGroupCard.js';
import type { BroadcastModel, NotifiedDriver } from './broadcastModel.js';
import type { DriverGroup, Order } from '../../store/types.js';
import { creatorFor, scheduledOriginFor } from '../../lib/orderMeta.js';

/**
 * The three Dispatch Logs drill-downs (OM §7.5). Each **replaces the whole drawer**
 * body — the drawer keeps its 768px shell but swaps in a `ModalHeaders` with a back
 * arrow + breadcrumb and drops the footer (confirmed 2026-08-03). The order tabs are
 * hidden while drilled in; Back returns to Dispatch Logs, × closes the drawer.
 *
 * - **Batched Orders** — every order in this broadcast batch (both fleet types).
 * - **Priority Driver Groups** — the depot's group ladder. **Managed-fleet only**:
 *   marketplace tenants have no driver groups, so this screen doesn't exist for them.
 * - **Notified Drivers** — every driver the broadcast reached. Marketplace drops the
 *   filter chips, the group badge, the "In house / Supplier / No group" suffix, the
 *   phone line, and the trailing call button + its divider.
 */

export type DrillDown = 'batched-orders' | 'priority-groups' | 'notified-drivers';

export const DRILL_TITLE: Record<DrillDown, string> = {
  'batched-orders': 'Batched Orders',
  'priority-groups': 'Priority Driver Groups',
  'notified-drivers': 'Notified Drivers',
};

const BODY: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--spacing-24px)',
  padding: 'var(--padding-24px) var(--padding-16px)',
};

/**
 * Body variant for a drill-down whose content is a **table** rather than a list.
 *
 * The list screens let their content grow and scroll the whole `ModalShell` body.
 * A table must not do that: scrolling the page pushes the Pagination controls below
 * the fold, so they can only be reached by scrolling past every row. Instead the body
 * is pinned to the shell's height and never scrolls itself — the table fills it
 * (`fillHeight`) and scrolls its own rows internally, keeping Pagination fixed and
 * always reachable. Same model as the main Orders table in `Page`.
 *
 * Bottom padding drops to 16 (from the list screens' 24) so the table stops short of
 * the shell's edge instead of sitting flush against it.
 */
const BODY_TABLE: React.CSSProperties = {
  ...BODY,
  padding: 'var(--padding-24px) var(--padding-16px) var(--padding-16px)',
  boxSizing: 'border-box',
  height: '100%',
  minHeight: 0,
  overflow: 'hidden',
};

/**
 * Drill-down toolbar — the wireframes' `Table Data Control` with everything except
 * the search field and the count switched off: the Created / Filter / Sort buttons
 * and the Columns button are all `visible: false` in Figma, and the project rule is
 * never to implement a hidden node. So both slots are overridden with the bare
 * content, rather than taking the variant's defaults.
 */
/**
 * No-search-results state for a nested drawer.
 *
 * **Uses the illustrated (with-icon) `no-results` EmptyState.** The rule (ruled
 * 2026-08-05): every search surface with real real-estate — drawers, pages, large
 * modals — gets the illustrated variant. The `showIcon={false}` text-only variant
 * is reserved for *small* surfaces: compact overlays, dropdown menus, inline field
 * pickers. These drill-downs are full-height 768px drawer panels, so they take the
 * illustrated one.
 */
function DrillEmpty({ noun }: { noun: string }): React.ReactElement {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 'var(--padding-40px)', width: '100%' }}>
      <EmptyState type="no-results" size="desktop" description={`Try adjusting your search to find ${noun}.`} />
    </div>
  );
}

function DrillToolbar({
  count,
  leading,
  query,
  onQuery,
}: {
  count: string;
  /** Optional extra right-side text before the count (Batched Orders' "Batch ID: N"). */
  leading?: string;
  query: string;
  onQuery: (v: string) => void;
}): React.ReactElement {
  return (
    <TableDataControl
      variant="search-column"
      searchSection={
        <SearchInput
          placeholder="Search here..."
          value={query}
          onChange={(e) => onQuery(e.currentTarget.value)}
          onClear={() => onQuery('')}
          // 250px per the nested-drawer wireframes (was 240).
          style={{ width: 250 }}
        />
      }
      columnControl={
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-12px)' }}>
          {leading && (
            <>
              {/* Figma `769:80839`: Label/M/Medium on `--text-default-label-idle`
                  (#4f4f4f) — was the darker `--text-default-label`. */}
              <span className="text-label-m-medium" style={{ color: 'var(--text-default-label-idle)', whiteSpace: 'nowrap' }}>
                {leading}
              </span>
              <div aria-hidden style={{ width: 'var(--stroke-xs)', height: 32, backgroundColor: 'var(--border-neutral-default)' }} />
            </>
          )}
          <span className="text-label-m-medium" style={{ color: 'var(--text-default-label-idle)', whiteSpace: 'nowrap' }}>
            {count}
          </span>
        </div>
      }
    />
  );
}

// ── Batched Orders ──────────────────────────────────────────────────────────────

/** Deterministic sibling orders in the same broadcast batch. */
function batchRows(model: BroadcastModel, depotName: string, order: Order) {
  // The batch's sibling orders all share this order's creation source — one
  // lookup, applied uniformly, rather than a per-row guess.
  const creator = creatorFor(order);
  // Every row here renders the "Broadcasted" badge — i.e. still unassigned — and
  // the Broadcast provenance icon only appears once a driver holds the order
  // (§7.2). So it is never eligible on these rows.
  const broadcastIcon = false;
  const scheduledIcon = scheduledOriginFor(order);
  const ROUTES = [
    '3B Mango Lane, Kilimani, Nairobi',
    '7C Cedar Court, Lavington, Nairobi',
    '5D Olive Drive, Karen, Nairobi',
    '2E Maple Avenue, Langata, Nairobi',
    '9F Pine Street, Gigiri, Nairobi',
    '4G Birch Road, Kileleshwa, Nairobi',
    '6H Elm Crescent, Parklands, Nairobi',
    '8J Walnut Boulevard, Donholm, Nairobi',
    '10K Chestnut Way, Rongai, Nairobi',
    '11L Fir Path, Ruai, Nairobi',
  ];
  const DURATIONS = ['0h 11m 5s', '0h 7m 9s', '0h 13m 55s', '0h 9m 45s', '0h 15m 8s', '0h 4m 50s', '0h 6m 33s', '0h 11m 22s', '0h 2m 14s', '0h 5m 59s'];
  // Per the Table Column spec §2.3.1, a counting order pairs its SLA state across
  // Status + Duration; here only a deterministic subset is off-target.
  const SLA: (undefined | 'warning' | 'error')[] = [
    'error', undefined, 'error', 'warning', 'error', undefined, undefined, 'error', undefined, undefined,
  ];
  return ROUTES.map((route, i) => ({
    cells: [
      {
        type: creator.source === 'human' ? ('manual-order' as const) : ('automatic-order' as const),
        orderId: `${model.batchId}-${i + 1}`,
        onCopyOrderId: () => navigator.clipboard.writeText(`${model.batchId}-${i + 1}`),
        showScheduledIcon: scheduledIcon,
        scheduledTooltip: scheduledIcon ? 'Scheduled' : undefined,
        showBroadcastIcon: broadcastIcon,
      },
      { type: 'address-cell' as const, pickup: depotName, dropoff: route },
      {
        type: 'duration' as const,
        durationVariant: 'active' as const,
        durationStatus: SLA[i] === 'error' ? ('delayed' as const) : SLA[i] === 'warning' ? ('at-risk' as const) : ('on-target' as const),
        durationTime: DURATIONS[i],
      },
      {
        type: 'status' as const,
        // Every order in a batch is, by definition, out on the same broadcast.
        statusContent: <Badge color="information" label="Broadcasted" />,
        statusIcon: SLA[i],
        statusIconTooltip: SLA[i] === 'warning' ? 'At Risk' : SLA[i] === 'error' ? 'Delayed' : undefined,
      },
    ],
  }));
}

/**
 * Reduced column set for this embedded table (Table Column spec, Modal/embedded rule):
 * fewer columns than the full Orders table, but the same weighting logic — Route is
 * the widest primary, Order ID is a low-weight flexible identifier, control columns
 * stay fixed. The Batch ID is redundant here (every row shares it) so it's omitted.
 */
const BATCH_COLUMNS: TableColumn[] = [
  { label: 'Order ID', role: 'identifier', minWidth: 150, flex: 0.5 },
  { label: 'Route', role: 'primary', minWidth: 176, flex: 1.48 },
  { label: 'Duration', role: 'secondary', width: 110, trailingIcon: 'Question', trailingIconTooltip: 'Elapsed fulfilment time' },
  { label: 'Status', role: 'secondary', width: 140 },
];

/** Batch rows per page — matches the Orders table's default page size. */
const BATCH_PAGE_SIZE = 10;

function BatchedOrdersScreen({ model, depotName, order }: { model: BroadcastModel; depotName: string; order: Order }): React.ReactElement {
  const [query, setQuery] = React.useState('');
  const [page, setPage] = React.useState(1);
  const rows = React.useMemo(() => batchRows(model, depotName, order), [model, depotName, order]);
  const filtered = query.trim()
    ? rows.filter((r) => JSON.stringify(r.cells).toLowerCase().includes(query.trim().toLowerCase()))
    : rows;

  // `Table` renders the Pagination footer but does NOT slice — the host owns paging
  // (same contract the Orders table uses). Left unpassed, `countLabel`/`pageCount`
  // fall back to their placeholder defaults ("Showing 10 of 180", 10 pages), which
  // only became visible once the footer stopped being pushed off-screen.
  const pageCount = Math.max(1, Math.ceil(filtered.length / BATCH_PAGE_SIZE));
  const current = Math.min(page, pageCount);
  const pageRows = filtered.slice((current - 1) * BATCH_PAGE_SIZE, current * BATCH_PAGE_SIZE);
  // A narrowed search can leave the current page out of range — go back to the first.
  const onQuery = (q: string) => { setQuery(q); setPage(1); };

  return (
    <div style={BODY_TABLE}>
      <DrillToolbar
        leading={`Batch ID: ${model.batchId}`}
        count={`${filtered.length} Orders`}
        query={query}
        onQuery={onQuery}
      />
      {/* `complex` (80px) rows — same density as the main Orders table; the
          address cell needs the two-line height, and a shorter `basic` row was
          the reported height mismatch.

          `fillHeight`: the table takes the remaining height of the pinned body and
          scrolls its rows internally, so Pagination stays put at the bottom instead
          of being pushed off-screen (see {@link BODY_TABLE}). */}
      {filtered.length === 0 ? (
        <DrillEmpty noun="orders" />
      ) : (
        <Table
          columns={BATCH_COLUMNS}
          rows={pageRows}
          selectable={false}
          scrollX="auto"
          rowVariant="complex"
          fillHeight
          page={current}
          pageCount={pageCount}
          onPageChange={setPage}
          rowsPerPage={BATCH_PAGE_SIZE}
          countLabel={`Showing ${pageRows.length} of ${filtered.length}`}
        />
      )}
    </div>
  );
}

// ── Priority Driver Groups ──────────────────────────────────────────────────────

function PriorityGroupsScreen({ model }: { model: BroadcastModel }): React.ReactElement {
  const [query, setQuery] = React.useState('');
  const groups: DriverGroup[] = model.config?.groups ?? [];
  const filtered = query.trim()
    ? groups.filter((g) => g.name.toLowerCase().includes(query.trim().toLowerCase()))
    : groups;
  // The live leg (if any) marks which group is currently receiving the broadcast.
  const liveTitle = model.legs.find((l) => l.outcome === 'broadcasting')?.title ?? '';

  return (
    <div style={BODY}>
      <DrillToolbar count={`${filtered.length} Groups`} query={query} onQuery={setQuery} />
      {/* Explains the sequence shape the admin configured for this depot. */}
      {model.config && (
        <NotificationBanner
          type="highlight"
          variant="filled"
          icon="Fix"
          title="Broadcast Fallback"
          description={
            model.config.fallbackEnabled
              ? `The broadcast will run for ${model.config.rounds} round${model.config.rounds === 1 ? '' : 's'} through all priority groups. If no driver accepts, all available drivers near the depot will receive the broadcast.`
              : `The broadcast will run for ${model.config.rounds} round${model.config.rounds === 1 ? '' : 's'} through all priority groups. No fallback round is configured for this depot.`
          }
        />
      )}
      {filtered.length === 0 && <DrillEmpty noun="driver groups" />}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-16px)', width: '100%' }}>
        {filtered.map((g) => {
          // Which group is live comes from the shared broadcast clock, not from
          // string-matching the status-card title — so as the sequence escalates,
          // the "Broadcasting" badge moves down the ladder on its own and the
          // per-attempt bar restarts on each retry instead of sticking at 100%.
          const gi = groups.indexOf(g);
          const activeLeg = model.live?.activeIndex != null ? model.live.legs[model.live.activeIndex] : null;
          const isLive = model.live
            ? activeLeg?.kind === 'group' && activeLeg.groupIndex === gi
            : liveTitle.startsWith(g.name);
          return (
            <DriverGroupCard
              key={g.priority}
              group={g}
              ladder={groups}
              fallbackEnabled={model.config?.fallbackEnabled ?? false}
              broadcasting={!!isLive}
              elapsedSeconds={isLive ? (model.live?.legElapsedSeconds ?? 0) : 0}
              attemptPct={isLive ? (model.live?.attemptPct ?? 0) : 0}
              attempt={isLive ? (model.live?.attempt ?? 1) : 1}
            />
          );
        })}
      </div>
    </div>
  );
}

// ── Notified Drivers ────────────────────────────────────────────────────────────

/** Group chips derived from the actual notified set (managed-fleet only). */
function driverChips(drivers: NotifiedDriver[]): { key: string; label: string }[] {
  const counts = new Map<string, number>();
  for (const d of drivers) if (d.groupLabel) counts.set(d.groupLabel, (counts.get(d.groupLabel) ?? 0) + 1);
  // P1 → P2 → P3 → Fallback → Pre-Offer, matching the wireframes' chip order.
  const order = ['P1', 'P2', 'P3', 'P4', 'Fallback', 'Pre-Offer'];
  return [
    { key: 'all', label: `All (${drivers.length})` },
    ...order.filter((k) => counts.has(k)).map((k) => ({ key: k, label: `${k} (${counts.get(k)})` })),
  ];
}

function NotifiedDriversScreen({ model }: { model: BroadcastModel }): React.ReactElement {
  const [query, setQuery] = React.useState('');
  const [chip, setChip] = React.useState('all');
  const marketplace = model.fleetType === 'marketplace';
  const chips = marketplace ? [] : driverChips(model.notifiedDrivers);

  const filtered = model.notifiedDrivers.filter((d) => {
    if (chip !== 'all' && d.groupLabel !== chip) return false;
    if (!query.trim()) return true;
    return `${d.name} ${d.phone}`.toLowerCase().includes(query.trim().toLowerCase());
  });

  return (
    <div style={BODY}>
      <DrillToolbar count={`${filtered.length} Drivers`} query={query} onQuery={setQuery} />
      {chips.length > 1 && (
        <div style={{ display: 'flex', gap: 'var(--spacing-8px)', flexWrap: 'wrap' }}>
          {chips.map((c) => (
            <Chip key={c.key} label={c.label} active={chip === c.key} onClick={() => setChip(c.key)} />
          ))}
        </div>
      )}
      {filtered.length === 0 && <DrillEmpty noun="drivers" />}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-16px)', width: '100%' }}>
        {filtered.map((d, i) => (
          <React.Fragment key={d.id}>
            {i > 0 && <div style={{ height: 0, borderTop: 'var(--stroke-xs) solid var(--border-neutral-default)', width: '100%' }} />}
            <ContentPrimitives
              type="utility"
              text={
                marketplace ? (
                  d.name
                ) : (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--spacing-8px)' }}>
                    <span>{d.name}</span>
                    {d.groupLabel && <Badge color="neutral" label={d.groupLabel} />}
                  </span>
                )
              }
              // Marketplace drops the phone line + group suffix entirely.
              subtext={marketplace ? undefined : `${d.phone} · ${d.groupSuffix ?? 'No group'}`}
              showSubtext={!marketplace}
              showVisualAnchor
              showLeadingIcon={false}
              showAvatar
              avatarName={d.name}
              showTrailingContent
              showPassiveElements
              passiveElements={
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-8px)' }}>
                  <span style={{ display: 'flex', color: 'var(--icons-neutral-default)' }}>
                    <Icon name="Broadcast" outlined size={16} />
                  </span>
                  <span className="text-label-s-regular" style={{ color: 'var(--text-default-sub-body)', whiteSpace: 'nowrap' }}>
                    {d.notifications} Notification{d.notifications === 1 ? '' : 's'}
                  </span>
                  {/* Marketplace drops the divider + call button (no VOIP contact path). */}
                  {!marketplace && (
                    <div style={{ width: 0, height: 20, borderLeft: 'var(--stroke-xs) solid var(--border-neutral-default)' }} />
                  )}
                </div>
              }
              showInteractiveElements={!marketplace}
              interactiveElements={
                marketplace ? undefined : (
                  // Inert — VOIP-gated per the designer's note; no call flow exists yet.
                  <Button variant="secondary" size="medium" iconOnly="Phone" iconOutlined aria-label="Call driver" />
                )
              }
            />
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

// ── Router ──────────────────────────────────────────────────────────────────────

export function DispatchLogsDrillDown({
  drill,
  model,
  depotName,
  order,
}: {
  drill: DrillDown;
  model: BroadcastModel;
  depotName: string;
  order: Order;
}): React.ReactElement {
  if (drill === 'batched-orders') return <BatchedOrdersScreen model={model} depotName={depotName} order={order} />;
  if (drill === 'priority-groups') return <PriorityGroupsScreen model={model} />;
  return <NotifiedDriversScreen model={model} />;
}

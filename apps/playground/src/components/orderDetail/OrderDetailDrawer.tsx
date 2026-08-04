import * as React from 'react';
import { createPortal } from 'react-dom';
import {
  AccordionHeader,
  AccordionChevron,
  AccordionContent,
  useAccordion,
  Badge,
  Button,
  ContentCard,
  ContentPrimitives,
  DesktopMenuOptions,
  DOORSTEP_DELIVERY_IMAGE,
  EmptyState,
  FooterFrame,
  HoverTip,
  ModalDialog,
  ModalHeaders,
  ModalShell,
  NotificationBanner,
  PageTabsControl,
  Pagination,
  SIGNATURE_IMAGE,
  Skeleton,
} from '@leta/components';
import { Icon, type IconName } from '@leta/icons';
import { useStore } from '../../store/useStore.js';
import type { Client, ClientConfig, Driver, Order, OrderStatus } from '../../store/types.js';
import { ORDER_STATUS_BADGE, ORDER_STATUS_BADGE_ICON, ORDER_STATUS_LABEL } from '../../store/types.js';
import { Popover, MenuPanel, MenuDivider } from '../Popover.js';
import { buildActivityTrail, DISPATCHER_NAME, type ActivityItem } from './activityModel.js';
import { CURRENT_USER } from '../../store/currentUser.js';
import { ActivityTimeline, ActivityComposerSection, ActivityTerminalNotice } from './ActivityTab.js';
import { buildOrderDetail, type OrderDetailModel, type ProofFile } from './detailModel.js';
import { ExpandedMapOverlay } from './OrderDetailMap.js';
import { OrderOverviewCard } from './OrderOverviewCard.js';
import { buildBroadcastModel } from './broadcastModel.js';
import { seededOffsetSeconds } from './liveBroadcast.js';
import { idHash } from '../../lib/orderMeta.js';
import { DispatchLogsTab } from './DispatchLogsTab.js';
import { DispatchLogsDrillDown, DRILL_TITLE, type DrillDown } from './DispatchLogsDrillDowns.js';

/**
 * View Order drawer (Order Detail View, OM §7) — the Overview tab of the
 * per-status wireframes `320:99590` (all 12 screens are this ONE component
 * driven by the live order's status + provenance + client config; enumerated
 * 2026-07-20, see design-parity/view-order-overview-inventory.md).
 *
 * Right-anchored full-height side sheet (the AddOrderDrawer pattern): scrim +
 * 768px `ModalShell fillHeight` with `ModalHeaders` (status badge + provenance
 * icons + Order ID / Tracking Link CTAs + Overview·Activity·Dispatch Logs
 * tabs), the state-driven Overview body, and the per-status `FooterFrame`
 * (§12.7 + the v2.8 Update-Status scoping). Activity + Dispatch Logs render an
 * empty-state placeholder until their wireframes are built.
 */

// Drawer motion (mirrors the AddOrderDrawer's side-sheet choreography) is
// driven by inline styles from the `entered`/`closing` state — deterministic
// regardless of stylesheet lifecycle.

// Tab-switch body transition — a one-shot fade + slight rise on the newly
// mounted panel (Overview / Activity / Dispatch Logs, or a Dispatch Logs
// drill-down). A `transition` class needs a subsequent style change to
// animate and races the double-rAF timing the drawer slide needed; a
// `@keyframes` animation instead runs unconditionally from the moment a new
// element mounts, which is exactly the case here (the body is re-keyed per
// tab, so React always mounts a fresh node on switch).
let tabFadeStylesInjected = false;
function ensureTabFadeStyles(): void {
  if (tabFadeStylesInjected || typeof document === 'undefined') return;
  tabFadeStylesInjected = true;
  const el = document.createElement('style');
  el.setAttribute('data-leta', 'order-detail-tab-fade');
  el.textContent = `
@keyframes leta-tab-body-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
.leta-tab-body-enter { animation: leta-tab-body-in 220ms cubic-bezier(0.2, 0, 0, 1); }
@media (prefers-reduced-motion: reduce) { .leta-tab-body-enter { animation: none; } }`;
  document.head.appendChild(el);
}

/** Footer/actions surface for a status (§12.7 drawer footer + v2.8 ruling). */
function footerFor(status: OrderStatus): {
  leading: 'cancel' | 'return' | null;
  trailing: ('addToTrip' | 'changeDriver' | 'editOrder' | 'dispatch' | 'updateStatus' | 'addComment')[];
  overflow: ('updateStatus' | 'reschedule' | 'addComment')[];
} {
  switch (status) {
    case 'assigned':
    case 'at-depot':
      return { leading: 'cancel', trailing: ['addToTrip', 'changeDriver', 'editOrder'], overflow: ['updateStatus', 'reschedule', 'addComment'] };
    case 'in-transit':
    case 'arrived':
      return { leading: 'return', trailing: ['updateStatus'], overflow: ['addComment'] };
    case 'returning':
      return { leading: null, trailing: ['addComment'], overflow: [] };
    case 'delivered':
    case 'cancelled':
      return { leading: null, trailing: [], overflow: [] };
    case 'returned':
      // Returned keeps the Ready footer but its ⋯ drops Update Status (OM v2.8).
      return { leading: 'cancel', trailing: ['addToTrip', 'editOrder', 'dispatch'], overflow: ['reschedule', 'addComment'] };
    default:
      return { leading: 'cancel', trailing: ['addToTrip', 'editOrder', 'dispatch'], overflow: ['updateStatus', 'reschedule', 'addComment'] };
  }
}

/** 1s heartbeat while `active` — drives the live counters (drawer-only, §7.2). */
function useTicker(active: boolean): number {
  const [tick, setTick] = React.useState(0);
  React.useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setTick((v) => v + 1), 1000);
    return () => clearInterval(t);
  }, [active]);
  return tick;
}

// ── Local building blocks (wireframe ad-hoc pieces — see adhoc-registry.json) ────

/** White section card using the shared **Accordion Behaviour** (`@leta/components`):
 *  hovering anywhere on the section-heading row highlights the trailing chevron,
 *  clicking toggles, and the body opens/closes with a smooth ease-in-out reveal.
 *  Mirrors the Figma "Order Detail Accordions" component (card: pad 20, radius xl,
 *  1px border; header→body gap 12; body 20px-gap column). */
function Section({
  title,
  count,
  children,
  defaultOpen = true,
}: {
  title: string;
  count?: number;
  children: React.ReactNode;
  defaultOpen?: boolean;
}): React.ReactElement {
  const { open, toggle } = useAccordion(defaultOpen);
  return (
    <div
      style={{
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        gap: 0,
        width: '100%',
        backgroundColor: 'var(--surface-neutral-bg-default)',
        borderRadius: 'var(--rounding-xl)',
        border: 'var(--stroke-xs) solid var(--border-neutral-default)',
        padding: 'var(--padding-20px)',
      }}
    >
      <AccordionHeader open={open} onToggle={toggle}>
        <ContentPrimitives
          type="section-heading"
          text={
            count != null ? (
              <>
                {title}{' '}
                <span className="text-body-l-regular" style={{ color: 'var(--text-default-sub-body)' }}>
                  ({count})
                </span>
              </>
            ) : (
              title
            )
          }
          showSubtext={false}
          showVisualAnchor={false}
          showTrailingContent
          showPassiveElements={false}
          showInteractiveElements
          interactiveElements={<AccordionChevron open={open} onToggle={toggle} />}
        />
      </AccordionHeader>
      <AccordionContent open={open} gap="var(--spacing-20px)">
        {children}
      </AccordionContent>
    </div>
  );
}

/** A skeleton stand-in for one `Section` card — same chrome (white, radius xl,
 *  1px border, pad 20), a title-width bar in place of the real heading, and a
 *  few field-shaped bars in place of real content. */
function SectionSkeleton({ rows = 2 }: { rows?: number }): React.ReactElement {
  return (
    <div
      style={{
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--spacing-20px)',
        width: '100%',
        backgroundColor: 'var(--surface-neutral-bg-default)',
        borderRadius: 'var(--rounding-xl)',
        border: 'var(--stroke-xs) solid var(--border-neutral-default)',
        padding: 'var(--padding-20px)',
      }}
    >
      <Skeleton width={140} height={20} />
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} style={{ display: 'flex', gap: 'var(--spacing-16px)', width: '100%' }}>
          <Skeleton width="50%" height={36} />
          <Skeleton width="50%" height={36} />
        </div>
      ))}
    </div>
  );
}

/** Overview-tab skeleton (§9) — mirrors `SkeletonTableRows`' real-header/
 *  skeleton-body split: the drawer's own header/footer render normally, only
 *  this body region stands in while `loading` is true. Shown briefly on drawer
 *  open and whenever an action keeps the drawer open (re-fetch simulation). */
function DrawerSkeleton(): React.ReactElement {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading order details"
      style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-20px)', padding: 'var(--padding-24px) var(--padding-16px) var(--padding-40px)' }}
    >
      <Skeleton width="100%" height={168} borderRadius="var(--rounding-xl)" />
      <SectionSkeleton rows={1} />
      <SectionSkeleton rows={2} />
      <SectionSkeleton rows={3} />
    </div>
  );
}

/** One label + icon+value field (the wireframes' vertical-list-row CP). */
function Field({ label, value, icon }: { label: string; value: string; icon?: IconName }): React.ReactElement {
  return (
    <ContentPrimitives
      type="vertical-list-row"
      titleName={label}
      listRowText={value}
      showDescriptionLeadingIcon={!!icon}
      descriptionLeadingIcon={icon ?? 'Question'}
      showInteractiveElements={false}
      style={{ flex: '1 0 0', minWidth: 0 }}
    />
  );
}

/** Two fields per row (the wireframes' 2-col List Row grid). */
function FieldRows({ fields }: { fields: React.ReactNode[] }): React.ReactElement {
  const rows: React.ReactNode[][] = [];
  for (let i = 0; i < fields.length; i += 2) rows.push(fields.slice(i, i + 2));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-20px)', width: '100%' }}>
      {rows.map((pair, i) => (
        <div key={i} style={{ display: 'flex', gap: 'var(--spacing-16px)', width: '100%' }}>
          {pair}
          {pair.length === 1 && <div style={{ flex: '1 0 0' }} />}
        </div>
      ))}
    </div>
  );
}

/** Proof-image row: thumbnail + label/filename + View (POP / POD / signature).
 *  Figma: Content frame gap 20 (leading↔View); Leading Content gap 8 (image↔text);
 *  image thumbnail 44×44, radius `md`. */
function ProofRow({ file, onView }: { file: ProofFile; onView: (f: ProofFile) => void }): React.ReactElement {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-20px)', flex: '1 0 0', minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-8px)', flex: '1 0 0', minWidth: 0 }}>
        <img
          src={file.src}
          alt={file.label}
          style={{
            width: 44,
            height: 44,
            objectFit: 'cover',
            borderRadius: 'var(--rounding-md)',
            border: 'var(--stroke-xs) solid var(--border-neutral-default)',
            flexShrink: 0,
            backgroundColor: 'var(--surface-neutral-bg-default)',
          }}
        />
        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: '1 0 0' }}>
          <span className="text-label-m-semibold" style={{ color: 'var(--text-default-heading)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {file.label}
          </span>
          <span className="text-label-s-regular" style={{ color: 'var(--text-default-sub-body)' }}>{file.fileName}</span>
        </div>
      </div>
      <Button variant="secondary" size="medium" onClick={() => onView(file)}>View</Button>
    </div>
  );
}


// ── The drawer ───────────────────────────────────────────────────────────────────

export interface OrderDetailActions {
  dispatch: (id: string) => void;
  requestCancel: (ids: string[]) => void;
  requestUpdateStatus: (ids: string[]) => void;
  requestReschedule: (ids: string[]) => void;
  requestEdit: (id: string) => void;
  addToTrip: (id: string) => void;
  changeDriver: (id: string) => void;
  /**
   * Re-broadcast after an exhausted sequence. Only reachable from the Dispatch
   * Logs tab — the Overview card's CTA is "View Logs" precisely because that tab
   * owns this action (the wireframe's ⋯ menu has no Re-broadcast item).
   */
  rebroadcast: (id: string) => void;
  /**
   * The live broadcast sequence ran to its end with nobody accepting — the host
   * drops the order back to Pending, which flips Dispatch Logs to its Exhausted
   * shape (OM §7.5). Fired once per order.
   */
  broadcastExhausted: (id: string) => void;
  /** Unbuilt actions (Return Order / Add Comment / Recipient Map). */
  stub: (title: string) => void;
}

export function OrderDetailDrawer({
  orderId,
  onClose,
  actions,
  loading = false,
  commentIntent = false,
  dispatchLogsIntent = false,
}: {
  /** The order to show; null renders nothing. */
  orderId: string | null;
  onClose: () => void;
  actions: OrderDetailActions;
  /** Externally-driven skeleton (§9) — set briefly by the host after an action
   *  that keeps the drawer open, so the refreshed data reads as "just fetched"
   *  rather than silently swapping in place. The drawer also shows its own
   *  brief skeleton on first open for a given order, independent of this. */
  loading?: boolean;
  /** Open straight into the Activity tab with the comment composer expanded &
   *  focused (used by the "Add Comment" entry points). Consumed once per order,
   *  when the drawer opens (DrawerBody remounts per order id). */
  commentIntent?: boolean;
  /** Open straight into the Dispatch Logs tab (used by the "View Logs" entry
   *  points — the row ⋯ menu and the Finished table's Actions button). Consumed
   *  once per order, same as `commentIntent`. */
  dispatchLogsIntent?: boolean;
}): React.ReactElement | null {
  const orders = useStore((s) => s.orders);
  const getDriver = useStore((s) => s.getDriver);
  // The whole client, not just `config` — Dispatch Logs needs the platform-provisioned
  // `fleetType` too, which deliberately sits outside the tenant-editable config.
  const client = useStore((s) => s.client);
  const config = client.config;

  const order = orderId ? (orders.find((o) => o.id === orderId) ?? null) : null;

  // Enter/exit choreography (kept mounted through the exit). A single rAF
  // fires before the browser paints the initial (offscreen) state, so the
  // mount render and the `entered` flip can land in the same paint and skip
  // the slide-in entirely (confirmed live) — nest a second rAF to guarantee
  // an intervening paint.
  const [entered, setEntered] = React.useState(false);
  const [closing, setClosing] = React.useState(false);
  React.useEffect(() => {
    if (order) {
      let raf2 = 0;
      const raf1 = requestAnimationFrame(() => {
        raf2 = requestAnimationFrame(() => setEntered(true));
      });
      return () => {
        cancelAnimationFrame(raf1);
        cancelAnimationFrame(raf2);
      };
    }
    setEntered(false);
    setClosing(false);
    return undefined;
  }, [!!order]);
  const close = () => {
    if (closing) return;
    setClosing(true);
    setTimeout(onClose, 220);
  };

  if (!order) return null;

  return (
    <DrawerBody
      // Keyed by order id: DrawerBody remounts per order, so its tab + composer
      // state re-initialize from `commentIntent` on each open (no reset effect
      // needed).
      key={order.id}
      order={order}
      driverId={order.driverId}
      getDriver={getDriver}
      configKey={config}
      client={client}
      entered={entered}
      closing={closing}
      commentIntent={commentIntent}
      dispatchLogsIntent={dispatchLogsIntent}
      onClose={close}
      actions={actions}
      loading={loading}
    />
  );
}

function DrawerBody({
  order,
  driverId,
  getDriver,
  configKey: config,
  client,
  entered,
  closing,
  commentIntent = false,
  dispatchLogsIntent = false,
  onClose,
  actions,
  loading,
}: {
  order: Order;
  driverId: string | null;
  getDriver: (id: string | null | undefined) => Driver | undefined;
  configKey: ClientConfig;
  client: Client;
  entered: boolean;
  closing: boolean;
  commentIntent?: boolean;
  dispatchLogsIntent?: boolean;
  onClose: () => void;
  actions: OrderDetailActions;
  loading: boolean;
}): React.ReactElement {
  ensureTabFadeStyles();
  // Tab + composer state live here (DrawerBody remounts per order via the
  // `key={order.id}`), so both initialize from `commentIntent`/`dispatchLogsIntent`:
  // an Add-Comment open lands on the Activity tab (index 1) with the composer
  // already expanded; a View-Logs open lands on the Dispatch Logs tab (index 2).
  const [tab, setTab] = React.useState(commentIntent ? 1 : dispatchLogsIntent ? 2 : 0);
  // Brief skeleton on first open for this order (remounts via the `key={order.id}`
  // above, so this resets per order) — independent of the externally-driven
  // `loading` prop (action-triggered refresh while staying open).
  const [justOpened, setJustOpened] = React.useState(true);
  React.useEffect(() => {
    const t = setTimeout(() => setJustOpened(false), 450);
    return () => clearTimeout(t);
  }, []);
  const showSkeleton = justOpened || loading;
  const driver = driverId ? (getDriver(driverId) ?? null) : null;
  const model = React.useMemo(
    () => buildOrderDetail(order, driver, config, { photo: DOORSTEP_DELIVERY_IMAGE, signature: SIGNATURE_IMAGE }),
    [order, driver, config],
  );
  const activityItems = React.useMemo(() => buildActivityTrail(model, config), [model, config]);
  // ── The live broadcast clock ──
  // A sequence genuinely runs while the drawer is open: `broadcastStartedAt` is the
  // origin and this ticks the derived seconds, so the active priority group
  // escalates, the per-attempt bars restart per retry, and the timeline grows —
  // all from one clock (see liveBroadcast.ts).
  // A real re-broadcast stores its own origin; a seeded order gets one derived
  // from ITS depot's ladder, back-dated into the first ~70% so it opens
  // mid-sequence with runway left. Derived (not stored) so it resets on reload —
  // which is what keeps demos repeatable while the sequence really does advance.
  // Deriving per-config matters: a fixed offset overshot short ladders (a 65s
  // two-group depot) and those orders exhausted the moment the drawer opened.
  const depotBroadcastConfig = model.depot?.broadcast ?? null;
  const seededStartedAt = React.useMemo(
    () =>
      depotBroadcastConfig
        ? Date.now() - seededOffsetSeconds(depotBroadcastConfig, idHash(order.id)) * 1000
        : null,
    [depotBroadcastConfig, order.id],
  );
  const broadcastStartedAt =
    order.status === 'broadcasted' ? (order.broadcastStartedAt ?? seededStartedAt) : null;
  const isLiveBroadcast = broadcastStartedAt != null;
  const [broadcastSeconds, setBroadcastSeconds] = React.useState(() =>
    broadcastStartedAt != null ? Math.max(0, (Date.now() - broadcastStartedAt) / 1000) : 0,
  );
  React.useEffect(() => {
    if (!isLiveBroadcast || broadcastStartedAt == null) return;
    const tick = () => setBroadcastSeconds(Math.max(0, (Date.now() - broadcastStartedAt) / 1000));
    tick();
    // 500ms keeps the bars smooth without a per-frame cost; every consumer reads
    // the same value so nothing can drift.
    const t = setInterval(tick, 500);
    return () => clearInterval(t);
  }, [isLiveBroadcast, broadcastStartedAt]);

  // Dispatch Logs (§7.5) — the seven broadcast shapes. The state and the
  // accepting driver both come from `model.narrative`, the drawer's single
  // dispatch-provenance derivation, so this tab can never disagree with the
  // Overview banner or the Activity trail.
  const broadcast = React.useMemo(
    () =>
      buildBroadcastModel(
        order,
        client,
        model.depot,
        driver ? { name: driver.name, phone: driver.phone } : null,
        model.narrative,
        isLiveBroadcast ? broadcastSeconds : undefined,
      ),
    [order, client, model.depot, driver, model.narrative, isLiveBroadcast, broadcastSeconds],
  );

  // The sequence ran to the end with nobody accepting → the order drops back to
  // Pending and the tab flips to its Exhausted shape (with Re-broadcast). Done in
  // an effect, once, because it is a state transition rather than a render value.
  const exhaustedRef = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (!isLiveBroadcast || !broadcast.live?.exhausted) return;
    if (exhaustedRef.current === order.id) return;
    exhaustedRef.current = order.id;
    actions.broadcastExhausted(order.id);
  }, [isLiveBroadcast, broadcast.live?.exhausted, order.id, actions]);
  // Dispatch Logs drill-down (Batched Orders / Priority Driver Groups /
  // Notified Drivers). Rather than swapping the drawer body in place, the
  // drill-down is a SECOND panel that **slides in over the parent drawer** —
  // the same side-sheet choreography as opening the drawer itself (ruled
  // 2026-08-04). `drill` holds the active screen (kept set through the
  // slide-out so its content stays rendered while it animates away);
  // `drillEntered`/`drillClosing` drive the transform, mirroring the parent's
  // `entered`/`closing`.
  const [drill, setDrill] = React.useState<DrillDown | null>(null);
  const [drillEntered, setDrillEntered] = React.useState(false);
  const [drillClosing, setDrillClosing] = React.useState(false);
  const drillCloseTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  // Double rAF so the initial (offscreen) transform paints before `entered`
  // flips — same reason the drawer/dialog slide-ins need it.
  React.useEffect(() => {
    if (!drill || drillClosing) return;
    let r2 = 0;
    const r1 = requestAnimationFrame(() => { r2 = requestAnimationFrame(() => setDrillEntered(true)); });
    return () => { cancelAnimationFrame(r1); cancelAnimationFrame(r2); };
  }, [drill, drillClosing]);
  const openDrill = (d: DrillDown) => {
    if (drillCloseTimer.current) { clearTimeout(drillCloseTimer.current); drillCloseTimer.current = null; }
    setDrillClosing(false);
    setDrillEntered(false);
    setDrill(d);
  };
  const closeDrill = () => {
    if (!drill || drillClosing) return;
    setDrillClosing(true);
    drillCloseTimer.current = setTimeout(() => {
      setDrill(null);
      setDrillEntered(false);
      setDrillClosing(false);
    }, 320);
  };
  const status = order.status;
  // Terminal states show the driver card in read-only "view" mode: a single Open
  // button (like the trip card), not the active Change-driver + Call buttons
  // (verified against Delivered `1094:83886` / Cancelled `1237:86144`).
  const terminal = status === 'delivered' || status === 'cancelled';
  const footer = footerFor(status);

  // Live counters (drawer-only, §7.2): elapsed fulfilment + summary sub-copy.
  const openedAt = React.useRef(Date.now());
  const tick = useTicker(model.ticks || model.summary.live != null);
  void tick;
  const liveSeconds = Math.floor((Date.now() - openedAt.current) / 1000);
  const elapsed = model.ticks ? model.elapsedBase + liveSeconds : model.elapsedBase;
  // Shared by the Overview row's countdown AND the Dispatch Logs On Hold
  // countdown below — one formula, so the two tabs can't drift apart.
  const minutesRemaining = (base: number) => Math.max(1, base - Math.floor(liveSeconds / 60));
  const summarySub = (() => {
    const s = model.summary;
    // Broadcasted: "{N} drivers notified" — N sourced from the SAME broadcast
    // model the Dispatch Logs tab uses, so the two never disagree (2026-08-04).
    if (s.driversNotified) {
      const n = broadcast.summary.notifiedDrivers;
      return `${n} driver${n === 1 ? '' : 's'} notified`;
    }
    if (s.live === 'minutes-until-broadcast' || s.live === 'minutes-to-broadcast') {
      const n = minutesRemaining(s.liveBase ?? 1);
      const unit = n === 1 ? 'minute' : 'minutes';
      return `${n} ${unit} ${s.live === 'minutes-until-broadcast' ? 'until' : 'to'} broadcast.`;
    }
    return s.sub;
  })();
  // Dispatch Logs' "Broadcast starts in {N} minutes" reads the identical base
  // (`client.config.orderWaitMinutes`, hashed the same way) through the SAME
  // `liveSeconds` clock the Overview row above uses — not a separate local
  // countdown — so switching tabs mid-count never shows a different number
  // (OM Appendix A `dispatch.orderWaitTime` drives both).
  const holdMinutesRemaining = broadcast.holdMinutesBase != null ? minutesRemaining(broadcast.holdMinutesBase) : null;

  // Overlays
  const [mapExpanded, setMapExpanded] = React.useState(false);
  const [proofView, setProofView] = React.useState<ProofFile | null>(null);
  const [menuAnchor, setMenuAnchor] = React.useState<DOMRect | null>(null);
  const [assignBanner, setAssignBanner] = React.useState(true);
  const [itemsPage, setItemsPage] = React.useState(1);

  // Activity tab — local comment state (lives here so the composer, which is in the
  // ModalShell footer, can append items that the timeline in the body displays).
  const localCommentSeq = React.useRef(0);
  const [localComments, setLocalComments] = React.useState<ActivityItem[]>([]);
  const handleCommentPost = React.useCallback((html: string) => {
    localCommentSeq.current += 1;
    setLocalComments((prev) => [
      ...prev,
      {
        id: `local-comment-${localCommentSeq.current}`,
        leading: { kind: 'avatar', name: CURRENT_USER.name, tone: CURRENT_USER.tone, src: CURRENT_USER.avatarSrc },
        title: [{ kind: 'name', text: DISPATCHER_NAME }, { kind: 'text', text: 'left a comment' }],
        timestamp: new Date(),
        blocks: [{ kind: 'comment', text: html, editable: true, edits: 0 }],
        kind: 'comment',
      },
    ]);
  }, []);
  // Commit an inline comment edit — only the user's own (local) comments are
  // editable, so this only ever targets `localComments`. Updates the text and
  // bumps the edit counter (Figma's "N Edits").
  const handleCommentEdit = React.useCallback((id: string, html: string) => {
    setLocalComments((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        const prevEdits = c.blocks[0]?.kind === 'comment' ? c.blocks[0].edits ?? 0 : 0;
        return { ...c, blocks: [{ kind: 'comment', text: html, editable: true, edits: prevEdits + 1 }] };
      }),
    );
  }, []);
  const reversedActivityItems = React.useMemo(
    () => [...activityItems, ...localComments].reverse(),
    [activityItems, localComments],
  );
  // Comment composer expanded/idle state. Lives here so the footer "Add Comment"
  // button (rendered on every tab) can expand the composer, and a tab switch
  // collapses it back to idle. Seeded from `commentIntent` so an Add-Comment open
  // starts expanded.
  const [commentActive, setCommentActive] = React.useState(commentIntent);
  React.useEffect(() => {
    if (tab !== 1) setCommentActive(false);
    // Leaving Dispatch Logs abandons any drill-down (instantly, no slide) so
    // returning lands on its main screen rather than a stale sub-screen.
    if (tab !== 2 && drill) {
      if (drillCloseTimer.current) { clearTimeout(drillCloseTimer.current); drillCloseTimer.current = null; }
      setDrill(null);
      setDrillEntered(false);
      setDrillClosing(false);
    }
  }, [tab]);
  const isCompleted = status === 'delivered' || status === 'cancelled';
  // Items accordion: once paginated (>5 items), lock the item-rows region to the
  // full first-page (5-row) height so a short last page (e.g. 1 item) doesn't
  // shrink the accordion mid-browse. Measured off the full page 1 (no magic
  // number); ≤4 items (no pagination) stays content-height. DrawerBody is keyed
  // by order.id, so this resets per order.
  const itemRowsRef = React.useRef<HTMLDivElement>(null);
  const [lockedItemRowsHeight, setLockedItemRowsHeight] = React.useState<number | null>(null);

  const depotName = model.depot?.name ?? order.depot ?? order.pickup.label;
  const depotAddress = model.depot?.address ?? order.pickup.label;

  const summaryCta = () => {
    const kind = model.summary.cta;
    if (kind === 'dispatch') actions.dispatch(order.id);
    else if (kind === 'view-logs') setTab(2);
    else setTab(1);
  };

  // Items pagination — 5 per page (wireframe).
  const pageCount = Math.max(1, Math.ceil(model.itemLines.length / 5));
  const pageItems = model.itemLines.slice((itemsPage - 1) * 5, itemsPage * 5);
  // Lock the item-rows height off the full first page once paginated.
  React.useLayoutEffect(() => {
    if (pageCount > 1 && itemsPage === 1 && lockedItemRowsHeight == null && itemRowsRef.current) {
      setLockedItemRowsHeight(itemRowsRef.current.scrollHeight);
    }
  }, [pageCount, itemsPage, lockedItemRowsHeight]);

  const runAction = (key: string) => {
    switch (key) {
      case 'cancel': return actions.requestCancel([order.id]);
      case 'return': return actions.stub('Return Order');
      case 'addToTrip': return actions.addToTrip(order.id);
      case 'changeDriver': return actions.changeDriver(order.id);
      case 'editOrder': return actions.requestEdit(order.id);
      case 'dispatch': return actions.dispatch(order.id);
      case 'updateStatus': return actions.requestUpdateStatus([order.id]);
      case 'reschedule': return actions.requestReschedule([order.id]);
      // Add Comment (footer, every tab) is a shortcut to commenting: switch to the
      // Activity tab and expand the composer (auto-focused). Not a stub anymore.
      case 'addComment': setTab(1); setCommentActive(true); return;
    }
  };

  const TRAILING: Record<string, { label: string; icon: IconName; outlined?: boolean }> = {
    addToTrip: { label: 'Add To Trip', icon: 'Add', outlined: true },
    changeDriver: { label: 'Change Driver', icon: 'Swap' },
    editOrder: { label: 'Edit Order', icon: 'Edit', outlined: true },
    dispatch: { label: 'Dispatch', icon: 'Proceed' },
    updateStatus: { label: 'Update Status', icon: 'Update' },
    addComment: { label: 'Add Comment', icon: 'Comment', outlined: true },
  };
  const OVERFLOW: Record<string, { label: string; icon: IconName }> = {
    updateStatus: { label: 'Update Status', icon: 'Update' },
    reschedule: { label: 'Reschedule Order', icon: 'Calendar' },
    addComment: { label: 'Add Comment', icon: 'Comment' },
  };

  // Header status icons — same glyphs/colors/tooltips as the table's Order-ID cell.
  const headerIcons = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-8px)' }}>
      <Badge color={ORDER_STATUS_BADGE[status]} label={ORDER_STATUS_LABEL[status]} leadingIcon={ORDER_STATUS_BADGE_ICON[status]} />
      <HoverTip label={model.provenanceIcon.tooltip}>
        <span style={{ display: 'flex', color: model.provenanceIcon.icon === 'Manual-Touch' ? 'var(--icons-caution-badge)' : 'var(--icons-notice-badge)' }}>
          <Icon name={model.provenanceIcon.icon} outlined={model.provenanceIcon.outlined} size={16} />
        </span>
      </HoverTip>
      {model.scheduledOrigin && (
        <HoverTip label={model.scheduledTooltip}>
          <span style={{ display: 'flex', color: 'var(--icons-information-badge)' }}>
            <Icon name="Calendar" size={16} />
          </span>
        </HoverTip>
      )}
      {model.showBroadcast && (
        <HoverTip label="Auto-broadcast">
          <span style={{ display: 'flex', color: 'var(--icons-highlight-default)' }}>
            <Icon name="Broadcast" size={16} />
          </span>
        </HoverTip>
      )}
    </div>
  );

  const overviewBody = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-20px)', padding: 'var(--padding-24px) var(--padding-16px) var(--padding-40px)' }}>
      {/*
        Auto-broadcast assignment banner (§7.2) — dismissible, Assigned only, and
        ONLY when a broadcast actually assigned this driver. Previously gated on
        `status === 'assigned'` alone, so it fired on hand-dispatched orders and
        kept naming a driver who had since been reassigned away. Both cases are
        now excluded by `narrative.showAutoAssignBanner`.
      */}
      {assignBanner && driver && model.narrative.showAutoAssignBanner && (
        <NotificationBanner
          type="highlight"
          variant="filled"
          icon="Broadcast"
          description={`This order was automatically assigned to ${driver.name}.`}
          onDismiss={() => setAssignBanner(false)}
        />
      )}

      {/* Order Overview Card (local component `1452:181083`). */}
      <OrderOverviewCard
        order={order}
        model={model}
        depotName={depotName}
        depotAddress={depotAddress}
        elapsed={elapsed}
        summarySub={summarySub}
        onExpandMap={() => setMapExpanded(true)}
        onCta={summaryCta}
      />

      {/* Pickup Code Banner (Figma `1454:207769`) — a dark-accented banner, NOT a
          white card: lavender `bg-raised` surface, radius lg, px-20 py-16; the
          code shows in dark-navy `secondary-bg` digit boxes with white text. */}
      {model.showPickupCode && (
        <div
          style={{
            boxSizing: 'border-box',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--spacing-64px)',
            width: '100%',
            padding: 'var(--padding-16px) var(--padding-20px)',
            borderRadius: 'var(--rounding-lg)',
            backgroundColor: 'var(--surface-secondary-bg-raised)',
          }}
        >
          <div style={{ display: 'flex', gap: 'var(--spacing-8px)', flex: 1, minWidth: 0 }}>
            <span style={{ display: 'flex', paddingTop: 4, color: 'var(--icons-secondary-default)', flexShrink: 0 }}>
              <Icon name="Lock" outlined={false} size={16} />
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4px)' }}>
              <span className="text-label-m-semibold" style={{ color: 'var(--text-secondary-label)' }}>Pickup Code</span>
              <span className="text-body-m-regular" style={{ color: 'var(--text-default-sub-body)' }}>Share with the driver at pickup</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-16px)', flexShrink: 0 }}>
            <div style={{ display: 'flex', gap: 'var(--spacing-8px)' }}>
              {model.pickupCode.split('').map((d, i) => (
                <span
                  key={i}
                  className="text-label-m-semibold"
                  style={{
                    width: 32,
                    height: 32,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 'var(--rounding-md)',
                    backgroundColor: 'var(--surface-secondary-bg)',
                    color: 'var(--text-on-color-label)',
                  }}
                >
                  {d}
                </span>
              ))}
            </div>
            <HoverTip label="Copy">
              <Button
                variant="plain"
                size="small"
                iconOnly="Copy"
                iconOutlined
                copyIcon="Check-Circle"
                aria-label="Copy pickup code"
                onClick={() => void navigator.clipboard.writeText(model.pickupCode)}
              />
            </HoverTip>
          </div>
        </div>
      )}

      {/* Driver + Trip cards (driver-held / concluded-with-driver states). */}
      {model.showDriverCards && driver && (
        <div style={{ display: 'flex', gap: 'var(--spacing-16px)', width: '100%' }}>
          <ContentCard style={{ flex: 1, minWidth: 0 }}>
            <ContentPrimitives
              type="utility"
              text={driver.name}
              subtext={driver.phone.replace(/\s/g, '')}
              showVisualAnchor
              showLeadingIcon={false}
              showAvatar
              avatarName={driver.name}
              showPassiveElements={false}
              showInteractiveElements
              interactiveElements={
                terminal ? (
                  <HoverTip label="View driver">
                    <Button variant="secondary" size="medium" iconOnly="Open" aria-label="View driver" onClick={() => actions.stub('View Driver')} />
                  </HoverTip>
                ) : (
                  <div style={{ display: 'flex', gap: 'var(--spacing-8px)' }}>
                    <HoverTip label="Change driver">
                      <Button variant="secondary" size="medium" iconOnly="Swap" aria-label="Change driver" onClick={() => actions.changeDriver(order.id)} />
                    </HoverTip>
                    <HoverTip label="Call driver">
                      <Button variant="secondary" size="medium" iconOnly="Phone" iconOutlined aria-label="Call driver" onClick={() => actions.stub('Call Driver')} />
                    </HoverTip>
                  </div>
                )
              }
            />
          </ContentCard>
          <ContentCard style={{ flex: 1, minWidth: 0 }}>
            <ContentPrimitives
              type="utility"
              text={order.tripId ?? 'TRP-000'}
              subtext={`${(model.itemLines.length % 10) + 3} orders`}
              showVisualAnchor
              showLeadingIcon={false}
              showFeaturedIcon
              featuredIconName="Tracking"
              featuredIconOutlined
              showPassiveElements={false}
              showInteractiveElements
              interactiveElements={
                <HoverTip label="Open trip">
                  <Button variant="secondary" size="medium" iconOnly="Open" aria-label="Open trip" onClick={() => actions.stub('View Trip')} />
                </HoverTip>
              }
            />
          </ContentCard>
        </div>
      )}

      {/* Proof of Delivery (Delivered only, POD config) — Figma places this
          FIRST, right after the driver cards and BEFORE Pickup From. */}
      {model.showProofOfDelivery && (
        <Section title="Proof of Delivery">
          <FieldRows
            fields={[
              <Field key="n" label="Recipient Name" value={model.pod.receivedBy} icon="User" />,
              <Field key="p" label="Phone number" value={model.pod.phone} icon="Phone" />,
              <Field key="i" label="Recipient ID/Passport number" value={model.pod.idNumber} icon="ID" />,
              <Field key="r" label="Payment reference" value={model.pod.paymentRef} icon="Receipt" />,
            ]}
          />
          {/* Proof group (Figma "Proof of pickup" frame): horizontal divider then
              the proof rows (split by a 32px vertical `Dermacator`), grouped at
              gap 16 — sits 20 below the fields via the body column gap. */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-16px)', width: '100%' }}>
            <div style={{ height: 0, borderTop: 'var(--stroke-xs) solid var(--border-neutral-default)', width: '100%' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-20px)', width: '100%' }}>
              {model.proofFiles.map((f, i) => (
                <React.Fragment key={f.label}>
                  {i > 0 && <div style={{ width: 0, height: 32, borderLeft: 'var(--stroke-xs) solid var(--border-neutral-default)', flexShrink: 0 }} />}
                  <ProofRow file={f} onView={setProofView} />
                </React.Fragment>
              ))}
            </div>
          </div>
        </Section>
      )}

      {/* Pickup From */}
      <Section title="Pickup From">
        <FieldRows
          fields={[
            <Field key="d" label="Depot" value={depotName} icon="Depot" />,
            <Field key="a" label="Pickup address" value={depotAddress} icon="Location" />,
          ]}
        />
        {model.showProofOfPickup && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-16px)', width: '100%' }}>
            <div style={{ height: 0, borderTop: 'var(--stroke-xs) solid var(--border-neutral-default)', width: '100%' }} />
            <ProofRow file={model.proofOfPickupFile} onView={setProofView} />
          </div>
        )}
      </Section>

      {/* Deliver To */}
      <Section title="Deliver To">
        <FieldRows
          fields={[
            <Field key="n" label="Recipient name" value={order.customer} icon="User" />,
            <Field key="a" label="Delivery address" value={order.dropoff.label} icon="Location" />,
            <Field key="p" label="Phone number" value={order.phone} icon="Phone" />,
            <Field key="e" label="Recipient email" value={model.recipientEmail} icon="Mail" />,
            <Field key="d" label="Delivery date" value={model.deliveryDateLabel} icon="Calendar" />,
            <Field key="r" label="Order reference" value={model.orderReference} />,
            <Field key="i" label="Delivery instructions" value={model.instructions} icon="Note" />,
          ]}
        />
      </Section>

      {/* Items — only for clients that create items (config.items.enabled) and
          when the order has items. When paginated (>5 items) the item-rows region
          is locked to the full first-page height so a short last page doesn't
          shrink the accordion; ≤4 items hugs its content. */}
      {config.items.enabled && model.itemLines.length > 0 && (
        <Section title="Items" count={model.itemLines.length}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-20px)', width: '100%' }}>
            <div
              ref={itemRowsRef}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--spacing-20px)',
                width: '100%',
                ...(pageCount > 1 && lockedItemRowsHeight != null ? { minHeight: lockedItemRowsHeight } : {}),
              }}
            >
              {pageItems.map((line, i) => (
                <ContentPrimitives
                  key={`${itemsPage}-${i}`}
                  type="utility"
                  text={line.name}
                  subtext={`${line.units} Unit${line.units === 1 ? '' : 's'}`}
                  showVisualAnchor
                  showLeadingIcon={false}
                  showFeaturedIcon
                  featuredIconName="Inventory"
                  featuredIconOutlined
                  showPassiveElements={false}
                  showInteractiveElements={false}
                  showTrailingContent={false}
                />
              ))}
            </div>
            {pageCount > 1 && (
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Pagination variant="stacked-list" page={itemsPage} pageCount={pageCount} onPageChange={setItemsPage} />
              </div>
            )}
          </div>
        </Section>
      )}

      {/* Payment Information */}
      <Section title="Payment Information">
        {model.payment.available ? (
          <>
            <FieldRows
              fields={[
                <Field key="t" label="Payment type" value={model.payment.type} icon="Front-Door" />,
                <Field key="m" label="Payment Type" value={model.payment.method} />,
                <Field key="p" label="Product total" value={`KES ${model.payment.productTotal.toLocaleString()}`} icon="Orders" />,
                <Field key="f" label="Delivery fee" value={`KES ${model.payment.deliveryFee.toLocaleString()}`} icon="Payment" />,
              ]}
            />
            {/* Total Section (Figma): divider + Total row grouped at gap 12, set
                20 below the fields by the accordion body's 20px column gap. */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-12px)', width: '100%' }}>
              <div style={{ height: 0, borderTop: 'var(--stroke-xs) solid var(--border-neutral-default)', width: '100%' }} />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span className="text-label-m-semibold" style={{ color: 'var(--text-default-heading)' }}>Total</span>
                  <span className="text-body-m-regular" style={{ color: 'var(--text-default-sub-body)' }}>VAT Incl.</span>
                </div>
                <span className="text-body-l-semibold" style={{ color: 'var(--text-default-heading)' }}>
                  KES {model.payment.total.toLocaleString()}
                </span>
              </div>
            </div>
          </>
        ) : (
          <FieldRows
            fields={[
              <Field key="m" label="Payment method" value="N/A" icon="Front-Door" />,
              <Field key="r" label="Reference number" value="N/A" />,
              <Field key="p" label="Product total" value="N/A" icon="Orders" />,
              <Field key="f" label="Delivery fee" value="N/A" icon="Payment" />,
            ]}
          />
        )}
      </Section>

      {/* More Information */}
      <Section title="More Information">
        {model.showReturnedBanner && (
          <NotificationBanner
            type="neutral"
            variant="filled"
            description="Check the activity tab for more information on the last delivery attempt."
            cta={
              <Button variant="secondary" size="small" onClick={() => setTab(1)}>
                View Activity
              </Button>
            }
          />
        )}
        <FieldRows
          fields={[
            <Field key="c" label="Created" value={model.createdLabel} icon="Calendar" />,
            <Field key="cb" label="Created By" value={model.createdByLabel} icon={model.createdByIcon.icon} />,
            <Field key="d" label="Dispatched" value={model.dispatchedLabel} icon="Calendar" />,
            <Field key="db" label="Dispatched By" value={model.dispatchedByLabel} icon="User" />,
            <Field key="dl" label="Completed" value={model.deliveredLabel} icon="Calendar" />,
            <Field key="w" label="Weight" value="N/A" icon="Weight" />,
            ...(status === 'cancelled'
              ? [<Field key="cr" label="Cancellation reason" value={model.cancellationReason} icon="Note" />]
              : []),
          ]}
        />
      </Section>
    </div>
  );

  const placeholderBody = (label: string) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 480, padding: 'var(--padding-24px)' }}>
      <EmptyState
        type="no-data"
        size="desktop"
        heading="Nothing here yet"
        description={`The ${label} tab is coming soon.`}
      />
    </div>
  );

  const hasFooter = footer.leading != null || footer.trailing.length > 0 || footer.overflow.length > 0;

  return (
    <>
      {/* Scrim — motion driven inline (class-driven transforms proved flaky
          under HMR; inline state is deterministic). */}
      <div
        aria-hidden
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(16,16,16,0.4)',
          zIndex: 1500,
          opacity: entered && !closing ? 1 : 0,
          transition: closing ? 'opacity 200ms ease-in' : 'opacity 300ms ease-out',
        }}
      />
      {/* Panel */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          height: '100dvh',
          zIndex: 1501,
          transform: entered && !closing ? 'translateX(0)' : 'translateX(100%)',
          transition: closing
            ? 'transform 220ms cubic-bezier(0.4, 0, 1, 1)'
            : 'transform 300ms cubic-bezier(0.16, 1, 0.3, 1)',
          willChange: 'transform',
        }}
      >
        <ModalShell
          width={768}
          rounded={false}
          fillHeight
          role="dialog"
          aria-label={`Order ${order.id}`}
          onEscape={onClose}
          header={
            <ModalHeaders
              variant="with-tabs"
              title={order.id}
              onClose={onClose}
              showSecondaryContent
              secondaryLeading={headerIcons}
              secondaryTrailing={
                <div style={{ display: 'flex', gap: 'var(--spacing-8px)' }}>
                  <Button
                    variant="secondary"
                    size="small"
                    iconLeft="Copy"
                    iconOutlined
                    copyIcon="Check-Circle"
                    copiedLabel="Copied"
                    onClick={() => void navigator.clipboard.writeText(order.id)}
                  >
                    Copy ID
                  </Button>
                  <Button variant="secondary" size="small" iconLeft="Open" onClick={() => actions.stub('Recipient Map')}>
                    Recipient Map
                  </Button>
                </div>
              }
              tabs={
                <PageTabsControl
                  tabs={[{ label: 'Overview' }, { label: 'Activity' }, { label: 'Dispatch Logs' }]}
                  value={tab}
                  onChange={setTab}
                />
              }
            />
          }
          footer={
            tab === 1 ? (
              isCompleted ? (
                <ActivityTerminalNotice />
              ) : (
                <>
                  <ActivityComposerSection
                    active={commentActive}
                    onActivate={() => setCommentActive(true)}
                    onDeactivate={() => setCommentActive(false)}
                    onPost={handleCommentPost}
                  />
                  {hasFooter && (
                    <FooterFrame
                      variant="tertiary-action"
                      leading={
                        footer.leading ? (
                          <Button
                            variant="ghost-error"
                            size="medium"
                            iconLeft={footer.leading === 'cancel' ? 'Delete' : 'Undo'}
                            iconOutlined
                            onClick={() => runAction(footer.leading!)}
                          >
                            {footer.leading === 'cancel' ? 'Cancel Order' : 'Return Order'}
                          </Button>
                        ) : undefined
                      }
                    >
                      {footer.trailing.map((key) => (
                        <Button
                          key={key}
                          variant="secondary"
                          size="medium"
                          iconLeft={TRAILING[key]!.icon}
                          iconOutlined={TRAILING[key]!.outlined}
                          onClick={() => runAction(key)}
                        >
                          {TRAILING[key]!.label}
                        </Button>
                      ))}
                      {footer.overflow.length > 0 && (
                        <Button
                          variant="secondary"
                          size="medium"
                          iconOnly="More"
                          aria-label="More actions"
                          onClick={(e) => setMenuAnchor((e.currentTarget as HTMLElement).getBoundingClientRect())}
                        />
                      )}
                    </FooterFrame>
                  )}
                </>
              )
            ) : hasFooter ? (
              <FooterFrame
                variant="tertiary-action"
                leading={
                  footer.leading ? (
                    <Button
                      variant="ghost-error"
                      size="medium"
                      iconLeft={footer.leading === 'cancel' ? 'Delete' : 'Undo'}
                      iconOutlined
                      onClick={() => runAction(footer.leading!)}
                    >
                      {footer.leading === 'cancel' ? 'Cancel Order' : 'Return Order'}
                    </Button>
                  ) : undefined
                }
              >
                {footer.trailing.map((key) => (
                  <Button
                    key={key}
                    variant="secondary"
                    size="medium"
                    iconLeft={TRAILING[key]!.icon}
                    iconOutlined={TRAILING[key]!.outlined}
                    onClick={() => runAction(key)}
                  >
                    {TRAILING[key]!.label}
                  </Button>
                ))}
                {footer.overflow.length > 0 && (
                  <Button
                    variant="secondary"
                    size="medium"
                    iconOnly="More"
                    aria-label="More actions"
                    onClick={(e) => setMenuAnchor((e.currentTarget as HTMLElement).getBoundingClientRect())}
                  />
                )}
              </FooterFrame>
            ) : null
          }
          bodyStyle={{ backgroundColor: 'var(--surface-neutral-bg-default)' }}
        >
          {/* Keyed by tab so a tab switch remounts a fresh node and replays the
              fade-in. The drill-down is NOT rendered here — it slides in as a
              separate overlay panel below. */}
          <div key={`tab-${tab}`} className="leta-tab-body-enter" style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
          {tab === 0 && showSkeleton ? (
            <DrawerSkeleton />
          ) : tab === 0 ? (
            overviewBody
          ) : tab === 1 ? (
            <ActivityTimeline items={reversedActivityItems} onViewProof={setProofView} onEditComment={handleCommentEdit} />
          ) : (
            <DispatchLogsTab
              model={broadcast}
              holdMinutesRemaining={holdMinutesRemaining}
              onViewActivity={() => setTab(1)}
              onPriorityGroups={() => openDrill('priority-groups')}
              onBatchedOrders={() => openDrill('batched-orders')}
              onNotifiedDrivers={() => openDrill('notified-drivers')}
              onRebroadcast={() => actions.rebroadcast(order.id)}
              onDispatch={() => actions.dispatch(order.id)}
            />
          )}
          </div>
        </ModalShell>

        {/* Drill-down overlay — slides in over the parent drawer (same side-sheet
            motion as opening the drawer). Its own ModalShell provides the
            back-arrow + breadcrumb header and no footer; kept mounted through the
            slide-out. */}
        {drill && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: 2,
              transform: drillEntered && !drillClosing ? 'translateX(0)' : 'translateX(100%)',
              transition: drillClosing
                ? 'transform 220ms cubic-bezier(0.4, 0, 1, 1)'
                : 'transform 300ms cubic-bezier(0.16, 1, 0.3, 1)',
              willChange: 'transform',
            }}
          >
            <ModalShell
              width={768}
              rounded={false}
              fillHeight
              role="dialog"
              aria-label={DRILL_TITLE[drill]}
              onEscape={closeDrill}
              header={
                <ModalHeaders
                  variant="default"
                  title={DRILL_TITLE[drill]}
                  onClose={onClose}
                  showNavArrow
                  onNavBack={closeDrill}
                  showBreadcrumb
                  breadcrumb={
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-8px)' }}>
                      <Button variant="plain" size="medium" showUnderline={false} onClick={closeDrill}>
                        {order.id}
                      </Button>
                      <span className="text-label-s-regular" style={{ color: 'var(--text-default-label-idle)' }}>/</span>
                      <span className="text-label-s-medium" style={{ color: 'var(--text-default-label)' }}>
                        {DRILL_TITLE[drill]}
                      </span>
                    </div>
                  }
                  showSecondaryContent={false}
                />
              }
              footer={null}
              bodyStyle={{ backgroundColor: 'var(--surface-neutral-bg-default)' }}
            >
              <DispatchLogsDrillDown drill={drill} model={broadcast} depotName={depotName} order={order} />
            </ModalShell>
          </div>
        )}
      </div>

      {/* Footer ⋯ overflow (§12.7; Returned drops Update Status per v2.8). */}
      {menuAnchor && (
        <Popover anchorRect={menuAnchor} onClose={() => setMenuAnchor(null)} placement="top-end">
          <MenuPanel width={220}>
            {footer.overflow.map((key, i) => (
              <React.Fragment key={key}>
                {/* Update Status sits alone above a divider (wireframe `133:71299`). */}
                {i === 1 && footer.overflow[0] === 'updateStatus' && <MenuDivider />}
                <DesktopMenuOptions
                  type="dropdown-basic"
                  label={OVERFLOW[key]!.label}
                  showLeadingIcon
                  leadingIcon={OVERFLOW[key]!.icon}
                  showChevron={false}
                  onSelect={() => {
                    setMenuAnchor(null);
                    runAction(key);
                  }}
                />
              </React.Fragment>
            ))}
          </MenuPanel>
        </Popover>
      )}

      {/* Expanded map (§7.2 expanded mode) — portaled: the drawer panel is a
          transformed ancestor, which would otherwise re-anchor these fixed
          overlays to itself instead of the viewport. */}
      {mapExpanded && createPortal(
        <ExpandedMapOverlay
          order={order}
          depotName={depotName}
          depotAddress={depotAddress}
          driverName={driver?.name ?? null}
          onDispatch={() => {
            setMapExpanded(false);
            actions.dispatch(order.id);
          }}
          onViewActivity={() => {
            setMapExpanded(false);
            setTab(1);
          }}
          onClose={() => setMapExpanded(false)}
        />,
        document.body,
      )}

      {/* Proof viewers (Recipient Signature / Proof of Pickup / Proof of Delivery). */}
      {proofView && createPortal(
        <>
          <div aria-hidden onClick={() => setProofView(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(16,16,16,0.4)', zIndex: 1700 }} />
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 1701 }}>
            <ModalDialog
              variant={proofView.viewer}
              title={proofView.title}
              imageSrc={proofView.src}
              signatureSrc={proofView.src}
              cancelLabel="Close"
              showConfirm={false}
              onCancel={() => setProofView(null)}
              onClose={() => setProofView(null)}
            />
          </div>
        </>,
        document.body,
      )}
    </>
  );
}

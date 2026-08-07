import type { IconName } from '@leta-io/icons';
import type { ClientConfig, DepotOption, Driver, Order, OrderStatus } from '../../store/types.js';
import { DISPATCHER_NAME } from './activityModel.js';
import { buildDispatchNarrative, type DispatchNarrative } from '../../lib/dispatchNarrative.js';
import {
  creatorFor,
  depotForOrder,
  durationSecondsFor,
  formatDateTime,
  formatReasonCapture,
  idHash,
  mockCancellationFor,
  MONTHS,
  scheduledDateFor,
  scheduledLabelFor,
  slaStateFor,
  type Creator,
  type SlaState,
} from '../../lib/orderMeta.js';

/**
 * Order Detail (View Order drawer) derived data — everything the Overview tab
 * renders that the mock `Order` doesn't carry yet (recipient email, item lines,
 * payment, proofs, provenance…). All values are deterministic per order id so
 * the drawer agrees with the table and is stable across opens. Wireframes:
 * `320:99590` (View Order Drawer/Overview, enumerated 2026-07-20 — see
 * design-parity/view-order-overview-inventory.md).
 */

// ── Small formatters ────────────────────────────────────────────────────────────

/** "27m 20s" / "1h 2m 3s" / "0s" — the SLA counter + Prev-attempt format. */
export function fmtClock(totalSeconds: number): string {
  if (totalSeconds <= 0) return '0s';
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function fmtTime(d: Date): string {
  let h = d.getHours();
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${d.getMinutes().toString().padStart(2, '0')} ${ampm}`;
}

/** "9 Jun 2027, 12:30 PM" for the scheduled slot. */
function fmtDateTimeShort(d: Date): string {
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}, ${fmtTime(d)}`;
}

// ── Status shape flags (which regions render, per the 12 wireframes) ───────────

const DISPATCHED: OrderStatus[] = ['assigned', 'at-depot', 'in-transit', 'arrived', 'returning'];
const READY: OrderStatus[] = ['scheduled', 'pending', 'broadcasted'];

/** "Total fulfilment time" once the attempt concluded; "Elapsed" while live (§7.2). */
export function slaHeadline(status: OrderStatus): string {
  return status === 'returning' || status === 'returned' || status === 'delivered' || status === 'cancelled'
    ? 'Total fulfilment time'
    : 'Elapsed fulfilment time';
}

/** Statuses whose fulfilment counter ticks live in the open drawer. */
export function slaTicks(status: OrderStatus): boolean {
  return status === 'pending' || status === 'broadcasted' || DISPATCHED.includes(status) && status !== 'returning';
}

export interface ProofFile {
  /** Row label, e.g. "Proof of Delivery" / "Recipient Signature". */
  label: string;
  fileName: string;
  /** Thumbnail + viewer image source. */
  src: string;
  /** Which ModalDialog variant views it. */
  viewer: 'image' | 'signature';
  /** Viewer dialog title. */
  title: string;
}

/** Saved filename for a proof viewer's "Download Image" action, e.g. `ORD-1022-proof-of-delivery.jpg`. */
export function proofDownloadFileName(orderId: string, file: ProofFile): string {
  const slug = file.label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const ext = file.viewer === 'signature' ? 'png' : 'jpg';
  return `${orderId}-${slug}.${ext}`;
}

export interface OrderDetailModel {
  order: Order;
  driver: Driver | null;
  depot: DepotOption | undefined;
  creator: Creator;
  /** Provenance icon + tooltip (mirrors the table's Order-ID cell icons). */
  provenanceIcon: { icon: IconName; outlined: boolean; tooltip: string };
  /**
   * **The dispatch source of truth** — how this order got its driver. Every tab
   * reads this rather than deriving provenance itself, so the Overview banner,
   * the Activity trail and the Dispatch Logs tab can never contradict each other
   * (see `lib/dispatchNarrative.ts` for the failure this replaced).
   */
  narrative: DispatchNarrative;
  scheduledOrigin: boolean;
  /** Auto-broadcast order → Broadcast icon in the header (mirrors the table's
   *  Order-ID cell, §3.2/§7.2). Sourced from {@link narrative}. */
  showBroadcast: boolean;
  scheduledDate: Date;
  /** "Scheduled: 09 Jun 2027, 12:30 PM" (Calendar icon tooltip). */
  scheduledTooltip: string;
  /** SLA */
  sla: SlaState;
  /** SLA badge — every state pairs a leading icon with the label (Order Overview
   *  Card `1452:181083`: On-Time→Check-Circle, At Risk→Warning, Delayed→Error,
   *  Returned→History). All filled glyphs. */
  slaBadge: { label: string; color: 'success' | 'warning' | 'error' | 'neutral'; icon: IconName } | null;
  /** Elapsed seconds base for the counter (static/frozen for terminal states). */
  elapsedBase: number;
  ticks: boolean;
  /** Summary card copy (§7.2 matrix + wireframe corrections). */
  summary: {
    main: string;
    sub: string;
    cta: 'view-activity' | 'dispatch' | 'view-logs';
    ctaLabel: string;
    /** live-updating sub-copy kind (countdown minutes). */
    live?: 'minutes-until-broadcast' | 'minutes-to-broadcast';
    /** starting value for the live number. */
    liveBase?: number;
    /**
     * Broadcasted state: the sub-copy is "{N} drivers notified", where N is the
     * broadcast model's notified-driver count (so the Overview card and the
     * Dispatch Logs tab always agree — ruled 2026-08-04, replacing the old
     * "{N} seconds elapsed" which drifted from the tab). The drawer fills N in
     * from the broadcast model; the static `sub` here is a fallback.
     */
    driversNotified?: boolean;
  };
  /** Region flags */
  showPickupCode: boolean;
  showDriverCards: boolean;
  showProofOfPickup: boolean;
  showProofOfDelivery: boolean;
  showReturnedBanner: boolean;
  /** Pickup code digits (4). */
  pickupCode: string;
  /** Deliver To fields */
  recipientEmail: string;
  deliveryDateLabel: string;
  orderReference: string;
  instructions: string;
  /** Items */
  itemLines: { name: string; units: number }[];
  /** Payment */
  payment:
    | { available: true; type: string; method: string; productTotal: number; deliveryFee: number; total: number }
    | { available: false };
  /** More Information */
  createdLabel: string;
  createdByLabel: string;
  createdByIcon: { icon: IconName; outlined: boolean };
  dispatchedLabel: string;
  dispatchedByLabel: string;
  deliveredLabel: string;
  /** More Information — cancelled orders only ("Reason. Reason. Note." sentences). */
  cancellationReason: string;
  /** POD section (Delivered) */
  pod: { receivedBy: string; phone: string; idNumber: string; paymentRef: string };
  proofOfPickupFile: ProofFile;
  proofFiles: ProofFile[];
  /** Returned SLA-card "Prev: 30m 23s" */
  prevAttempt: string;
  /** Est delivery/drop-off window ("12:30 - 12:40 PM"). */
  estWindow: string;
  /** Terminal timestamp ("12:50 PM"). */
  terminalTime: string;
}

const ITEM_POOL = [
  'Cat Food',
  'Feline Feast Chicken Recipe',
  'Purrfect Choice Salmon Bites',
  'Whisker Delight Tuna Feast',
  'Meow Mix Ocean Catch',
  'Kitten Milk Formula',
  'Salmon & Rice Kibble',
  'Tuna Pate Cans (6-pack)',
  'Chicken Liver Treats',
  'Grain-Free Duck Recipe',
  'Ocean Whitefish Dinner',
  'Turkey & Giblets Feast',
  'Senior Cat Formula',
  'Hairball Control Blend',
  'Indoor Cat Mix',
];

const RECEIVERS = ['Mariam Wangari', 'Brian Otieno', 'Cynthia Achieng', 'Kevin Njoroge'];

export function buildOrderDetail(
  order: Order,
  driver: Driver | null,
  config: ClientConfig,
  images: { photo: string; signature: string },
): OrderDetailModel {
  const h = idHash(order.id);
  const status = order.status;
  const creator = creatorFor(order);
  const isFinished = status === 'delivered' || status === 'cancelled';
  // Mapped onto the client's own configured stage targets (Doc 4 §2/§3) —
  // `slaStateFor` already returns the binary Within/Beyond-OFT outcome (never
  // 'at-risk') for finished orders, so there's no separate collapse needed.
  const sla: SlaState = slaStateFor(order, config.sla);
  const scheduled = scheduledDateFor(order);
  // One derivation of dispatch provenance for the whole drawer.
  const narrative = buildDispatchNarrative(order, config, driver?.name ?? null);

  // Elapsed counter base (§7.2 counter window): Scheduled + Returned start at 0.
  const elapsedBase =
    status === 'scheduled' || status === 'returned' ? 0 : durationSecondsFor(order, config.sla, isFinished);

  // SLA badge: hidden while nothing has elapsed (Scheduled); "Prev" on Returned.
  const slaBadge: OrderDetailModel['slaBadge'] =
    status === 'scheduled'
      ? null
      : status === 'returned'
        ? { label: `Prev: ${fmtClock(durationSecondsFor(order, config.sla, true))}`, color: 'neutral', icon: 'History' }
        : sla === 'delayed'
          ? { label: 'Delayed', color: 'error', icon: 'Error' }
          : sla === 'at-risk'
            ? { label: 'At Risk', color: 'warning', icon: 'Warning' }
            : { label: 'On-Time', color: 'success', icon: 'Check-Circle' };

  // Est window: scheduled slot time + 10 minutes ("12:30 - 12:40 PM" — the
  // start drops its meridiem when both ends share it, per the wireframe).
  const windowEnd = new Date(scheduled.getTime() + 10 * 60 * 1000);
  const startLabel = fmtTime(scheduled);
  const endLabel = fmtTime(windowEnd);
  const sharedMeridiem = startLabel.slice(-2) === endLabel.slice(-2);
  const estWindow = `${sharedMeridiem ? startLabel.slice(0, -3) : startLabel} - ${endLabel}`;
  const terminal = new Date(scheduled.getTime() + 20 * 60 * 1000);
  const terminalTime = fmtTime(terminal);

  // Summary card (§7.2 matrix, rows corrected 2026-07-20).
  const summary = ((): OrderDetailModel['summary'] => {
    const viewActivity = { cta: 'view-activity' as const, ctaLabel: 'View Activity' };
    switch (status) {
      case 'scheduled': {
        const minsToBroadcast = (h % 9) + 1; // mock; live in drawer
        const soon = config.autoBroadcast && h % 3 === 0; // deterministic ≤60-min subset
        return soon
          ? { main: fmtDateTimeShort(scheduled), sub: `${minsToBroadcast} minute${minsToBroadcast === 1 ? '' : 's'} until broadcast.`, live: 'minutes-until-broadcast', liveBase: minsToBroadcast, ...viewActivity }
          : { main: fmtDateTimeShort(scheduled), sub: 'Scheduled delivery date', ...viewActivity };
      }
      case 'pending': {
        // A Pending order whose broadcast already ran and failed is NOT waiting to
        // broadcast — it is back in the queue awaiting rescue. Figma
        // `1759:145797` (Order Overview Card → "Pending Order Overview 3
        // (Auto-broadcast)"): the copy matches the Dispatch Logs tab's own
        // Exhausted card, and the CTA routes there because Re-broadcast lives on
        // that tab (the row/footer ⋯ menu deliberately has no Re-broadcast item).
        if (narrative.broadcastState === 'exhausted') {
          return {
            main: 'Broadcast unaccepted',
            sub: 'Re-broadcast or dispatch manually.',
            cta: 'view-logs',
            ctaLabel: 'View Logs',
          };
        }
        const waitMins = (h % Math.max(config.orderWaitMinutes, 2)) + 1;
        return config.autoBroadcast
          ? { main: 'Order broadcasting soon', sub: `${waitMins} minute${waitMins === 1 ? '' : 's'} to broadcast.`, live: 'minutes-to-broadcast', liveBase: waitMins, ...viewActivity }
          : { main: 'Dispatch now', sub: 'Items ready for delivery.', cta: 'dispatch', ctaLabel: 'Dispatch' };
      }
      case 'broadcasted':
        return { main: 'Order broadcast started', sub: 'Drivers notified', cta: 'view-logs', ctaLabel: 'View Logs', driversNotified: true };
      case 'assigned':
        return { main: 'Driver is on the way', sub: `Est delivery: ${estWindow}`, ...viewActivity };
      case 'at-depot':
        return { main: 'Driver is at the depot', sub: `Est delivery: ${estWindow}`, ...viewActivity };
      case 'in-transit':
        return { main: 'Driver is in transit', sub: `Est delivery: ${estWindow}`, ...viewActivity };
      case 'arrived':
        return { main: 'Driver has arrived', sub: `Est delivery: ${estWindow}`, ...viewActivity };
      case 'returning':
        return { main: 'Driver is returning', sub: `Est drop-off: ${estWindow}`, ...viewActivity };
      case 'delivered':
        return { main: 'Order delivered', sub: `Delivered at ${terminalTime}`, ...viewActivity };
      case 'returned':
        return { main: 'Order returned', sub: `Returned at ${terminalTime}`, ...viewActivity };
      case 'cancelled':
        return { main: 'Order cancelled', sub: `Cancelled at ${terminalTime}`, ...viewActivity };
    }
  })();

  // Items — exactly `order.items` lines (≥1), names/units deterministic.
  const lineCount = Math.max(1, Math.min(order.items || 1, 30));
  const itemLines = Array.from({ length: lineCount }, (_, i) => ({
    name: ITEM_POOL[(h + i * 3) % ITEM_POOL.length]!,
    units: ((h + i * 7) % 5) + 1,
  }));

  // Payment — the client's payment module gates real values (else the N/A variant).
  const productTotal = ((h % 40) + 10) * 50;
  const payment: OrderDetailModel['payment'] = config.payment.enabled
    ? { available: true, type: 'Payment on Delivery', method: 'MPESA', productTotal, deliveryFee: 300, total: productTotal + 300 }
    : { available: false };

  const createdDate = new Date(order.createdAt);
  const dispatched = !READY.includes(status) && status !== 'returned';
  const dispatchTime = new Date(scheduled.getTime() - 30 * 60 * 1000);
  const humanCreator = creator.source === 'human';

  // Real captured data (from a live CancelOrderModal confirm) wins; pre-seeded
  // mock cancelled orders fall back to a deterministic mock so they don't all
  // read "N/A".
  const cancellation = order.cancelReasons?.length
    ? { reasons: order.cancelReasons, note: order.cancelNote ?? '' }
    : mockCancellationFor(order);
  const cancellationReason = formatReasonCapture(cancellation.reasons, cancellation.note);

  const first = (order.customer.split(' ')[0] ?? 'user').toLowerCase();

  const proofOfPickupFile: ProofFile = {
    label: 'Proof of Pickup',
    fileName: 'Image.png',
    src: images.photo,
    viewer: 'image',
    title: 'Proof of Pickup',
  };

  return {
    order,
    driver,
    depot: depotForOrder(order, config.depots),
    creator,
    provenanceIcon: humanCreator
      ? { icon: 'Manual-Touch', outlined: true, tooltip: 'Created manually' }
      : {
          icon: 'Integration',
          outlined: false,
          tooltip: creator.source === 'storefront' ? 'Auto-create via online store' : 'Auto-create via connected app',
        },
    narrative,
    // Both sourced from the narrative — a Pending order is scheduled-origin
    // (Calendar icon) only when it dropped Scheduled→Pending on a
    // NON-auto-broadcast client (Pending Ov2); on an auto-broadcast client a
    // scheduled order skips Pending entirely (§7.2). The Broadcast icon now
    // means "was dispatched by broadcast", so it agrees with the banner + logs.
    scheduledOrigin: narrative.scheduledOrigin,
    showBroadcast: narrative.showBroadcastIcon,
    scheduledDate: scheduled,
    scheduledTooltip: scheduledLabelFor(order),
    sla,
    slaBadge,
    elapsedBase,
    ticks: slaTicks(status),
    summary,
    showPickupCode: config.pickupConfirmation && (READY.includes(status) || status === 'assigned' || status === 'at-depot'),
    showDriverCards: !!driver && (DISPATCHED.includes(status) || (isFinished && !!order.tripId)),
    showProofOfPickup:
      config.pickupConfirmation &&
      (status === 'in-transit' || status === 'arrived' || status === 'returning' || status === 'delivered'),
    showProofOfDelivery: (config.pod.signature || config.pod.photo) && status === 'delivered',
    showReturnedBanner: status === 'returned',
    pickupCode: String(1000 + ((h * 7919) % 9000)),
    recipientEmail: `${first}@gmail.com`,
    deliveryDateLabel: fmtDateTimeShort(scheduled),
    orderReference: `OD${String((h % 900) + 100).padStart(3, '0')}`,
    instructions: `Please call ${order.phone.replace(/\s/g, '')} when you reach the address`,
    itemLines,
    payment,
    createdLabel: isNaN(createdDate.getTime()) ? 'N/A' : formatDateTime(createdDate),
    createdByLabel: humanCreator
      ? (creator as { name: string }).name
      : creator.source === 'storefront'
        ? 'Auto-create · From online store'
        : 'Auto-create · From connected app',
    // Figma More Info rows: a human creator gets plain `User-Outline`, an
    // automated one the filled `Integration` glyph (which has no outline sibling).
    createdByIcon: humanCreator ? { icon: 'User', outlined: true } : { icon: 'Integration', outlined: false },
    dispatchedLabel: dispatched ? formatDateTime(dispatchTime) : 'N/A',
    dispatchedByLabel: dispatched ? DISPATCHER_NAME : 'N/A',
    deliveredLabel: status === 'delivered' || status === 'cancelled' ? formatDateTime(terminal) : 'N/A',
    cancellationReason,
    pod: {
      receivedBy: RECEIVERS[h % RECEIVERS.length]!,
      phone: order.phone.replace(/\s/g, ''),
      idNumber: `B${String((h % 900) + 100)}J${(h % 9)}J`,
      paymentRef: `TIL${String((h * 13) % 100).padStart(2, '0')}DHVJKQ`,
    },
    proofOfPickupFile,
    proofFiles: [
      { label: 'Proof of Delivery', fileName: 'Image.png', src: images.photo, viewer: 'image', title: 'Proof of Delivery' },
      { label: 'Recipient Signature', fileName: 'Image.png', src: images.signature, viewer: 'signature', title: 'Recipient Signature' },
    ],
    prevAttempt: fmtClock(durationSecondsFor(order, config.sla, true)),
    estWindow,
    terminalTime,
  };
}

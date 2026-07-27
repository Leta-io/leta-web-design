import type { IconName } from '@leta/icons';
import type { ClientConfig, DepotOption, Driver, Order, OrderStatus } from '../../store/types.js';
import {
  autoBroadcastFor,
  creatorFor,
  depotForOrder,
  durationSecondsFor,
  formatDateTime,
  idHash,
  MONTHS,
  scheduledDateFor,
  scheduledLabelFor,
  scheduledOriginFor,
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

export interface OrderDetailModel {
  order: Order;
  driver: Driver | null;
  depot: DepotOption | undefined;
  creator: Creator;
  /** Provenance icon + tooltip (mirrors the table's Order-ID cell icons). */
  provenanceIcon: { icon: IconName; outlined: boolean; tooltip: string };
  scheduledOrigin: boolean;
  /** Auto-broadcast order → Broadcast icon in the header (mirrors the table's
   *  Order-ID cell, §3.2/§7.2). */
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
    /** live-updating sub-copy kind (broadcast seconds / countdown minutes). */
    live?: 'seconds-elapsed' | 'minutes-until-broadcast' | 'minutes-to-broadcast';
    /** starting value for the live number. */
    liveBase?: number;
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
  const rawSla = slaStateFor(order);
  const sla: SlaState = isFinished && rawSla === 'at-risk' ? 'on-target' : rawSla;
  const scheduled = scheduledDateFor(order);
  const schedOrigin = scheduledOriginFor(order);

  // Elapsed counter base (§7.2 counter window): Scheduled + Returned start at 0.
  const elapsedBase =
    status === 'scheduled' || status === 'returned' ? 0 : durationSecondsFor(order, sla, isFinished);

  // SLA badge: hidden while nothing has elapsed (Scheduled); "Prev" on Returned.
  const slaBadge: OrderDetailModel['slaBadge'] =
    status === 'scheduled'
      ? null
      : status === 'returned'
        ? { label: `Prev: ${fmtClock(durationSecondsFor(order, 'delayed', true))}`, color: 'neutral', icon: 'History' }
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
      case 'pending':
        return config.autoBroadcast
          ? { main: 'Order broadcasting soon', sub: `${(h % Math.max(config.orderWaitMinutes, 2)) + 1} minute${(h % Math.max(config.orderWaitMinutes, 2)) + 1 === 1 ? '' : 's'} to broadcast.`, live: 'minutes-to-broadcast', liveBase: (h % Math.max(config.orderWaitMinutes, 2)) + 1, ...viewActivity }
          : { main: 'Dispatch Now', sub: 'Items ready for delivery.', cta: 'dispatch', ctaLabel: 'Dispatch' };
      case 'broadcasted':
        return { main: 'Order broadcast started', sub: `${(h % 50) + 5} seconds elapsed.`, cta: 'view-logs', ctaLabel: 'View Logs', live: 'seconds-elapsed', liveBase: (h % 50) + 5 };
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
    // A Pending order is scheduled-origin (Calendar icon) only when it dropped
    // Scheduled→Pending on a NON-auto-broadcast client (Pending Ov2). On an
    // auto-broadcast client a scheduled order skips Pending entirely (§7.2), so
    // its Pending state (order-wait-time, Ov1) is never scheduled-origin.
    scheduledOrigin: schedOrigin && !(status === 'pending' && config.autoBroadcast),
    showBroadcast: autoBroadcastFor(order),
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
    showProofOfDelivery: config.proofOfDelivery && status === 'delivered',
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
    createdByIcon: humanCreator ? { icon: 'User-Available', outlined: true } : { icon: 'Integration', outlined: false },
    dispatchedLabel: dispatched ? formatDateTime(dispatchTime) : 'N/A',
    dispatchedByLabel: dispatched ? 'Jude Bello' : 'N/A',
    deliveredLabel: status === 'delivered' || status === 'cancelled' ? formatDateTime(terminal) : 'N/A',
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
    prevAttempt: fmtClock(durationSecondsFor(order, 'delayed', true)),
    estWindow,
    terminalTime,
  };
}

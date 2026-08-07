import { AVATAR_PHOTOS } from '@leta/components';
import { expectedOftMinutes, type DepotOption, type Order, type OrderStatus, type SlaConfig } from '../store/types.js';
import { CANCEL_REASONS } from '../components/CancelOrderModal.js';

/**
 * Shared deterministic order metadata — creators, provenance, SLA state, mock
 * durations, scheduled slots. Extracted from OrdersPage (2026-07-20) so the
 * Order Detail drawer derives the SAME values the table shows (same creator,
 * same SLA badge, same scheduled slot) without a circular import.
 *
 * Everything here is deterministic per order id — stable across renders and
 * across the table/drawer boundary. Replaced by real fields when the order
 * model carries them (Doc 2 config + backend data).
 */

export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function idHash(id: string): number {
  let s = 0;
  for (let i = 0; i < 5; i++) s += id.charCodeAt(i);
  return s;
}

export function formatCreated(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—\n';
  const date = `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  let h = d.getHours();
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  const m = d.getMinutes().toString().padStart(2, '0');
  return `${date}\n${h}:${m} ${ampm}`;
}

/** "8 Jun 2027, 9:00 AM" — the detail drawer's single-line datetime format. */
export function formatDateTime(d: Date): string {
  if (isNaN(d.getTime())) return 'N/A';
  let h = d.getHours();
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  const m = d.getMinutes().toString().padStart(2, '0');
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}, ${h}:${m} ${ampm}`;
}

// ── Created By (Table spec §2.2) ─────────────────────────────────────────────
// Clustered/randomized creators — some carry a photo (the exact Figma Avatar
// Photo 1/2/3 images, shipped as @leta-io/components assets), the rest render the
// empty-teal avatar with their initials. Two automated sources are mixed in:
// "Storefront" (Auto-create · From online store) and "API" (From connected app).
export type Creator =
  | { source: 'human'; name: string; email: string; avatarSrc?: string }
  | { source: 'storefront' }
  | { source: 'api' };

export const CREATORS: Creator[] = [
  { source: 'human', name: 'Aisha Mohamed', email: 'aisha.mohamed@leta.ai', avatarSrc: AVATAR_PHOTOS[0] },
  { source: 'human', name: 'Grace Wanjiru', email: 'grace.wanjiru@leta.ai' },
  { source: 'human', name: 'Samuel Mwangi', email: 'samuel.mwangi@leta.ai', avatarSrc: AVATAR_PHOTOS[1] },
  { source: 'human', name: 'Fatuma Hassan', email: 'fatuma.hassan@leta.ai' },
  { source: 'human', name: 'Peter Kamau', email: 'peter.kamau@leta.ai', avatarSrc: AVATAR_PHOTOS[2] },
  { source: 'storefront' },
  { source: 'api' },
];

export function creatorFor(order: Order): Creator {
  return CREATORS[order.id.charCodeAt(0) % CREATORS.length]!;
}
export function creatorLabelFor(order: Order): string {
  const c = creatorFor(order);
  return c.source === 'human' ? c.name : c.source === 'storefront' ? 'Storefront' : 'API';
}

// ── Order provenance (Order-ID cell icons + drawer header icons, same tooltips) ──
export function scheduledOriginFor(o: Order): boolean {
  return o.status === 'scheduled' || idHash(o.id) % 2 === 0;
}
/**
 * The Broadcast provenance icon lives in `lib/dispatchNarrative.ts` now
 * (`DispatchNarrative.showBroadcastIcon`).
 *
 * It used to be `autoBroadcastFor(o) = idHash % 3 === 0` — a hash unrelated to
 * every other dispatch signal, which is why an order could show the icon while
 * its Dispatch Logs claimed a manual assignment, or show no icon while the
 * Overview banner announced an automatic one. Do not reintroduce a local
 * provenance hash: derive from the narrative so all surfaces agree.
 */
/** Today at the next full hour (reschedule anchor + fallbacks). */
export function nextHourToday(): Date {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 1);
  return d;
}
/** The mock scheduled delivery slot for a scheduled-origin order — 2 days after
 *  creation at 12:30 PM (the same value the Order-ID Calendar tooltip shows). */
export function scheduledDateFor(o: Order): Date {
  const d = new Date(o.createdAt);
  if (isNaN(d.getTime())) return nextHourToday();
  d.setDate(d.getDate() + 2);
  d.setHours(12, 30, 0, 0);
  return d;
}
/** "Scheduled: 09 Jun 2027, 12:30 PM" — mock scheduled slot 2 days after creation. */
export function scheduledLabelFor(o: Order): string {
  const d = scheduledDateFor(o);
  const day = d.getDate().toString().padStart(2, '0');
  return `Scheduled: ${day} ${MONTHS[d.getMonth()]} ${d.getFullYear()}, 12:30 PM`;
}

// ── SLA state + duration — mapped onto `client.config.sla` (Table spec §2.3,
// Doc 4 §2/§3). ─────────────────────────────────────────────────────────────
export type SlaState = 'on-target' | 'at-risk' | 'delayed';

/**
 * Which configured stage duration governs the order's CURRENT clock (Doc 4
 * §2's status↔stage table). Absent → no stage clock runs right now: Scheduled
 * hasn't started, and Returning/Returned reset per §2's last sentence (kept
 * as the existing "Prev: {duration}" special-case in `detailModel.ts` —
 * untouched here).
 */
const STAGE_FOR_STATUS: Partial<Record<OrderStatus, keyof SlaConfig>> = {
  pending: 'assignment',
  broadcasted: 'assignment',
  assigned: 'arriveAtDepot',
  'at-depot': 'pickup',
  'in-transit': 'arriveAtDestination',
  arrived: 'completeAtDestination',
};

/**
 * Deterministic mock "how long has this order been in its current stage" —
 * still a stable idHash seed, not a wall-clock-ticking value (this module has
 * never ticked live; the Duration column re-derives the same number every
 * render). Ranges 0 → 2× the passed window, so the comparison against that
 * window is what decides the state — shrink a stage's SLA in Admin and the
 * SAME seed pushes more orders past it into At Risk / Delayed; widen it and
 * they pull back to On-Time. That reactivity to `client.config.sla` is the
 * whole point: previously `slaStateFor` picked a state via an independent
 * hash roll and this function reverse-engineered a "plausible" duration to
 * match it, so the badge never actually reacted to the configured targets.
 */
function stageElapsedSeconds(o: Order, windowSeconds: number): number {
  return Math.round((idHash(o.id) * 37) % Math.max(1, windowSeconds * 2));
}

/**
 * Mock stand-in for the platform's real driver-telemetry prediction (Doc 4
 * §3: "using contextual data — driver location, moving speed, direction,
 * depot location, drop-off location"). This prototype has none of that, so a
 * stage crossing this fraction of its configured window stands in for "the
 * platform predicts a miss." Doc 4 §6.2 explicitly leaves the real algorithm
 * and recompute cadence to engineering — this is a placeholder, not a spec.
 */
const AT_RISK_THRESHOLD = 0.7;

/**
 * On-Time / At Risk / Delayed for an in-progress order (Doc 4 §3), or the
 * binary Within/Beyond-OFT outcome for a finished one (§3.1) — reusing
 * `'on-target'`/`'delayed'` rather than widening the type, since a finished
 * order can never be `'at-risk'` (nothing left to predict).
 */
export function slaStateFor(o: Order, sla: SlaConfig): SlaState {
  if (o.status === 'delivered' || o.status === 'cancelled') {
    const oftSeconds = expectedOftMinutes(sla) * 60;
    return stageElapsedSeconds(o, oftSeconds) > oftSeconds ? 'delayed' : 'on-target';
  }
  const key = STAGE_FOR_STATUS[o.status];
  if (!key) return 'on-target';
  const windowSeconds = sla[key] * 60;
  const elapsed = stageElapsedSeconds(o, windowSeconds);
  if (elapsed >= windowSeconds) return 'delayed';
  if (elapsed >= windowSeconds * AT_RISK_THRESHOLD) return 'at-risk';
  return 'on-target';
}

/** The seconds backing `slaStateFor`'s own comparison, so the Duration
 *  cell/counter can never disagree with the badge about how long has elapsed. */
export function durationSecondsFor(o: Order, sla: SlaConfig, finished: boolean): number {
  if (finished) return stageElapsedSeconds(o, expectedOftMinutes(sla) * 60);
  const key = STAGE_FOR_STATUS[o.status];
  return key ? stageElapsedSeconds(o, sla[key] * 60) : 0;
}

export function mockDurationFor(o: Order, sla: SlaConfig, finished: boolean): string {
  const total = durationSecondsFor(o, sla, finished);
  const minutes = Math.floor(total / 60);
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m ${total % 60}s`;
}

// ── Distance (Table Column spec §2.4) ────────────────────────────────────────
/**
 * Depot → drop-off distance in km, derived from the **same coordinates
 * `OrderDetailMap` draws the route from** (`order.pickup` / `order.dropoff`), so
 * the Distance column can never contradict the route on the map. Great-circle
 * distance scaled by a road factor, since a courier drives streets rather than
 * the straight line.
 */
const ROAD_FACTOR = 1.35;

export function distanceKmFor(order: Order): number {
  const { pickup, dropoff } = order;
  if (!pickup || !dropoff) return 0;
  const R = 6371; // km
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(dropoff.lat - pickup.lat);
  const dLng = toRad(dropoff.lng - pickup.lng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(pickup.lat)) * Math.cos(toRad(dropoff.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a)) * ROAD_FACTOR;
}

/** "4.2 Km" — the Distance cell's display value (one decimal, per the spec). */
export function distanceLabelFor(order: Order): string {
  return `${distanceKmFor(order).toFixed(1)} Km`;
}

// ── Client-scoped pickup depot ────────────────────────────────────────────────
// A seed order's depot may not belong to the active client; remap it
// deterministically onto one of the client's own depots (stable per order id).
export function depotForOrder(order: Order, depots: DepotOption[]): DepotOption | undefined {
  if (depots.length === 0) return undefined;
  const owned = depots.find((d) => d.name === order.depot);
  if (owned) return owned;
  return depots.length === 1 ? depots[0] : depots[idHash(order.id) % depots.length];
}

// ── Reason-capture display formatting ────────────────────────────────────────
// General-purpose formatter for any flow that captures selected-reason(s) +
// free-text note (Cancel Order today; the same shape applies to other
// reason-capture flows, e.g. a future Suspend Driver). Each selected reason
// renders as its own period-terminated sentence, then the note as a final
// sentence: "Customer requested it. Payment Issue. This was requested by the
// customer."
export function formatReasonCapture(reasons: string[], note?: string): string {
  const parts = reasons.map((r) => r.replace(/\.$/, '') + '.');
  if (note?.trim()) parts.push(note.trim().replace(/\.$/, '') + '.');
  return parts.join(' ');
}

// Pre-seeded mock cancelled orders never ran through the live CancelOrderModal,
// so they carry no cancelReasons/cancelNote — this fills in a deterministic,
// varied reason+note per order (same idHash pattern as slaStateFor/creatorFor)
// so browsing between them doesn't show identical "N/A" everywhere. 'Other' is
// excluded from the mock pool — it requires a note in the real flow, and the
// mock note here is independent/decorative, not gated the same way.
const MOCK_CANCEL_NOTES = [
  'Customer changed their mind after placing the order.',
  'Recipient could not be reached after multiple attempts.',
  'Requested a refund instead of redelivery.',
  'Wrong address provided at checkout.',
];
export function mockCancellationFor(o: Order): { reasons: string[]; note: string } {
  const h = idHash(o.id);
  const pool = CANCEL_REASONS.filter((r) => r !== 'Other');
  const reasons =
    h % 2 === 0
      ? [pool[h % pool.length]!]
      : [pool[h % pool.length]!, pool[(h + 1) % pool.length]!];
  return { reasons, note: MOCK_CANCEL_NOTES[h % MOCK_CANCEL_NOTES.length]! };
}

import { AVATAR_PHOTOS } from '@leta-io/components';
import type { DepotOption, Order } from '../store/types.js';
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

export const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

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
  {
    source: 'human',
    name: 'Aisha Mohamed',
    email: 'aisha.mohamed@leta.ai',
    avatarSrc: AVATAR_PHOTOS[0],
  },
  { source: 'human', name: 'Grace Wanjiru', email: 'grace.wanjiru@leta.ai' },
  {
    source: 'human',
    name: 'Samuel Mwangi',
    email: 'samuel.mwangi@leta.ai',
    avatarSrc: AVATAR_PHOTOS[1],
  },
  { source: 'human', name: 'Fatuma Hassan', email: 'fatuma.hassan@leta.ai' },
  {
    source: 'human',
    name: 'Peter Kamau',
    email: 'peter.kamau@leta.ai',
    avatarSrc: AVATAR_PHOTOS[2],
  },
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

// ── Mock SLA state + duration (Table spec §2.3, Doc 4) ───────────────────────────
export type SlaState = 'on-target' | 'at-risk' | 'delayed';

export function slaStateFor(o: Order): SlaState {
  const h = idHash(o.id) % 5;
  return h === 3 ? 'at-risk' : h === 4 ? 'delayed' : 'on-target';
}
/** Plausible per-state mock elapsed seconds (on-target short, at-risk near the
 *  SLA boundary, delayed past it). */
export function durationSecondsFor(o: Order, sla: SlaState, finished: boolean): number {
  const h = idHash(o.id);
  const seconds = (h * 7) % 60;
  let minutes: number;
  if (finished) minutes = sla === 'delayed' ? 30 + (h % 31) : 8 + (h % 25);
  else if (sla === 'delayed') minutes = 13 + (h % 22);
  else if (sla === 'at-risk') minutes = 9 + (h % 5);
  else minutes = 2 + (h % 10);
  return minutes * 60 + seconds;
}
export function mockDurationFor(o: Order, sla: SlaState, finished: boolean): string {
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
    h % 2 === 0 ? [pool[h % pool.length]!] : [pool[h % pool.length]!, pool[(h + 1) % pool.length]!];
  return { reasons, note: MOCK_CANCEL_NOTES[h % MOCK_CANCEL_NOTES.length]! };
}

import type { BroadcastState, ClientConfig, Order, OrderStatus } from '../store/types.js';
import { depotForOrder, idHash, scheduledOriginFor } from './orderMeta.js';

/**
 * **The single source of truth for "how did this order get its driver?"**
 *
 * Every surface that narrates dispatch — the table's Order-ID provenance icons,
 * the drawer header icons, the Overview summary card + auto-assign banner, the
 * Activity trail, and the Dispatch Logs tab — MUST derive from this one
 * function. Nothing may re-derive dispatch provenance from its own signal.
 *
 * ## Why this exists (2026-08-04)
 *
 * The three drawer tabs each answered this question independently, from five
 * mutually-contradictory signals:
 *
 * | Signal | Read by | Problem |
 * |---|---|---|
 * | `order.batchId` | Dispatch Logs `resolveState` | absent ⇒ claimed "Manual Assignment" |
 * | `client.config.autoBroadcast` | Activity assigned-branch | **client**-level, not per order |
 * | `status === 'assigned'` (ungated) | Overview auto-assign banner | fired on *every* Assigned order |
 * | `idHash % 3` | Broadcast provenance icon | unrelated to either of the above |
 * | `MAIN_SEQUENCE` (always has `broadcasted`) | Activity steps | every order "was broadcast" |
 *
 * The visible result: one order whose Dispatch Logs read "Peter Kamau was
 * manually assigned" while its Activity tab read "Automatic order dispatch to
 * Peter Kamau" *and* logged a broadcast — plus an Overview banner announcing an
 * automatic assignment on an order whose header carried no Broadcast icon.
 *
 * ## The rule (ruled 2026-08-04): config decides, manual is the exception
 *
 * If the client auto-broadcasts **and** the order's depot carries a broadcast
 * config, the order **was broadcast** — Dispatch Logs always shows that history.
 * "Manual" is true only when the dispatcher actually intervened: dispatching
 * inside the hold window (before any broadcast ran) or after the sequence was
 * exhausted. **A later reassignment never makes an order manual** — reassignment
 * is a separate, Activity-only event that does not concern the broadcast logs.
 *
 * Two consequences that were previously violated and are now guaranteed:
 *
 * 1. **You cannot reassign an order to the driver who already holds it.**
 *    {@link DispatchNarrative.reassignment} always names a *different* previous
 *    driver.
 * 2. **The broadcast's accepting driver is the order's real driver** — or, when a
 *    reassignment followed, the *previous* one. It is never an unrelated name
 *    plucked from a pool.
 */

// ── Public shape ────────────────────────────────────────────────────────────────

/** How the order's CURRENT driver came to hold it. */
export type DispatchMethod =
  /** A driver accepted an auto-broadcast. */
  | 'broadcast'
  /** A dispatcher assigned by hand. */
  | 'manual'
  /** Not dispatched yet — no driver. */
  | 'none';

export interface DispatchNarrative {
  /** Client auto-broadcasts AND this order's depot has a broadcast config. */
  broadcastCapable: boolean;
  /** A broadcast sequence actually ran for this order (it may have failed). */
  wasBroadcast: boolean;
  method: DispatchMethod;
  /** Which manual path — only set when `method === 'manual'`. */
  manualStage: 'before-broadcast' | 'after-exhausted' | null;
  /** Scheduled-origin order (drives the Calendar provenance icon). */
  scheduledOrigin: boolean;
  /**
   * Show the Broadcast provenance icon (table Order-ID cell + drawer header).
   * Now means exactly "this order was dispatched by broadcast", so it can never
   * disagree with the Overview banner or the Dispatch Logs tab again.
   */
  showBroadcastIcon: boolean;
  /** Which of the seven Dispatch Logs shapes this order sits in. */
  broadcastState: BroadcastState;
  /**
   * A manual driver reassignment after the initial dispatch. `fromName` is
   * guaranteed different from the order's current driver.
   */
  reassignment: { fromName: string; toName: string } | null;
  /**
   * The driver who accepted the broadcast. Equals the current driver normally;
   * equals the *previous* driver when a reassignment followed (the broadcast
   * logs keep showing who actually accepted). Null when no broadcast resolved.
   */
  acceptedByName: string | null;
  /**
   * Overview's "This order was automatically assigned to X" banner. Suppressed
   * once a manual reassignment has happened — the banner describes how the
   * CURRENT driver got the order, and after a reassignment that is no longer
   * true (the reassignment lives in Activity; Dispatch Logs still shows the
   * original acceptor).
   */
  showAutoAssignBanner: boolean;
}

// ── Signals ─────────────────────────────────────────────────────────────────────

/** Statuses where a driver holds the order. */
const DISPATCHED: OrderStatus[] = ['assigned', 'at-depot', 'in-transit', 'arrived', 'returning'];
const FINISHED: OrderStatus[] = ['delivered', 'cancelled'];

/**
 * Statuses eligible to show the Broadcast provenance icon — any status where a
 * driver holds or held the order, never while still unassigned
 * (Scheduled/Pending/Broadcasted/Returned) per OM §7.2.
 */
const BROADCAST_ICON_ELIGIBLE: OrderStatus[] = [...DISPATCHED, ...FINISHED];

/**
 * The deterministic "manual is the exception" marker. ~1 in 7 dispatched orders
 * on a broadcast-capable depot were dispatched by hand instead. This is the ONLY
 * place that decision is made.
 */
function isManualException(order: Order): boolean {
  return idHash(order.id) % 7 === 0;
}

/** Of the manual exceptions, which ones happened *after* a failed broadcast. */
function isManualAfterExhausted(order: Order): boolean {
  return idHash(order.id) % 3 === 0;
}

/** The deterministic "this order got reassigned" marker (existing flavour). */
function hasReassignment(order: Order): boolean {
  return idHash(order.id) % 4 === 2;
}

/**
 * Pool of plausible previous drivers. The current driver is always filtered out
 * before picking, so a reassignment can never read "X → X".
 */
const PREVIOUS_DRIVER_POOL = ['Adam Onyango', 'Samuel Mwangi', 'Peter Kamau', 'Brian Otieno', 'Michael Kariuki'];

/** Deterministically pick a previous driver that is NOT the current one. */
export function previousDriverFor(order: Order, currentDriverName: string | null): string {
  const pool = PREVIOUS_DRIVER_POOL.filter((n) => n !== currentDriverName);
  return pool[idHash(order.id) % pool.length]!;
}

// ── Entry point ─────────────────────────────────────────────────────────────────

/**
 * @param currentDriverName the order's driver, or null. Callers that only need
 *   provenance flags (e.g. the table's Order-ID cell) may pass `null` — the
 *   driver only affects `reassignment` / `acceptedByName`.
 */
export function buildDispatchNarrative(
  order: Order,
  config: ClientConfig,
  currentDriverName: string | null,
): DispatchNarrative {
  const status = order.status;
  const dispatched = DISPATCHED.includes(status) || FINISHED.includes(status);
  // Derived here rather than passed in, so the table and the drawer can never
  // resolve a different depot for the same order.
  const depot = depotForOrder(order, config.depots);
  const broadcastCapable = config.autoBroadcast && !!depot?.broadcast;
  const scheduledOrigin =
    scheduledOriginFor(order) && !(status === 'pending' && config.autoBroadcast);

  // ── method / wasBroadcast ──
  let method: DispatchMethod;
  let manualStage: DispatchNarrative['manualStage'] = null;
  let wasBroadcast: boolean;

  // A seeded fixture pins the Dispatch Logs shape for design review, and that pin
  // is authoritative for the WHOLE narrative — otherwise `method` would be
  // derived independently and could contradict the pinned state, which is the
  // very class of bug this module exists to prevent.
  const pinned = order.broadcastState ? methodForPinnedState(order.broadcastState) : null;

  if (pinned && dispatched) {
    method = pinned.method === 'none' ? 'broadcast' : pinned.method;
    wasBroadcast = pinned.wasBroadcast;
    if (method === 'manual') {
      manualStage = order.broadcastState === 'manual-after-exhausted' ? 'after-exhausted' : 'before-broadcast';
    }
  } else if (pinned) {
    method = 'none';
    wasBroadcast = pinned.wasBroadcast;
  } else if (!dispatched) {
    method = 'none';
    // An unassigned order has been broadcast only if a sequence already ran and
    // failed (it carries a batch id from that run) or it is out on one now.
    wasBroadcast = broadcastCapable && (status === 'broadcasted' || !!order.batchId);
  } else if (!broadcastCapable) {
    // No broadcast could ever have run, so the assignment was made by hand.
    method = 'manual';
    manualStage = 'before-broadcast';
    wasBroadcast = false;
  } else if (isManualException(order)) {
    method = 'manual';
    manualStage = isManualAfterExhausted(order) ? 'after-exhausted' : 'before-broadcast';
    // Only the after-exhausted path had a broadcast run before the dispatcher
    // stepped in.
    wasBroadcast = manualStage === 'after-exhausted';
  } else {
    method = 'broadcast';
    wasBroadcast = true;
  }

  // ── reassignment ──
  // Only meaningful once a driver holds the order, and never to the same driver.
  const reassignment =
    dispatched && currentDriverName && hasReassignment(order)
      ? { fromName: previousDriverFor(order, currentDriverName), toName: currentDriverName }
      : null;

  // ── the accepting driver ──
  // The broadcast resolved to whoever held the order at that moment: the current
  // driver, or the previous one when a reassignment followed.
  const acceptedByName =
    method === 'broadcast' ? (reassignment ? reassignment.fromName : currentDriverName) : null;

  // ── Dispatch Logs state ──
  const broadcastState = resolveBroadcastState(order, {
    broadcastCapable,
    method,
    manualStage,
    wasBroadcast,
  });

  return {
    broadcastCapable,
    wasBroadcast,
    method,
    manualStage,
    scheduledOrigin,
    showBroadcastIcon: method === 'broadcast' && BROADCAST_ICON_ELIGIBLE.includes(status),
    broadcastState,
    reassignment,
    acceptedByName,
    showAutoAssignBanner: status === 'assigned' && method === 'broadcast' && !reassignment,
  };
}

/**
 * Maps the narrative onto one of the seven Dispatch Logs shapes. A seeded
 * fixture's `order.broadcastState` always wins so every state stays reachable
 * for design review (see `mockData.ts`).
 */
function resolveBroadcastState(
  order: Order,
  n: {
    broadcastCapable: boolean;
    method: DispatchMethod;
    manualStage: DispatchNarrative['manualStage'];
    wasBroadcast: boolean;
  },
): BroadcastState {
  if (order.broadcastState) return order.broadcastState;

  if (n.method === 'manual') {
    return n.manualStage === 'after-exhausted' ? 'manual-after-exhausted' : 'manual-before-broadcast';
  }
  if (!n.broadcastCapable) return 'on-hold';

  switch (order.status) {
    case 'scheduled':
    case 'returned':
      return 'on-hold';
    case 'pending':
      // Back in the queue after a broadcast ran → the sequence was exhausted.
      // Never broadcast → the hold window is still open.
      return n.wasBroadcast ? 'exhausted' : 'on-hold';
    case 'broadcasted':
      return 'broadcasting';
    default:
      return 'completed';
  }
}

/**
 * Derives the narrative for an order whose `broadcastState` fixture pins it to a
 * specific Dispatch Logs shape, keeping method/wasBroadcast consistent with that
 * pin. Used by the seeded review fixtures so a pinned `manual-before-broadcast`
 * order doesn't also claim to have been broadcast.
 */
export function methodForPinnedState(state: BroadcastState): {
  method: DispatchMethod;
  wasBroadcast: boolean;
} {
  switch (state) {
    case 'manual-before-broadcast':
      return { method: 'manual', wasBroadcast: false };
    case 'manual-after-exhausted':
      return { method: 'manual', wasBroadcast: true };
    case 'on-hold':
      return { method: 'none', wasBroadcast: false };
    case 'completed':
      return { method: 'broadcast', wasBroadcast: true };
    default:
      // broadcasting / fallback / exhausted — a sequence ran or is running.
      return { method: 'none', wasBroadcast: true };
  }
}

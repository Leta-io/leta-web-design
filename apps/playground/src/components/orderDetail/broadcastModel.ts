import type {
  BroadcastState,
  Client,
  DepotBroadcastConfig,
  DepotOption,
  DriverGroup,
  FleetType,
  Order,
} from '../../store/types.js';
import { idHash, MONTHS } from '../../lib/orderMeta.js';
import type { BroadcastDriver, DriverResponseStatus } from './BroadcastEventAccordion.js';

/**
 * Dispatch Logs (Broadcast Logs) derived data — OM §7.5 / §9, reconciled against the
 * seven wireframe states (`526:52830` On Hold · `526:54608` Broadcasting ·
 * `536:59220` Completed · `548:148566` Fallback · `552:57340` Exhausted ·
 * `548:150265` Manually Dispatched · `1728:124762` Manually Dispatched (after
 * broadcast exhausted)).
 *
 * ## The broadcast domain (per the 2026-08-03 ruling)
 *
 * A **broadcast sequence** = `rounds` *typical rounds*, then — if `fallbackEnabled` —
 * one **fallback round**. Both counts are admin-configured **per depot**
 * ({@link DepotBroadcastConfig}), not per client: not every client is a SaaS tenant,
 * and not every SaaS tenant configures broadcasting for all of its depots. A depot
 * with no config never auto-broadcasts.
 *
 * A typical round broadcasts to each {@link DriverGroup} in priority order (P1 → P2 →
 * P3 …). **Round 1 only** may be led by a **pre-offer** broadcast — drivers the
 * routing algorithm found already on a compatible route. Pre-offer is *not* a group
 * (its drivers may or may not belong to one) and never repeats on later rounds.
 *
 * The fallback round ignores groups entirely and offers the order to every available
 * driver near the depot. If the whole sequence goes unaccepted the dispatcher may
 * **re-broadcast** (restarting the sequence — producing a second sequence whose rounds
 * simply continue the same timeline, with **no sequence demarcation**) or dispatch
 * manually (managed-fleet only).
 *
 * ## Fleet type
 *
 * `managed-fleet` gets the full round/group timeline above. `marketplace` tenants do
 * not manage drivers, so there is no concept of driver groups: the tab collapses to a
 * **single flat entry** listing every driver who saw the broadcast and responded — no
 * rounds, no round markers, no fallback, no Priority Driver Groups drill-down.
 */

// ── Public shape ────────────────────────────────────────────────────────────────

export type { BroadcastState };

/** One leg of a round — a group, the pre-offer lead, or the fallback sweep. */
export type BroadcastLegKind = 'pre-offer' | 'group' | 'fallback';

export interface BroadcastLeg {
  id: string;
  kind: BroadcastLegKind;
  /** Display title, e.g. "In-house [P1]" / "Pre-Offer" / "All nearby drivers [Fallback]". */
  title: string;
  /** 1-based typical-round number; `null` for the fallback leg (it closes the sequence). */
  round: number | null;
  /** Outcome badge — drives both the badge and whether an accepting driver renders. */
  outcome: 'broadcasting' | 'accepted' | 'unaccepted';
  /** "10s elapsed · 5 drivers found" (live) or "Ran for 20s · 5 drivers found" (concluded). */
  subtext: string;
  /** Timestamp shown right-aligned in the entry header. */
  timestamp: string;
  /** The drivers this leg reached, with their responses. */
  drivers: BroadcastDriver[];
  /** Set only when `outcome === 'accepted'` — rendered above the non-responder accordion. */
  acceptedBy?: { name: string; phone: string; seconds: number };
  /** Pre-offer legs carry the explanatory footnote banner. */
  footnote?: string;
  /** Accordion bucket shape — `active` while live, `completed` once concluded. */
  accordionType: 'active' | 'completed';
  /** Whether this leg's accordion starts expanded (the live/most recent leg does). */
  defaultOpen: boolean;
}

export interface NotifiedDriver {
  id: string;
  name: string;
  phone: string;
  /** Group label chip ("P1" / "P2" / "Pre-Offer" / "Fallback"); omitted for marketplace. */
  groupLabel?: string;
  /** "In house" / "Supplier" / "No group" suffix; omitted for marketplace. */
  groupSuffix?: string;
  /** How many broadcast legs reached this driver. */
  notifications: number;
}

export interface BroadcastModel {
  state: BroadcastState;
  fleetType: FleetType;
  /** Depot config driving the sequence; null when the depot never broadcasts. */
  config: DepotBroadcastConfig | null;
  /** Status-card title, e.g. "Broadcasting to In-house drivers [P1]". */
  title: string;
  /** Status-card badge, e.g. "Round 1 of 2" / "Fallback Round". Null = no badge. */
  badge: string | null;
  /** Status-card body copy. */
  subtext: string;
  /** Fill % for the status card's progress indicator; null hides the bar. */
  progressPct: number | null;
  /**
   * Total wall-clock seconds the whole broadcast sequence takes — pre-offer (if
   * enabled) + every group's `acceptanceWindow × retries` across all rounds +
   * the fallback round (if enabled). The status-card bar advances live as
   * `summary.elapsedSeconds / sequenceTotalSeconds`, so the bar tracks how far
   * the sequence has progressed (round 1 → round N → fallback). Null when there
   * is no live sequence (no bar).
   */
  sequenceTotalSeconds: number | null;
  /** Manual-assignment card (both manual states) — rendered above the broadcast card. */
  manualAssignment: { driverName: string; time: string } | null;
  /** Exhausted only: the inline "Re-broadcast" link inside the subtext. */
  showRebroadcastLink: boolean;
  /** Top-of-body banner (On Hold's "assign a driver" nudge / Exhausted's failure notice). */
  banner: { kind: 'assign-driver' | 'dispatch-manually'; text: string } | null;
  /** Fallback only: the subtle in-card notice under the progress bar. */
  inCardNotice: string | null;
  /**
   * On Hold only: minutes the countdown starts from — the SAME base the
   * Overview tab's "{N} minutes to broadcast." row derives from
   * (`client.config.orderWaitMinutes`, hashed per order), so the two tabs
   * always agree on the number and count down together regardless of which
   * tab is mounted when (OM Appendix A `dispatch.orderWaitTime`). Null
   * otherwise. The live subtraction happens in the drawer, not here — see
   * `OrderDetailDrawer`'s `holdMinutesRemaining`.
   */
  holdMinutesBase: number | null;
  /** Whether `summary.elapsedSeconds` should tick live (a broadcast is actually running). */
  liveElapsed: boolean;
  /** Broadcast summary triplet — `elapsedSeconds` is the raw value; the tab formats + ticks it. */
  summary: { notifiedDrivers: number; elapsedSeconds: number; batchedOrders: number };
  /** Timeline legs, **newest first** (matching the Activity tab's ordering). */
  legs: BroadcastLeg[];
  /** Empty-state copy when `legs` is empty. */
  emptyDescription: string | null;
  /** Whether the Priority Driver Groups drill-down is reachable (managed-fleet only). */
  showPriorityGroupsLink: boolean;
  /** Whether the Notified Drivers drill-down is reachable (any log-bearing state). */
  showNotifiedDriversLink: boolean;
  notifiedDrivers: NotifiedDriver[];
  /** Batch identifier shown in the Batched Orders drill-down. */
  batchId: string;
}

// ── Mock driver pool ────────────────────────────────────────────────────────────

const DRIVER_POOL = [
  { name: 'Ethan Mwangi', phone: '+254 712 345 678' },
  { name: 'Liam Otieno', phone: '+254 701 239 874' },
  { name: 'Ethan Karanja', phone: '+254 798 462 310' },
  { name: 'Liam Okoth', phone: '+254 712 345 678' },
  { name: 'John Mwangi', phone: '+254 712 345 678' },
  { name: 'Peter Paka', phone: '+254 701 239 874' },
  { name: 'David Kibet', phone: '+254 733 987 654' },
  { name: 'Adam Onyango', phone: '+254 701 234 567' },
  { name: 'Beatrice Biko', phone: '+254 702 345 678' },
  { name: 'Charles Mwangi', phone: '+254 703 456 789' },
  { name: 'Diana Ruto', phone: '+254 704 567 890' },
  { name: 'Elias Kariuki', phone: '+254 705 678 901' },
  { name: 'Faith Gichuru', phone: '+254 706 789 012' },
  { name: 'Nia Lwanga', phone: '+254 798 123 456' },
  { name: 'Moses Bwika', phone: '+254 712 345 678' },
  { name: 'Amina Kamau', phone: '+254 734 567 890' },
  { name: 'James Ruto', phone: '+254 745 678 901' },
  { name: 'Susan Kariuki', phone: '+254 726 789 012' },
];

const GROUP_SUFFIX: Record<string, string> = {
  'In-house': 'In house',
  Suppliers: 'Supplier',
  Floaters: 'Floaters',
};

/** Deterministic per-leg driver slice + response mix. */
function legDrivers(seed: number, count: number, live: boolean, accepted: boolean): BroadcastDriver[] {
  const out: BroadcastDriver[] = [];
  for (let i = 0; i < count; i++) {
    const p = DRIVER_POOL[(seed + i * 3) % DRIVER_POOL.length]!;
    // Live legs are still waiting on most drivers; concluded legs resolved to
    // declined/timed-out (an accepted leg's acceptor renders separately).
    let status: DriverResponseStatus;
    if (live) status = i === count - 1 ? 'declined' : 'no-response';
    else status = (seed + i) % 5 === 0 || i >= count - 2 ? 'timed-out' : 'declined';
    out.push({ id: `${seed}-${i}`, name: p.name, phone: p.phone, status });
  }
  if (accepted) out.shift(); // the acceptor is surfaced via `acceptedBy`
  return out;
}

function fmtRan(seconds: number, live: boolean, found: number): string {
  const time = seconds >= 60 ? `${Math.floor(seconds / 60)}m ${String(seconds % 60).padStart(2, '0')}s` : `${seconds}s`;
  return `${live ? `${time} elapsed` : `Ran for ${time}`} · ${found} driver${found === 1 ? '' : 's'} found`;
}

/** "10s" / "2m 06s" — just the value, no trailing word (the label renders separately
 *  so the number can be styled semibold and ticked live without re-parsing a string). */
export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m ${String(seconds % 60).padStart(2, '0')}s`;
}

function fmtStamp(base: Date, minuteOffset: number): string {
  const d = new Date(base.getTime() + minuteOffset * 60 * 1000);
  let h = d.getHours();
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}, ${h}:${String(d.getMinutes()).padStart(2, '0')} ${ampm}`;
}

/** Round-1 pre-offer lead + fallback-sweep windows (must match the leg builder). */
const PRE_OFFER_SECONDS = 20;
const FALLBACK_SECONDS = 40;

/**
 * Total wall-clock seconds one broadcast sequence runs: the round-1 pre-offer
 * lead (if enabled), then every group's `acceptanceWindow × retries` across all
 * `rounds`, then the fallback sweep (if enabled). Drives the status-card bar's
 * live fill (`elapsed / total`).
 */
function sequenceTotalSeconds(config: DepotBroadcastConfig): number {
  const perRound = config.groups.reduce((s, g) => s + g.acceptanceWindowSeconds * Math.max(1, g.retries), 0);
  const preOffer = config.preOfferEnabled ? PRE_OFFER_SECONDS : 0;
  const fallback = config.fallbackEnabled ? FALLBACK_SECONDS : 0;
  return Math.max(1, preOffer + perRound * Math.max(1, config.rounds) + fallback);
}

// ── Which state does this order sit in? ─────────────────────────────────────────

/**
 * Maps (fleetType, depot config, order status, provenance) → one of the seven shapes.
 *
 * A seeded fixture's `order.broadcastState` wins, so every state stays reachable for
 * design review (see `mockData.ts`). Orders created live in-session carry no override
 * and fall through to derivation below.
 *
 * The derivation deliberately uses **real signals**, not a hash: whether the depot
 * broadcasts at all, whether a driver is assigned, and whether the order carries a
 * `batchId` (the marker that a broadcast actually ran for it).
 */
function resolveState(
  order: Order,
  config: DepotBroadcastConfig | null,
  autoBroadcast: boolean,
  manualDriverName: string | null,
): BroadcastState {
  if (order.broadcastState) return order.broadcastState;

  const dispatched = !!order.driverId;
  // A batch id only exists once the order has been put out on a broadcast.
  const wasBroadcast = !!order.batchId;

  // No broadcast config on the depot, or the client doesn't auto-broadcast at all →
  // any assignment must have been made by hand, before any broadcast existed.
  if (!config || !autoBroadcast) {
    return dispatched ? 'manual-before-broadcast' : 'on-hold';
  }

  switch (order.status) {
    case 'scheduled':
      return 'on-hold';
    case 'pending':
      // Back in the queue after a broadcast ran → the sequence was exhausted.
      // Never broadcast → the hold window is still open.
      return wasBroadcast ? 'exhausted' : 'on-hold';
    case 'broadcasted':
      return 'broadcasting';
    case 'returned':
      return 'on-hold';
    default:
      // Dispatched or finished — a driver is on it. Without a broadcast having run,
      // the dispatcher must have assigned by hand.
      return wasBroadcast ? 'completed' : manualDriverName ? 'manual-before-broadcast' : 'completed';
  }
}

// ── Leg construction ────────────────────────────────────────────────────────────

/**
 * Builds the full leg history for a managed-fleet sequence, oldest → newest, then
 * reverses. `upTo` marks how far the sequence progressed and whether the final leg is
 * still live or concluded.
 */
function buildManagedLegs(
  order: Order,
  config: DepotBroadcastConfig,
  base: Date,
  opts: { reachedRounds: number; reachedFallback: boolean; liveLeg: boolean; acceptedAt: number | null },
): BroadcastLeg[] {
  const h = idHash(order.id);
  const legs: BroadcastLeg[] = [];
  let minute = 0;
  let legIndex = 0;

  const push = (
    kind: BroadcastLegKind,
    title: string,
    round: number | null,
    windowSeconds: number,
    driverCount: number,
    footnote?: string,
  ) => {
    legs.push({
      id: `leg-${legIndex}`,
      kind,
      title,
      round,
      // Placeholders — outcome/subtext/open state are stamped after the full list is
      // known (only the final leg can be live, only one leg can be the acceptor).
      outcome: 'unaccepted',
      subtext: fmtRan(windowSeconds, false, driverCount),
      timestamp: fmtStamp(base, minute),
      drivers: legDrivers(h + legIndex * 7, driverCount, false, false),
      footnote,
      accordionType: 'completed',
      defaultOpen: false,
    });
    legIndex += 1;
    minute += 1;
  };

  for (let round = 1; round <= opts.reachedRounds; round++) {
    // Pre-offer leads round 1 only, and only when the depot enables it.
    if (round === 1 && config.preOfferEnabled) {
      push('pre-offer', 'Pre-Offer', 1, 20, 2, 'Pre-offers are sent to drivers already on a compatible route.');
    }
    for (const g of config.groups) {
      push('group', `${g.name} [P${g.priority}]`, round, g.acceptanceWindowSeconds, Math.min(g.totalDrivers, 5));
    }
  }
  if (opts.reachedFallback) {
    push('fallback', 'All nearby drivers [Fallback]', null, 40, 5);
  }

  if (legs.length === 0) return legs;

  // Stamp the terminal leg: live (still broadcasting) or the acceptor.
  const last = legs[legs.length - 1]!;
  if (opts.liveLeg) {
    const windowSeconds = last.kind === 'group'
      ? config.groups.find((g) => last.title.startsWith(g.name))?.acceptanceWindowSeconds ?? 40
      : 40;
    const elapsed = Math.max(5, (h % windowSeconds) || 10);
    last.outcome = 'broadcasting';
    last.accordionType = 'active';
    last.subtext = fmtRan(elapsed, true, last.drivers.length);
    last.drivers = legDrivers(h + (legIndex - 1) * 7, last.drivers.length, true, false);
  } else if (opts.acceptedAt != null) {
    const acceptor = legs[opts.acceptedAt];
    if (acceptor) {
      const p = DRIVER_POOL[(h + 5) % DRIVER_POOL.length]!;
      acceptor.outcome = 'accepted';
      acceptor.acceptedBy = { name: p.name, phone: p.phone, seconds: 5 };
    }
  }
  // The newest leg opens expanded; everything older collapses (per every wireframe).
  last.defaultOpen = true;

  return legs.reverse();
}

/** Marketplace: one flat leg listing every responder — no rounds, no groups. */
function buildMarketplaceLeg(order: Order, base: Date, live: boolean, accepted: boolean): BroadcastLeg[] {
  const h = idHash(order.id);
  const drivers = legDrivers(h, 5, live, accepted);
  const leg: BroadcastLeg = {
    id: 'leg-flat',
    kind: 'fallback',
    title: 'All nearby drivers',
    round: null,
    outcome: live ? 'broadcasting' : accepted ? 'accepted' : 'unaccepted',
    subtext: fmtRan(live ? Math.max(5, h % 40) : 40, live, drivers.length + (accepted ? 1 : 0)),
    timestamp: fmtStamp(base, 0),
    drivers,
    accordionType: live ? 'active' : 'completed',
    defaultOpen: true,
  };
  if (accepted) {
    const p = DRIVER_POOL[(h + 5) % DRIVER_POOL.length]!;
    leg.acceptedBy = { name: p.name, phone: p.phone, seconds: 5 };
  }
  return [leg];
}

/** Rolls the legs up into the Notified Drivers drill-down list. */
function buildNotifiedDrivers(legs: BroadcastLeg[], fleetType: FleetType, groups: DriverGroup[]): NotifiedDriver[] {
  const byKey = new Map<string, NotifiedDriver>();
  for (const leg of legs) {
    const label =
      leg.kind === 'pre-offer' ? 'Pre-Offer' : leg.kind === 'fallback' ? 'Fallback' : `P${leg.round != null ? groups.find((g) => leg.title.startsWith(g.name))?.priority ?? 1 : 1}`;
    const groupName = groups.find((g) => leg.title.startsWith(g.name))?.name;
    const everyone = [
      ...(leg.acceptedBy ? [{ name: leg.acceptedBy.name, phone: leg.acceptedBy.phone }] : []),
      ...leg.drivers,
    ];
    for (const d of everyone) {
      const key = `${d.name}|${d.phone}`;
      const existing = byKey.get(key);
      if (existing) {
        existing.notifications += 1;
        continue;
      }
      byKey.set(key, {
        id: key,
        name: d.name,
        phone: d.phone,
        // Marketplace drops the group chip + suffix entirely (no groups exist).
        ...(fleetType === 'marketplace'
          ? {}
          : { groupLabel: label, groupSuffix: groupName ? GROUP_SUFFIX[groupName] ?? groupName : 'No group' }),
        notifications: 1,
      });
    }
  }
  return [...byKey.values()];
}

// ── Entry point ─────────────────────────────────────────────────────────────────

export function buildBroadcastModel(
  order: Order,
  client: Client,
  depot: DepotOption | undefined,
  manualDriverName: string | null,
): BroadcastModel {
  const h = idHash(order.id);
  const fleetType = client.fleetType;
  const config = depot?.broadcast ?? null;
  const marketplace = fleetType === 'marketplace';
  const state = resolveState(order, config, client.config.autoBroadcast, manualDriverName);
  const base = new Date(order.createdAt);
  const batchId = order.batchId ?? String(9000 + (h % 999));
  const batchedOrders = 10;

  // ── Legs ──
  let legs: BroadcastLeg[] = [];
  if (config && state !== 'on-hold' && state !== 'manual-before-broadcast') {
    const totalRounds = config.rounds;
    if (marketplace) {
      legs = buildMarketplaceLeg(order, base, state === 'broadcasting' || state === 'fallback', state === 'completed');
    } else if (state === 'broadcasting') {
      // Mid-sequence: a deterministic subset of the rounds has run.
      legs = buildManagedLegs(order, config, base, {
        reachedRounds: Math.max(1, (h % totalRounds) + 1),
        reachedFallback: false,
        liveLeg: true,
        acceptedAt: null,
      });
    } else if (state === 'fallback') {
      legs = buildManagedLegs(order, config, base, {
        reachedRounds: totalRounds,
        reachedFallback: true,
        liveLeg: true,
        acceptedAt: null,
      });
    } else if (state === 'completed') {
      const reachedRounds = Math.max(1, (h % totalRounds) + 1);
      const built = buildManagedLegs(order, config, base, { reachedRounds, reachedFallback: false, liveLeg: false, acceptedAt: null });
      // `built` is newest-first; the acceptor is the newest leg.
      if (built[0]) {
        const p = DRIVER_POOL[(h + 5) % DRIVER_POOL.length]!;
        built[0].outcome = 'accepted';
        built[0].acceptedBy = { name: p.name, phone: p.phone, seconds: 5 };
        built[0].drivers = built[0].drivers.slice(1);
      }
      legs = built;
    } else {
      // exhausted / manual-after-exhausted — the whole sequence ran and failed.
      legs = buildManagedLegs(order, config, base, {
        reachedRounds: totalRounds,
        reachedFallback: config.fallbackEnabled,
        liveLeg: false,
        acceptedAt: null,
      });
    }
  }

  const notifiedDrivers = buildNotifiedDrivers(legs, fleetType, config?.groups ?? []);
  const liveLeg = legs.find((l) => l.outcome === 'broadcasting') ?? null;
  const acceptedLeg = legs.find((l) => l.outcome === 'accepted') ?? null;

  // Elapsed across the whole sequence — roughly 1 minute per concluded leg.
  const elapsedSeconds = legs.length === 0 ? 0 : legs.length * 30 + (h % 20);

  // ── Status-card copy per state (verbatim from the wireframes) ──
  let title = '';
  let badge: string | null = null;
  let subtext = '';
  let progressPct: number | null = null;
  let banner: BroadcastModel['banner'] = null;
  let inCardNotice: string | null = null;
  let showRebroadcastLink = false;
  let emptyDescription: string | null = null;
  let manualAssignment: BroadcastModel['manualAssignment'] = null;
  let holdMinutesBase: number | null = null;

  const roundBadge = (round: number | null) =>
    round == null ? 'Fallback Round' : `Round ${round} of ${config?.rounds ?? 1}`;

  switch (state) {
    case 'on-hold': {
      // Same formula as detailModel.ts's row-2b "{N} minutes to broadcast." —
      // both read `client.config.orderWaitMinutes` and hash the same order id,
      // so the two tabs start from an identical base (OM Appendix A).
      holdMinutesBase = (h % Math.max(client.config.orderWaitMinutes, 2)) + 1;
      title = `Broadcast starts in ${holdMinutesBase} minute${holdMinutesBase === 1 ? '' : 's'}`;
      subtext = 'When the hold window closes, the broadcast will run through all priority groups.';
      banner = { kind: 'assign-driver', text: 'Assign a driver to this order before broadcast begins.' };
      // SAAS / managed-fleet gets the auto-broadcast-specific copy (updated in
      // Figma 526:52830, 2026-08-04); marketplace tenants have no broadcast
      // sequence, so they get the generic placeholder.
      emptyDescription = marketplace
        ? 'All broadcast logs will be displayed here'
        : 'Dispatch manually now to bypass auto-broadcast. Once the hold window closes, drivers will receive order broadcasts.';
      break;
    }
    case 'broadcasting': {
      const leg = liveLeg ?? legs[0];
      if (marketplace) {
        title = 'Broadcasting to all nearby drivers';
      } else if (leg?.kind === 'pre-offer') {
        title = 'Broadcasting to pre-offer drivers';
      } else {
        // Figma's pattern is "Broadcasting to {name} drivers [Px]" ("In-house
        // drivers [P1]"). Skip the " drivers" suffix when the admin's group name is
        // already plural, so we never render "Suppliers drivers".
        const name = leg?.title.replace(/\s*\[P\d+\]$/, '') ?? 'nearby';
        const rank = leg?.title.match(/\[(P\d+)\]/)?.[1];
        title = `Broadcasting to ${name}${/s$/i.test(name) ? '' : ' drivers'}${rank ? ` [${rank}]` : ''}`;
      }
      badge = marketplace ? null : roundBadge(leg?.round ?? 1);
      subtext = marketplace
        ? 'Drivers near the depot are being notified. Responses appear below as they come in.'
        : config?.fallbackEnabled
          ? 'If no one accepts across all priority groups, it will be broadcasted to all available drivers near the depot.'
          : // No fallback round configured for this depot — say what actually happens.
            'If no one accepts across all priority groups, you can re-broadcast or dispatch the order manually.';
      progressPct = 25 + (h % 50);
      break;
    }
    case 'fallback': {
      title = 'Broadcasting to all nearby drivers';
      badge = 'Fallback Round';
      subtext = 'No driver accepted. Broadcasting now to all available drivers near the depot.';
      progressPct = 30 + (h % 45);
      inCardNotice = 'If no driver accepts the fallback broadcast, you can re-broadcast the order(s) manually.';
      break;
    }
    case 'completed': {
      const at = acceptedLeg?.title.replace(/\s*\[(P\d)\]$/, ' ($1)') ?? 'the broadcast';
      title = marketplace ? 'Broadcast resolved' : `Broadcast Resolved at ${acceptedLeg?.title ?? ''}`.trim();
      badge = marketplace ? null : roundBadge(acceptedLeg?.round ?? 1);
      subtext = acceptedLeg?.acceptedBy
        ? legs.length > 1
          ? `${acceptedLeg.acceptedBy.name} accepted after the broadcast to ${legs[1]?.title.replace(/\s*\[(P\d)\]$/, ' ($1)') ?? 'earlier drivers'} was unaccepted.`
          : `${acceptedLeg.acceptedBy.name} accepted the broadcast at ${at}.`
        : 'A driver accepted the broadcast.';
      break;
    }
    case 'exhausted': {
      title = 'Broadcasts unaccepted';
      subtext = 'No driver accepted the broadcasts.';
      showRebroadcastLink = true;
      banner = { kind: 'dispatch-manually', text: 'Broadcast unsuccessful. Try dispatching manually.' };
      break;
    }
    case 'manual-before-broadcast': {
      title = 'Manual Assignment';
      subtext = '';
      manualAssignment = {
        driverName: manualDriverName ?? 'A driver',
        time: fmtStamp(base, 4).split(', ')[1] ?? '12:04 PM',
      };
      emptyDescription = `This order was dispatched manually, so no drivers were notified through broadcast. ${manualDriverName ?? 'The driver'} was assigned directly.`;
      break;
    }
    case 'manual-after-exhausted': {
      // Two stacked cards: the manual assignment, then the failed-broadcast summary.
      // Deliberately NO Re-broadcast link and no top banner (wireframe `1728:124762`).
      title = 'Broadcasts unaccepted';
      subtext = 'No driver accepted the broadcasts.';
      manualAssignment = {
        driverName: manualDriverName ?? 'A driver',
        time: fmtStamp(base, 9).split(', ')[1] ?? '12:09 PM',
      };
      break;
    }
  }

  return {
    state,
    fleetType,
    config,
    title,
    badge,
    subtext,
    progressPct,
    // Only the live states drive a moving bar (progressPct != null); the rest
    // have no sequence-progress bar.
    sequenceTotalSeconds: progressPct != null && config ? sequenceTotalSeconds(config) : null,
    manualAssignment,
    showRebroadcastLink,
    banner,
    inCardNotice,
    holdMinutesBase,
    liveElapsed: state === 'broadcasting' || state === 'fallback',
    summary: {
      notifiedDrivers: notifiedDrivers.length,
      elapsedSeconds,
      batchedOrders,
    },
    legs,
    emptyDescription,
    // Marketplace tenants have no driver groups, so the drill-down doesn't exist.
    showPriorityGroupsLink: !marketplace && !!config && state !== 'manual-before-broadcast',
    showNotifiedDriversLink: legs.length > 0,
    notifiedDrivers,
    batchId,
  };
}

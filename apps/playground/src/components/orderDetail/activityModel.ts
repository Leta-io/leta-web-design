import type { AvatarTone } from '@leta/components';
import type { IconName } from '@leta/icons';
import type { ClientConfig, OrderStatus } from '../../store/types.js';
import { CURRENT_USER } from '../../store/currentUser.js';
import { formatDateTime, idHash } from '../../lib/orderMeta.js';
import type { OrderDetailModel } from './detailModel.js';

/**
 * Mock Activity-tab trail — synthesizes a plausible lifecycle history for an
 * order (our `Order` model has no stored history yet). Deterministic per
 * order id, same idHash-seeded pattern as `slaStateFor`/`creatorFor` (see
 * `lib/orderMeta.ts`), so re-opening an order always shows the same trail.
 * Maps 1:1 onto the Figma "Activity" component set (`1487:173235`, LETA
 * Playground file) — every leading/title/body shape below corresponds to one
 * of its 20 variants; see `design-parity/activity-entry-inventory.md`.
 */

// The logged-in dispatcher persona (single source of truth: `CURRENT_USER`), so
// every dispatcher action in the activity trail attributes to the same identity
// shown in the TopBar / User Menu / comment composer — and carries that user's
// avatar (their `tone` monogram, or their uploaded photo when set).
export const DISPATCHER_NAME = CURRENT_USER.name;

/** The dispatcher's own leading avatar — the user's photo (if uploaded) or their
 *  tone monogram. Used for every "me"-attributed timeline entry. */
const dispatcherLeading = (): ActivityLeading => ({
  kind: 'avatar',
  name: CURRENT_USER.name,
  tone: CURRENT_USER.tone,
  src: CURRENT_USER.avatarSrc,
});

/** The dispatcher as a mid-sentence actor (avatar + bold name). */
const dispatcherActor = (): TitleSegment => ({
  kind: 'actor',
  name: CURRENT_USER.name,
  tone: CURRENT_USER.tone,
  src: CURRENT_USER.avatarSrc,
});

/** One inline segment of an activity row's rich title. */
export type TitleSegment =
  | { kind: 'text'; text: string }
  /** Bold name, no avatar — used when this actor already owns the row's leading avatar. */
  | { kind: 'name'; text: string }
  /** Avatar + bold name — a different actor mentioned mid-sentence. */
  | { kind: 'actor'; name: string; tone?: AvatarTone; src?: string };

export interface AttachmentItem {
  /** `link` renders a thumbnail + underlined Plain-button label (click opens the proof viewer);
   *  `text` renders just an icon + label (e.g. "Pickup PIN provided"). */
  kind: 'link' | 'text';
  icon?: IconName;
  thumbnailSrc?: string;
  label: string;
  onClick?: () => void;
}

export type ActivityBodyBlock =
  | { kind: 'status'; icon: IconName; lead: string; from: OrderStatus; to: OrderStatus }
  | { kind: 'field'; icon: IconName; lead: string; from: string; to: string }
  /** `text` may carry the Rich Text Area's allowlisted markup (bold/italic/underline/line-breaks) — always render via `renderRichText`, never as raw text. */
  | { kind: 'comment'; text: string; edits?: number; editable?: boolean }
  | { kind: 'attachments'; items: AttachmentItem[] };

export interface ActivityLeading {
  kind: 'icon' | 'avatar';
  icon?: IconName;
  name?: string;
  tone?: AvatarTone;
  src?: string;
}

export interface ActivityItem {
  id: string;
  leading: ActivityLeading;
  title: TitleSegment[];
  timestamp: Date;
  /** Empty → no expand chevron, no bordered container (plain single-line entry). */
  blocks: ActivityBodyBlock[];
  /** Top Filter Section classification (Figma `383:104144`: All / Comments / Events).
   *  `comment` is only a standalone dispatcher/driver "left a comment" post — a
   *  status/field entry that happens to carry an attached reason (Cancel, Return,
   *  Change Driver) stays `event` per the Figma note on `1487:173235`. */
  kind: 'event' | 'comment';
}

const MOCK_RETURN_REASONS = [
  'The recipient is not available. They want it delivered next week',
  'The recipient is not available. I tried calling multiple times but not response',
  'Wrong address — the recipient has moved',
  'The recipient refused the delivery',
];

const MOCK_DRIVER_COMMENTS = [
  "I'm stuck in traffic. Trying to get to the store asap",
  'The driver is extremely late for pickup.',
  'Running about 10 minutes behind schedule.',
];

const MOCK_DISPATCHER_COMMENTS = [
  "The recipient asked us to leave the package with the neighbour if they're out.",
  'Please prioritize this delivery — VIP customer.',
  'Customer called to confirm the address is correct.',
];

/**
 * The driver-side progression. **`broadcasted` is deliberately NOT in this list.**
 *
 * It used to be, which meant every dispatched order logged a broadcast step
 * regardless of how it was actually dispatched — the direct cause of an order
 * whose Activity tab showed "Pending → Broadcasted → automatic dispatch" while
 * its Dispatch Logs tab correctly reported a manual assignment. The
 * pre-dispatch phase is now built from `model.narrative` instead (see
 * `preDispatchEntries`), so a hand-dispatched order logs no broadcast at all.
 */
const DRIVER_SEQUENCE: OrderStatus[] = ['assigned', 'at-depot', 'in-transit', 'arrived', 'delivered'];

interface StepPlan {
  /** `assigned` → `delivered` steps actually reached, in order. */
  steps: OrderStatus[];
  /** Off-path terminal appended after the last reached driver step. */
  offPath?: 'cancelled' | 'returning' | 'returned';
}

function planSteps(status: OrderStatus, h: number, hasDriver: boolean): StepPlan {
  if (status === 'scheduled' || status === 'pending' || status === 'broadcasted') return { steps: [] };
  const idx = DRIVER_SEQUENCE.indexOf(status);
  if (idx !== -1) return { steps: DRIVER_SEQUENCE.slice(0, idx + 1) };
  if (status === 'cancelled') {
    // A cancelled order may never have reached a driver at all — cancel straight
    // out of the pre-dispatch phase in that case.
    if (!hasDriver) return { steps: [], offPath: 'cancelled' };
    const cancelPoint = (['assigned', 'at-depot'] as const)[h % 2]!;
    const cIdx = DRIVER_SEQUENCE.indexOf(cancelPoint);
    return { steps: DRIVER_SEQUENCE.slice(0, cIdx + 1), offPath: 'cancelled' };
  }
  // returning / returned: always diverges from Arrived.
  const arrivedIdx = DRIVER_SEQUENCE.indexOf('arrived');
  return { steps: DRIVER_SEQUENCE.slice(0, arrivedIdx + 1), offPath: status === 'returned' ? 'returned' : 'returning' };
}

export function buildActivityTrail(model: OrderDetailModel, config: ClientConfig): ActivityItem[] {
  const { order, driver, creator, cancellationReason, proofFiles, proofOfPickupFile } = model;
  const h = idHash(order.id);
  const items: ActivityItem[] = [];
  let cursor = new Date(order.createdAt);
  if (isNaN(cursor.getTime())) cursor = new Date();
  const bump = (minutes: number): Date => {
    cursor = new Date(cursor.getTime() + minutes * 60_000);
    return cursor;
  };

  const humanCreator = creator.source === 'human';

  // 1. Creation — always the first entry (Order Manual/Automatic Creation).
  items.push({
    id: 'created',
    leading: { kind: 'icon', icon: 'Add' },
    title: humanCreator
      ? [{ kind: 'text', text: 'Order created by' }, { kind: 'actor', name: creator.name, src: creator.avatarSrc }]
      : [{ kind: 'text', text: `Order added via ${creator.source === 'storefront' ? 'Storefront' : 'API'} integration` }],
    timestamp: new Date(cursor),
    blocks: [],
    kind: 'event',
  });

  const driverName = driver?.name ?? 'the driver';
  const driverTone: AvatarTone | undefined = driver?.tone;
  let prev: OrderStatus = 'pending';

  /**
   * The driver the order was FIRST dispatched to — the broadcast's acceptor, or
   * the dispatcher's original pick. Differs from the current driver whenever a
   * reassignment followed, and the initial-dispatch entry must name this one so
   * the trail lines up with the reassignment that follows it (and with the
   * Dispatch Logs tab's acceptor).
   */
  const initialDriverName = model.narrative.reassignment?.fromName ?? driverName;
  // The current driver's avatar tone only applies when they ARE the initial driver.
  const initialDriverTone: AvatarTone | undefined =
    initialDriverName === driverName ? driverTone : undefined;

  // ── Pre-dispatch phase (from the shared narrative, never re-derived) ──
  // Figma `1487:173235`: "Automatic Order Broadcast" · "Broadcasted Unaccepted" ·
  // "Order Rebroadcasted". A hand-dispatched order (manual before broadcast)
  // produces none of these.
  const { narrative } = model;
  if (narrative.wasBroadcast) {
    // Scheduled-origin orders broadcast straight out of Scheduled (on an
    // auto-broadcast client they skip Pending entirely, §7.2); everything else
    // broadcasts out of Pending once the order-wait window closes.
    const broadcastFrom: OrderStatus = narrative.scheduledOrigin ? 'scheduled' : 'pending';
    items.push({
      id: 'broadcast',
      leading: { kind: 'icon', icon: 'Update' },
      title: [{ kind: 'text', text: 'Automatic order broadcast' }],
      timestamp: bump(3 + (h % 8)),
      blocks: [{ kind: 'status', icon: 'Order-Status', lead: 'Order status changed from', from: broadcastFrom, to: 'broadcasted' }],
      kind: 'event',
    });
    prev = 'broadcasted';

    /** "Broadcasted unaccepted." — the sequence failed and the order fell back
     *  into the queue (Broadcasted → Pending). */
    const pushUnaccepted = (key: string) => {
      items.push({
        id: key,
        leading: { kind: 'icon', icon: 'Update' },
        title: [{ kind: 'text', text: 'Broadcasted unaccepted.' }],
        timestamp: bump(2 + (h % 5)),
        blocks: [{ kind: 'status', icon: 'Order-Status', lead: 'Order status changed from', from: 'broadcasted', to: 'pending' }],
        kind: 'event',
      });
      prev = 'pending';
    };

    // A re-broadcast only exists because the previous sequence went unaccepted, so
    // each one is preceded by that event. Without this pairing the trail jumped
    // straight from "→ Broadcasted" to "Pending → Broadcasted" with nothing
    // explaining how the order got back to Pending.
    for (let i = 0; i < (order.rebroadcastCount ?? 0); i++) {
      pushUnaccepted(`broadcast-unaccepted-${i}`);
      items.push({
        id: `rebroadcast-${i}`,
        leading: dispatcherLeading(),
        title: [{ kind: 'name', text: DISPATCHER_NAME }, { kind: 'text', text: 'rebroadcasted the order' }],
        timestamp: bump(2),
        blocks: [{ kind: 'status', icon: 'Order-Status', lead: 'Order status changed from', from: 'pending', to: 'broadcasted' }],
        kind: 'event',
      });
      prev = 'broadcasted';
    }

    // The order is sitting back in Pending *right now* after an unaccepted
    // sequence — either awaiting rescue (exhausted) or already rescued by hand
    // (manual-after-exhausted).
    if (narrative.broadcastState === 'exhausted' || narrative.manualStage === 'after-exhausted') {
      pushUnaccepted('broadcast-unaccepted');
    }
  }

  const { steps, offPath } = planSteps(order.status, h, !!driver);
  if (steps.length === 0 && !offPath) return items;

  steps.forEach((to, i) => {
    const from = prev;
    prev = to;
    const at = bump(5 + ((h + i * 13) % 40));

    if (to === 'assigned') {
      // Which dispatch happened is the narrative's call, not `config.autoBroadcast`'s
      // (a client-level flag that said "automatic" even for hand-dispatched orders).
      if (narrative.method === 'broadcast') {
        items.push({
          id: 'status-assigned',
          leading: { kind: 'icon', icon: 'Proceed' },
          // Names the driver the order was dispatched TO at the time — the
          // broadcast's acceptor. Naming the *current* driver here made the trail
          // read "dispatched to Peter Kamau" and then "changed from Brian Otieno
          // to Peter Kamau", while Dispatch Logs correctly credited Brian.
          title: [
            { kind: 'text', text: 'Automatic order dispatch to' },
            { kind: 'actor', name: initialDriverName, tone: initialDriverTone },
          ],
          timestamp: at,
          blocks: [{ kind: 'status', icon: 'Order-Status', lead: 'Order status changed from', from, to }],
          kind: 'event',
        });
      } else {
        items.push({
          id: 'status-assigned',
          leading: { kind: 'icon', icon: 'Proceed' },
          title: [
            { kind: 'text', text: 'Order dispatched to' },
            { kind: 'actor', name: initialDriverName, tone: initialDriverTone },
            { kind: 'text', text: 'by' },
            dispatcherActor(),
          ],
          timestamp: at,
          blocks: [{ kind: 'status', icon: 'Order-Status', lead: 'Order status changed from', from, to }],
          kind: 'event',
        });
      }
      // A driver reassignment shortly after assignment. The previous driver comes
      // from the narrative, which guarantees it is NOT the current driver — this
      // used to pick blindly from a pool that contained the current driver,
      // producing "Driver changed from Peter Kamau to Peter Kamau".
      if (narrative.reassignment) {
        const { fromName, toName } = narrative.reassignment;
        items.push({
          id: 'change-driver',
          leading: dispatcherLeading(),
          title: [
            { kind: 'name', text: DISPATCHER_NAME },
            { kind: 'text', text: 'reassigned the order to' },
            { kind: 'actor', name: toName, tone: driverTone },
          ],
          timestamp: bump(3),
          blocks: [
            { kind: 'field', icon: 'Swap', lead: 'Driver changed from', from: fromName, to: toName },
            { kind: 'comment', text: `${fromName.split(' ')[0]} said he won't be able to pickup` },
          ],
          kind: 'event',
        });
      }
      return;
    }

    if (to === 'at-depot') {
      items.push({
        id: 'status-at-depot',
        leading: { kind: 'avatar', name: driverName, tone: driverTone },
        title: [{ kind: 'name', text: driverName }, { kind: 'text', text: 'is at the depot' }],
        timestamp: at,
        blocks: [{ kind: 'status', icon: 'Order-Status', lead: 'Order status changed from', from, to }],
        kind: 'event',
      });
      // Deterministic flavor: a driver comment while at the depot.
      if (h % 4 === 0) {
        items.push({
          id: 'driver-comment',
          leading: { kind: 'avatar', name: driverName, tone: driverTone },
          title: [{ kind: 'name', text: driverName }, { kind: 'text', text: 'left a comment' }],
          timestamp: bump(2),
          blocks: [{ kind: 'comment', text: MOCK_DRIVER_COMMENTS[h % MOCK_DRIVER_COMMENTS.length]! }],
          kind: 'comment',
        });
      }
      return;
    }

    if (to === 'in-transit') {
      if (config.pickupConfirmation) {
        items.push({
          id: 'pickup-complete',
          leading: { kind: 'avatar', name: driverName, tone: driverTone },
          title: [{ kind: 'name', text: driverName }, { kind: 'text', text: 'has picked up the order' }],
          timestamp: bump(2),
          blocks: [
            {
              kind: 'attachments',
              items: [
                { kind: 'text', icon: 'Lock', label: 'Pickup PIN provided' },
                { kind: 'link', thumbnailSrc: proofOfPickupFile.src, label: 'View Proof of Pickup', onClick: undefined },
              ],
            },
          ],
          kind: 'event',
        });
      }
      items.push({
        id: 'status-in-transit',
        leading: { kind: 'avatar', name: driverName, tone: driverTone },
        title: [{ kind: 'name', text: driverName }, { kind: 'text', text: 'is in transit' }],
        timestamp: at,
        blocks: [{ kind: 'status', icon: 'Order-Status', lead: 'Order status changed from', from, to }],
        kind: 'event',
      });
      // Deterministic flavor: a dispatcher comment while in transit.
      if (h % 5 === 3) {
        items.push({
          id: 'dispatcher-comment',
          leading: dispatcherLeading(),
          title: [{ kind: 'name', text: DISPATCHER_NAME }, { kind: 'text', text: 'left a comment' }],
          timestamp: bump(2),
          blocks: [{ kind: 'comment', text: MOCK_DISPATCHER_COMMENTS[h % MOCK_DISPATCHER_COMMENTS.length]!, edits: h % 2 === 0 ? 2 : undefined, editable: false }],
          kind: 'comment',
        });
      }
      return;
    }

    if (to === 'arrived') {
      items.push({
        id: 'status-arrived',
        leading: { kind: 'avatar', name: driverName, tone: driverTone },
        title: [{ kind: 'name', text: driverName }, { kind: 'text', text: 'arrived at drop-off' }],
        timestamp: at,
        blocks: [{ kind: 'status', icon: 'Order-Status', lead: 'Order status changed from', from, to }],
        kind: 'event',
      });
      return;
    }

    if (to === 'delivered') {
      const blocks: ActivityBodyBlock[] = [{ kind: 'status', icon: 'Order-Status', lead: 'Order status changed from', from, to }];
      if (config.proofOfDelivery) {
        blocks.push({
          kind: 'attachments',
          items: proofFiles.map((f) => ({ kind: 'link' as const, thumbnailSrc: f.src, label: `View ${f.label}` })),
        });
      }
      items.push({
        id: 'status-delivered',
        leading: { kind: 'avatar', name: driverName, tone: driverTone },
        title: [{ kind: 'name', text: driverName }, { kind: 'text', text: 'delivered the order' }],
        timestamp: at,
        blocks,
        kind: 'event',
      });
      return;
    }
  });

  if (offPath === 'cancelled') {
    items.push({
      id: 'cancelled',
      leading: dispatcherLeading(),
      title: [{ kind: 'name', text: DISPATCHER_NAME }, { kind: 'text', text: 'cancelled the order' }],
      timestamp: bump(5 + (h % 20)),
      blocks: [
        { kind: 'status', icon: 'Order-Status', lead: 'Order status changed from', from: prev, to: 'cancelled' },
        { kind: 'comment', text: cancellationReason || 'Customer requested.' },
      ],
      kind: 'event',
    });
  } else if (offPath === 'returning' || offPath === 'returned') {
    items.push({
      id: 'returning',
      leading: { kind: 'avatar', name: driverName, tone: driverTone },
      title: [{ kind: 'name', text: driverName }, { kind: 'text', text: 'failed the order' }],
      timestamp: bump(5 + (h % 20)),
      blocks: [
        { kind: 'status', icon: 'Order-Status', lead: 'Order status changed from', from: prev, to: 'returning' },
        { kind: 'comment', text: MOCK_RETURN_REASONS[h % MOCK_RETURN_REASONS.length]! },
      ],
      kind: 'event',
    });
    if (offPath === 'returned') {
      items.push({
        id: 'returned',
        leading: { kind: 'avatar', name: driverName, tone: driverTone },
        title: [{ kind: 'name', text: driverName }, { kind: 'text', text: 'returned the order' }],
        timestamp: bump(15 + (h % 30)),
        blocks: [{ kind: 'status', icon: 'Order-Status', lead: 'Order status changed from', from: 'returning', to: 'returned' }],
        kind: 'event',
      });
    }
  }

  return items;
}

/** "9 Jun 2027, 12:20 PM" per-entry timestamp — same format as the rest of the drawer. */
export function activityTimestamp(d: Date): string {
  return formatDateTime(d);
}

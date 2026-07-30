import type { AvatarTone } from '@leta/components';
import type { IconName } from '@leta/icons';
import type { ClientConfig, OrderStatus } from '../../store/types.js';
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

// The logged-in dispatcher persona — "Alvin Simuiki" is the interactive
// playground's user (TopBar / UserMenu), so every dispatcher action in the
// activity trail and overview tab attributes to them.
export const DISPATCHER_NAME = 'Alvin Simuiki';

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

const MOCK_PREVIOUS_DRIVERS = ['Adam Onyango', 'Samuel Mwangi', 'Peter Kamau', 'Brian Otieno'];

/** Statuses reachable after the implicit Pending resting state (no log entry for
 *  becoming Pending itself — same as Scheduled, both are "nothing happened yet"). */
const MAIN_SEQUENCE: OrderStatus[] = ['broadcasted', 'assigned', 'at-depot', 'in-transit', 'arrived', 'delivered'];

interface StepPlan {
  /** `broadcasted` → `delivered` steps actually reached, in order. */
  steps: OrderStatus[];
  /** Off-path terminal appended after the last reached main-sequence step. */
  offPath?: 'cancelled' | 'returning' | 'returned';
}

function planSteps(status: OrderStatus, h: number): StepPlan {
  if (status === 'scheduled' || status === 'pending') return { steps: [] };
  const idx = MAIN_SEQUENCE.indexOf(status);
  if (idx !== -1) return { steps: MAIN_SEQUENCE.slice(0, idx + 1) };
  if (status === 'cancelled') {
    // Deterministic point of cancellation — a plausible pre-terminal status.
    const cancelPoint = (['broadcasted', 'assigned', 'at-depot'] as const)[h % 3]!;
    const cIdx = MAIN_SEQUENCE.indexOf(cancelPoint);
    return { steps: MAIN_SEQUENCE.slice(0, cIdx + 1), offPath: 'cancelled' };
  }
  // returning / returned: always diverges from Arrived.
  const arrivedIdx = MAIN_SEQUENCE.indexOf('arrived');
  return { steps: MAIN_SEQUENCE.slice(0, arrivedIdx + 1), offPath: status === 'returned' ? 'returned' : 'returning' };
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

  const { steps, offPath } = planSteps(order.status, h);
  if (steps.length === 0 && !offPath) return items;

  const driverName = driver?.name ?? 'the driver';
  const driverTone: AvatarTone | undefined = driver?.tone;
  let prev: OrderStatus = 'pending';

  steps.forEach((to, i) => {
    const from = prev;
    prev = to;
    const at = bump(5 + ((h + i * 13) % 40));

    if (to === 'broadcasted') {
      items.push({
        id: 'status-broadcasted',
        leading: { kind: 'icon', icon: 'Update' },
        title: [{ kind: 'text', text: 'Automatic order status update' }],
        timestamp: at,
        blocks: [{ kind: 'status', icon: 'Order-Status', lead: 'Order status changed from', from, to }],
        kind: 'event',
      });
      return;
    }

    if (to === 'assigned') {
      if (config.autoBroadcast) {
        items.push({
          id: 'status-assigned',
          leading: { kind: 'icon', icon: 'Proceed' },
          title: [{ kind: 'text', text: 'Automatic order dispatch to' }, { kind: 'actor', name: driverName, tone: driverTone }],
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
            { kind: 'actor', name: driverName, tone: driverTone },
            { kind: 'text', text: 'by' },
            { kind: 'actor', name: DISPATCHER_NAME },
          ],
          timestamp: at,
          blocks: [{ kind: 'status', icon: 'Order-Status', lead: 'Order status changed from', from, to }],
          kind: 'event',
        });
      }
      // Deterministic flavor: a driver reassignment shortly after assignment.
      if (h % 4 === 2) {
        const prevDriver = MOCK_PREVIOUS_DRIVERS[h % MOCK_PREVIOUS_DRIVERS.length]!;
        items.push({
          id: 'change-driver',
          leading: { kind: 'avatar', name: DISPATCHER_NAME },
          title: [
            { kind: 'name', text: DISPATCHER_NAME },
            { kind: 'text', text: 'reassigned the order to' },
            { kind: 'actor', name: driverName, tone: driverTone },
          ],
          timestamp: bump(3),
          blocks: [
            { kind: 'field', icon: 'Swap', lead: 'Driver changed from', from: prevDriver, to: driverName },
            { kind: 'comment', text: `${prevDriver.split(' ')[0]} said he won't be able to pickup` },
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
          leading: { kind: 'avatar', name: DISPATCHER_NAME },
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
      leading: { kind: 'avatar', name: DISPATCHER_NAME },
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

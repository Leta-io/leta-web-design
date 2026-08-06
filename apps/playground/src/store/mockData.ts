import type { Client, DepotBroadcastConfig, Driver, Order } from './types.js';

/**
 * Mock seed data — Nairobi (matching MapView's default center [-1.286, 36.817]).
 * Orders use ISO datetime createdAt strings so the live duration timer works.
 */

/**
 * LETA unique order ID format: **alphanumeric clusters of 5–6 chars joined by
 * hyphens, 10–30 chars total** (the platform max for a unique ID). The table cell
 * truncates with an ellipsis once the ID exceeds the cell width.
 *
 * Generated deterministically from a seed (no Math.random — stable across reloads).
 */
const ID_CHARS = 'abcdefghjkmnpqrstuvwxyz0123456789';
function makeOrderId(seed: number): string {
  let n = ((seed + 1) * 2654435761) >>> 0;
  const next = () => { n = (n * 1103515245 + 12345) >>> 0; return n; };
  // Spread cluster count (2–5) deterministically across orders so lengths vary
  // ~11–29 chars (and the longer IDs exercise the cell's ellipsis truncation).
  const clusters = 2 + (seed % 4);
  const parts: string[] = [];
  for (let c = 0; c < clusters; c++) {
    const len = 5 + (next() % 2); // 5 or 6 chars
    let s = '';
    for (let i = 0; i < len; i++) s += ID_CHARS[next() % ID_CHARS.length];
    parts.push(s);
  }
  let id = parts.join('-');
  if (id.length > 30) id = id.slice(0, 30).replace(/-+$/, ''); // cap at 30, no trailing hyphen
  return id;
}

/**
 * The standard three-tier priority-group ladder an admin configures for a
 * managed-fleet depot (OM §9): P1 in-house drivers get the longest acceptance
 * window, then suppliers, then floaters. Reused across Acme's broadcasting depots.
 */
const STANDARD_BROADCAST: DepotBroadcastConfig = {
  rounds: 2,
  fallbackEnabled: true,
  preOfferEnabled: true,
  groups: [
    { priority: 1, name: 'In-house', acceptanceWindowSeconds: 40, maxOrders: 10, totalDrivers: 7, retries: 2 },
    { priority: 2, name: 'Suppliers', acceptanceWindowSeconds: 25, maxOrders: 10, totalDrivers: 9, retries: 1 },
    { priority: 3, name: 'Floaters', acceptanceWindowSeconds: 25, maxOrders: 10, totalDrivers: 5, retries: 1 },
  ],
};

/**
 * Per-client config profiles — hand-authored to demo how the platform manifests
 * differently per company (Add Order drawer, and future config-driven UI). Switch
 * via the breadcrumb client chip.
 *   • Acme Corp    — managed-fleet · multi-depot (4) + Products module + payment.
 *                    Two depots broadcast (full ladder + fallback + pre-offer), one
 *                    runs a single round with no fallback, one doesn't broadcast at all.
 *   • Naivas Group — managed-fleet · single depot with NO broadcast config (a SaaS
 *                    tenant that dispatches manually) + manual items + payment
 *   • Java House   — marketplace · single depot + items OFF + payment OFF (minimal);
 *                    exercises the flat, group-less Dispatch Logs shape
 */
export const MOCK_CLIENTS: Client[] = [
  {
    id: 'acme-corp',
    name: 'Acme Corp',
    fleetType: 'managed-fleet',
    config: {
      depots: [
        { id: 'dep-arc', name: 'Arc Kitisuru Depot', address: '13 Plums Lane Avenue, Nairobi, Kenya', broadcast: STANDARD_BROADCAST },
        { id: 'dep-wl', name: 'Westlands Fulfillment Hub', address: '23 Ring Rd, Westlands, Nairobi', broadcast: STANDARD_BROADCAST },
        // One round, no fallback, no pre-offer — the sequence ends "unaccepted" right
        // after P1→P2→P3 fail once (no Fallback Round entry in the logs timeline).
        {
          id: 'dep-cbd',
          name: 'CBD Pickup Point',
          address: 'Moi Ave, Nairobi CBD',
          broadcast: {
            rounds: 1,
            fallbackEnabled: false,
            preOfferEnabled: false,
            groups: [
              { priority: 1, name: 'In-house', acceptanceWindowSeconds: 40, maxOrders: 10, totalDrivers: 6, retries: 1 },
              { priority: 2, name: 'Suppliers', acceptanceWindowSeconds: 25, maxOrders: 8, totalDrivers: 4, retries: 1 },
            ],
          },
        },
        // No `broadcast` — a SaaS depot the admin never configured for broadcasting.
        { id: 'dep-kil', name: 'Kilimani Dispatch Hub', address: '5 Argwings Kodhek Rd, Kilimani' },
      ],
      items: { enabled: true, mode: 'product', valueRequired: true },
      products: {
        enabled: true,
        catalogue: [
          { id: 'p-water', name: 'Bottled Water (500ml)', price: 60 },
          { id: 'p-bread', name: 'Bread Loaf', price: 75 },
          { id: 'p-rice', name: 'Rice 2kg', price: 320 },
          { id: 'p-milk', name: 'Milk 1L', price: 70 },
          { id: 'p-sugar', name: 'Sugar 1kg', price: 180 },
        ],
      },
      payment: { enabled: true },
      // Doc 4's reference durations (5 + 10 + 5 + 15 + 5) → 40 min expected OFT.
      sla: { assignment: 5, arriveAtDepot: 10, pickup: 5, arriveAtDestination: 15, completeAtDestination: 5 },
      // Auto-broadcast ON (order wait time 2 min) + full proof requirements —
      // exercises the §7.2 row-2b Pending countdown, Pickup Code + POP + POD.
      autoBroadcast: true,
      orderWaitMinutes: 2,
      enRoutePickup: true,
      pickupConfirmation: true,
      pod: { signature: true, photo: true },
      returns: { driverInitiated: true, management: true, compensation: true },
      suspension: { enabled: true, minOrders: 5, withinDays: 30, autoReinstate: true },
    },
  },
  {
    id: 'naivas',
    name: 'Naivas Group',
    fleetType: 'managed-fleet',
    config: {
      depots: [
        { id: 'dep-parklands', name: 'Parklands Collection Center', address: '6 Parklands Ave, Parklands, Nairobi' },
      ],
      items: { enabled: true, mode: 'manual', valueRequired: true },
      // Manual items, so no catalogue to keep — product management off.
      products: { enabled: false, catalogue: [] },
      payment: { enabled: true },
      // A tighter promise than Acme's: 30 min expected OFT.
      sla: { assignment: 5, arriveAtDepot: 8, pickup: 4, arriveAtDestination: 10, completeAtDestination: 3 },
      // Manual dispatch (no auto-broadcast) — Pending shows "Dispatch Now"
      // (§7.2 row 3); no pickup confirmation → no Pickup Code / POP.
      autoBroadcast: false,
      orderWaitMinutes: 0,
      enRoutePickup: false,
      pickupConfirmation: false,
      // Photo only — the independent-POD case (Doc 2 §3).
      pod: { signature: false, photo: true },
      // Returns handled outside the platform: no re-dispatch of a returned order.
      returns: { driverInitiated: false, management: false, compensation: false },
      suspension: { enabled: false, minOrders: 5, withinDays: 30, autoReinstate: false },
    },
  },
  {
    id: 'java-house',
    name: 'Java House',
    // Marketplace: no driver groups, so the depot's broadcast config carries only the
    // sequence shape (no `groups`) — Dispatch Logs renders one flat responder log.
    fleetType: 'marketplace',
    config: {
      depots: [
        {
          id: 'dep-karen',
          name: 'Karen Distribution Hub',
          address: 'Karen Rd, Nairobi',
          broadcast: { rounds: 1, fallbackEnabled: false, preOfferEnabled: false, groups: [] },
        },
      ],
      items: { enabled: false, mode: 'manual', valueRequired: false },
      products: { enabled: false, catalogue: [] },
      payment: { enabled: false },
      sla: { assignment: 5, arriveAtDepot: 10, pickup: 5, arriveAtDestination: 20, completeAtDestination: 5 },
      // Auto-broadcast ON so the marketplace Dispatch Logs shape is actually reachable.
      autoBroadcast: true,
      orderWaitMinutes: 3,
      enRoutePickup: false,
      pickupConfirmation: true,
      pod: { signature: false, photo: false },
      returns: { driverInitiated: true, management: true, compensation: false },
      suspension: { enabled: true, minOrders: 3, withinDays: 14, autoReinstate: false },
    },
  },
];

export const DEFAULT_CLIENT = MOCK_CLIENTS[0]!;

export const MOCK_DRIVERS: Driver[] = [
  {
    id: 'DRV-01',
    name: 'Brian Otieno',
    tone: 'teal',
    vehicle: 'bike',
    phone: '+254 712 345 001',
    status: 'busy',
    location: { label: 'Westlands', lat: -1.2683, lng: 36.8108 },
    currentOrderId: null,
  },
  {
    id: 'DRV-02',
    name: 'Aisha Mohamed',
    tone: 'warning',
    vehicle: 'car',
    phone: '+254 712 345 002',
    status: 'available',
    location: { label: 'Kilimani', lat: -1.2906, lng: 36.788 },
    currentOrderId: null,
  },
  {
    id: 'DRV-03',
    name: 'Peter Kamau',
    tone: 'yankee-blue',
    vehicle: 'van',
    phone: '+254 712 345 003',
    status: 'available',
    location: { label: 'Upper Hill', lat: -1.295, lng: 36.812 },
    currentOrderId: null,
  },
  {
    id: 'DRV-04',
    name: 'Grace Wanjiru',
    tone: 'teal',
    vehicle: 'bike',
    phone: '+254 712 345 004',
    status: 'busy',
    location: { label: 'Parklands', lat: -1.262, lng: 36.82 },
    currentOrderId: null,
  },
  {
    id: 'DRV-05',
    name: 'Samuel Mwangi',
    tone: 'warning',
    vehicle: 'car',
    phone: '+254 712 345 005',
    status: 'available',
    location: { label: 'Ngong Road', lat: -1.3, lng: 36.77 },
    currentOrderId: null,
  },
  {
    id: 'DRV-06',
    name: 'Fatuma Hassan',
    tone: 'yankee-blue',
    vehicle: 'bike',
    phone: '+254 712 345 006',
    status: 'offline',
    location: { label: 'Eastleigh', lat: -1.273, lng: 36.847 },
    currentOrderId: null,
  },
];

const RAW_ORDERS: Omit<Order, 'id'>[] = [
  // ── Unassigned: Scheduled (8) ──────────────────────────────────────────────
  {
    customer: 'John Kamau',
    phone: '+254 712 001 009',
    depot: 'Arc Kitisuru Depot',
    pickup: { label: '14 Kitisuru Rd, Kitisuru, Nairobi', lat: -1.242, lng: 36.777 },
    dropoff: { label: '38 Cedar Lane, Kilimani, Nairobi', lat: -1.2906, lng: 36.788 },
    package: 'Electronics delivery',
    items: 2,
    status: 'scheduled',
    driverId: null,
    createdAt: '2026-06-29T05:30:00',
    priority: 'standard',
  },
  {
    customer: 'Amina Yusuf',
    phone: '+254 722 001 010',
    depot: 'Westlands Fulfillment Hub',
    pickup: { label: '23 Ring Rd, Westlands, Nairobi', lat: -1.2683, lng: 36.808 },
    dropoff: { label: '7 UN Crescent, Gigiri, Nairobi', lat: -1.233, lng: 36.812 },
    package: 'Catering supplies',
    items: 4,
    status: 'scheduled',
    driverId: null,
    createdAt: '2026-06-29T06:00:00',
    priority: 'express',
  },
  {
    customer: 'David Njoroge',
    phone: '+254 733 001 011',
    depot: 'Kilimani Dispatch Hub',
    pickup: { label: '5 Argwings Kodhek Rd, Kilimani', lat: -1.2906, lng: 36.788 },
    dropoff: { label: 'ABC Place, Waiyaki Way, Westlands', lat: -1.265, lng: 36.79 },
    package: 'Medical supplies',
    items: 1,
    status: 'scheduled',
    driverId: null,
    createdAt: '2026-06-29T06:15:00',
    priority: 'express',
  },
  {
    customer: 'Wanjiru Mwangi',
    phone: '+254 700 001 012',
    depot: 'Upper Hill Distribution Centre',
    pickup: { label: '3 Upper Hill Rd, Upper Hill', lat: -1.295, lng: 36.812 },
    dropoff: { label: 'Brookside Drive, Westlands', lat: -1.255, lng: 36.795 },
    package: 'Office stationery',
    items: 6,
    status: 'scheduled',
    driverId: null,
    createdAt: '2026-06-29T06:45:00',
    priority: 'standard',
  },
  {
    customer: 'Otieno Achieng',
    phone: '+254 714 001 013',
    depot: 'Karen Distribution Hub',
    pickup: { label: '11 Langata Rd, Karen, Nairobi', lat: -1.335, lng: 36.72 },
    dropoff: { label: 'Ngong Road Mall, Nairobi', lat: -1.3, lng: 36.77 },
    package: 'Household goods',
    items: 3,
    status: 'scheduled',
    driverId: null,
    createdAt: '2026-06-29T07:00:00',
    priority: 'standard',
  },
  {
    customer: 'Zawadi Kariuki',
    phone: '+254 725 001 014',
    depot: 'Parklands Collection Center',
    pickup: { label: '6 Parklands Ave, Parklands', lat: -1.262, lng: 36.82 },
    dropoff: { label: 'Spring Valley, Nairobi', lat: -1.252, lng: 36.79 },
    package: 'Pharmaceuticals',
    items: 2,
    status: 'scheduled',
    driverId: null,
    createdAt: '2026-06-29T07:15:00',
    priority: 'express',
  },
  {
    customer: 'Hassan Abdi',
    phone: '+254 734 001 015',
    depot: 'Lavington Depot',
    pickup: { label: '18 James Gichuru Rd, Lavington', lat: -1.279, lng: 36.766 },
    dropoff: { label: 'Highridge, Nairobi', lat: -1.258, lng: 36.778 },
    package: 'Grocery delivery',
    items: 8,
    status: 'scheduled',
    driverId: null,
    createdAt: '2026-06-29T07:30:00',
    priority: 'standard',
  },
  {
    customer: 'Njambi Gathoni',
    phone: '+254 701 001 016',
    depot: 'South B Fulfillment Center',
    pickup: { label: '22 Mombasa Rd, South B', lat: -1.312, lng: 36.839 },
    dropoff: { label: 'Imara Daima Estate, Nairobi', lat: -1.325, lng: 36.85 },
    package: 'Bakery order',
    items: 2,
    status: 'scheduled',
    driverId: null,
    createdAt: '2026-06-29T07:45:00',
    priority: 'standard',
  },

  // ── Unassigned: Pending (2) ────────────────────────────────────────────────
  {
    customer: 'Naivas Supermarket',
    phone: '+254 720 100 001',
    depot: 'CBD Pickup Point',
    pickup: { label: 'Moi Ave, Nairobi CBD', lat: -1.2864, lng: 36.8172 },
    dropoff: { label: 'Lavington Mall, James Gichuru Rd', lat: -1.279, lng: 36.766 },
    package: 'Grocery delivery',
    items: 3,
    status: 'pending',
    // Fixture: the hold window is still open — nothing broadcast yet (On Hold).
    broadcastState: 'on-hold',
    driverId: null,
    createdAt: '2026-06-29T08:12:00',
    priority: 'standard',
  },
  {
    customer: 'Artcaffe Westlands',
    phone: '+254 720 100 005',
    depot: 'Westlands Fulfillment Hub',
    pickup: { label: '23 Ring Rd, Westlands, Nairobi', lat: -1.2675, lng: 36.808 },
    dropoff: { label: 'ABC Place, Waiyaki Way', lat: -1.265, lng: 36.78 },
    package: 'Bakery order',
    items: 4,
    status: 'pending',
    // Fixture: broadcast sequence ran and nobody accepted (Exhausted).
    broadcastState: 'exhausted',
    driverId: null,
    createdAt: '2026-06-29T09:15:00',
    priority: 'standard',
  },

  // ── Dispatched (4) ────────────────────────────────────────────────────────
  {
    customer: 'Java House Gigiri',
    phone: '+254 720 100 002',
    depot: 'CBD Pickup Point',
    pickup: { label: 'Moi Ave, Nairobi CBD', lat: -1.2864, lng: 36.8172 },
    dropoff: { label: 'UN Complex, Gigiri', lat: -1.2351, lng: 36.8065 },
    package: 'Catering order',
    items: 1,
    status: 'broadcasted',
    // Fixture: a priority-group leg is live right now (Broadcasting).
    broadcastState: 'broadcasting',
    driverId: null,
    batchId: 'BC-4821',
    createdAt: '2026-06-29T08:30:00',
    priority: 'express',
  },
  {
    customer: 'Healthy U Sarit',
    phone: '+254 720 100 006',
    depot: 'Parklands Collection Center',
    pickup: { label: '6 Parklands Ave, Parklands', lat: -1.2615, lng: 36.804 },
    dropoff: { label: 'Parklands Plaza, Nairobi', lat: -1.262, lng: 36.82 },
    package: 'Supplements',
    items: 2,
    // Fallback means no one has accepted yet — pairing it with 'assigned' (a
    // driver already has the order) was a logical contradiction, reported and
    // fixed 2026-08-04: an order can't be both assigned to a driver and still
    // actively broadcasting for one. Broadcasted + no driver is the only
    // status consistent with "the fallback sweep is live."
    status: 'broadcasted',
    // Fixture: all groups passed; the fallback sweep is live (Fallback).
    broadcastState: 'fallback',
    driverId: null,
    batchId: 'BC-5190',
    createdAt: '2026-06-29T09:20:00',
    priority: 'standard',
  },
  {
    customer: 'Goodlife Pharmacy',
    phone: '+254 720 100 003',
    depot: 'Westlands Fulfillment Hub',
    pickup: { label: '23 Ring Rd, Westlands, Nairobi', lat: -1.2566, lng: 36.8033 },
    dropoff: { label: 'Spring Valley, Nairobi', lat: -1.252, lng: 36.79 },
    package: 'Prescription medicines',
    items: 2,
    status: 'in-transit',
    // Fixture: a driver accepted mid-sequence (Completed).
    broadcastState: 'completed',
    driverId: 'DRV-01',
    createdAt: '2026-06-29T07:45:00',
    priority: 'express',
  },
  {
    customer: 'Chandarana Foods',
    phone: '+254 726 001 017',
    depot: 'Kilimani Dispatch Hub',
    pickup: { label: '5 Argwings Kodhek Rd, Kilimani', lat: -1.293, lng: 36.785 },
    dropoff: { label: 'Yaya Centre, Kilimani', lat: -1.293, lng: 36.785 },
    package: 'Grocery delivery',
    items: 5,
    status: 'at-depot',
    // Fixture: dispatched by hand after the sequence failed (Manual after exhausted).
    broadcastState: 'manual-after-exhausted',
    driverId: 'DRV-02',
    createdAt: '2026-06-29T08:50:00',
    priority: 'standard',
  },

  // ── Finished (6) — 2 delivered + 4 cancelled (mixed driver/trip) ───────────
  {
    customer: 'Carrefour Two Rivers',
    phone: '+254 720 100 004',
    depot: 'Ruaka Distribution Hub',
    pickup: { label: 'Two Rivers Mall, Ruaka', lat: -1.2156, lng: 36.8 },
    dropoff: { label: 'Runda Estate, Nairobi', lat: -1.218, lng: 36.815 },
    package: 'Electronics',
    items: 1,
    status: 'delivered',
    // Fixture: dispatched by hand before any broadcast started (Manual before broadcast).
    broadcastState: 'manual-before-broadcast',
    driverId: 'DRV-05',
    createdAt: '2026-06-29T06:30:00',
    priority: 'standard',
  },
  {
    customer: 'Text Book Centre',
    phone: '+254 720 100 007',
    depot: 'Parklands Collection Center',
    pickup: { label: '6 Parklands Ave, Parklands', lat: -1.2618, lng: 36.8035 },
    dropoff: { label: 'Brookside Drive, Westlands', lat: -1.255, lng: 36.795 },
    package: 'Stationery',
    items: 6,
    status: 'delivered',
    driverId: 'DRV-05',
    createdAt: '2026-06-29T05:00:00',
    priority: 'standard',
  },
  // Cancelled orders vary by *when* they were cancelled (§ Cancelled table
  // `1213:98975`): cancelled-before-assignment carries no driver/trip (both
  // cells render "--"); cancelled-after-assignment keeps the driver it had and
  // its trip. The mix below gives the Cancelled view both shapes out of the box.
  {
    customer: 'Chandarana Yaya',
    phone: '+254 720 100 008',
    depot: 'Kilimani Dispatch Hub',
    pickup: { label: '5 Argwings Kodhek Rd, Kilimani', lat: -1.293, lng: 36.785 },
    dropoff: { label: 'Kilimani Apartments, Nairobi', lat: -1.2906, lng: 36.788 },
    package: 'Grocery delivery',
    items: 5,
    status: 'cancelled',
    driverId: null, // cancelled before assignment → Driver + Trip show "--"
    createdAt: '2026-06-29T07:10:00',
    priority: 'standard',
  },
  {
    customer: 'Naivas Kilimani',
    phone: '+254 720 100 009',
    depot: 'Kilimani Dispatch Hub',
    pickup: { label: '5 Argwings Kodhek Rd, Kilimani', lat: -1.293, lng: 36.785 },
    dropoff: { label: 'Adams Arcade, Ngong Rd', lat: -1.301, lng: 36.78 },
    package: 'Household goods',
    items: 3,
    status: 'cancelled',
    driverId: 'DRV-02', // cancelled after assignment → keeps driver + trip
    createdAt: '2026-06-29T06:45:00',
    priority: 'express',
  },
  {
    customer: 'Quickmart Lavington',
    phone: '+254 720 100 010',
    depot: 'Westlands Fulfillment Hub',
    pickup: { label: '23 Ring Rd, Westlands, Nairobi', lat: -1.2566, lng: 36.8033 },
    dropoff: { label: 'Lavington Mall, Nairobi', lat: -1.279, lng: 36.767 },
    package: 'Beverages',
    items: 4,
    status: 'cancelled',
    driverId: null, // cancelled before assignment → "--"
    createdAt: '2026-06-29T04:30:00',
    priority: 'standard',
  },
  {
    customer: 'Artcaffe Westgate',
    phone: '+254 720 100 011',
    depot: 'Westlands Fulfillment Hub',
    pickup: { label: '23 Ring Rd, Westlands, Nairobi', lat: -1.2566, lng: 36.8033 },
    dropoff: { label: 'Westgate Mall, Westlands', lat: -1.257, lng: 36.803 },
    package: 'Catering order',
    items: 8,
    status: 'cancelled',
    driverId: 'DRV-03', // cancelled after assignment → keeps driver + trip
    createdAt: '2026-06-29T03:50:00',
    priority: 'standard',
  },

  // ── Dispatched: Arrived / Returning ────────────────────────────────────────
  {
    customer: 'Faith Wairimu',
    phone: '+254 715 001 018',
    depot: 'Westlands Fulfillment Hub',
    pickup: { label: '23 Ring Rd, Westlands, Nairobi', lat: -1.2683, lng: 36.808 },
    dropoff: { label: 'Sarit Centre, Westlands', lat: -1.2618, lng: 36.8035 },
    package: 'Electronics delivery',
    items: 1,
    status: 'arrived',
    driverId: 'DRV-03',
    createdAt: '2026-06-29T08:05:00',
    priority: 'express',
  },
  {
    customer: 'Kevin Omondi',
    phone: '+254 716 001 019',
    depot: 'CBD Pickup Point',
    pickup: { label: 'Moi Ave, Nairobi CBD', lat: -1.2864, lng: 36.8172 },
    dropoff: { label: 'Yaya Centre, Kilimani', lat: -1.293, lng: 36.785 },
    package: 'Returned parcel',
    items: 2,
    status: 'returning',
    driverId: 'DRV-05',
    createdAt: '2026-06-29T08:40:00',
    priority: 'standard',
  },

  // ── Unassigned: Returned (2) — goods came back, awaiting re-dispatch (no driver) ──
  {
    customer: 'Mercy Atieno',
    phone: '+254 717 001 020',
    depot: 'Parklands Collection Center',
    pickup: { label: '6 Parklands Ave, Parklands', lat: -1.262, lng: 36.82 },
    dropoff: { label: 'Highridge, Nairobi', lat: -1.258, lng: 36.778 },
    package: 'Apparel',
    items: 3,
    status: 'returned',
    driverId: null,
    createdAt: '2026-06-29T06:20:00',
    priority: 'standard',
  },
  {
    customer: 'Brian Mutua',
    phone: '+254 718 001 021',
    depot: 'South B Fulfillment Center',
    pickup: { label: '22 Mombasa Rd, South B', lat: -1.312, lng: 36.839 },
    dropoff: { label: 'Imara Daima Estate, Nairobi', lat: -1.325, lng: 36.85 },
    package: 'Damaged item',
    items: 1,
    status: 'returned',
    driverId: null,
    createdAt: '2026-06-29T05:50:00',
    priority: 'standard',
  },
];

// ── Bulk generation ─────────────────────────────────────────────────────────
// Every status is populated with a production-scale volume (20–100 rows) so the
// prototype's tables, pagination, filtering, bulk selection, and Dispatch Logs
// feel real. Purely seeded (no Math.random) so IDs/data stay stable across
// reloads. The hand-authored RAW_ORDERS above stay first (they carry the
// explicit broadcast-state fixtures the review screens depend on); these are
// appended on top.

const GEN_CUSTOMERS = [
  'Naivas Junction', 'Carrefour Sarit', 'QuickMart Ngong', 'Chandarana Kileleshwa', 'Artcaffe Garden City',
  'Java House Karen', 'Healthy U Village', 'Goodlife Kasarani', 'Text Book Centre CBD', 'Tuskys Embakasi',
  'Wanjiku Njeri', 'Daniel Kiptoo', 'Aisha Abdallah', 'Collins Otieno', 'Naomi Chebet', 'Ibrahim Farah',
  'Lydia Muthoni', 'George Wafula', 'Cynthia Adhiambo', 'Martin Kariuki', 'Esther Nyambura', 'Victor Omollo',
  'Halima Yusuf', 'Dennis Mwenda', 'Rose Wangari', 'Patrick Ochieng', 'Zainab Ali', 'Kelvin Mutiso',
  'Sarah Wambui', 'Joseph Barasa', 'Mercy Njoki', 'Anthony Gitau', 'Faith Chepkoech', 'Brian Kiplangat',
  'Sylvia Achieng', 'Douglas Maina', 'Rehema Said', 'Peter Njuguna', 'Grace Auma', 'Simon Kimani',
];

// Depot → drop-off pairs (Acme config depot names so `depotForOrder` resolves;
// the broadcasting depots come first so broadcast-derived states have config).
const GEN_ROUTES: { depot: string; pickup: Order['pickup']; dropoff: Order['dropoff'] }[] = [
  { depot: 'CBD Pickup Point', pickup: { label: 'Moi Ave, Nairobi CBD', lat: -1.2864, lng: 36.8172 }, dropoff: { label: 'Kilimani, Nairobi', lat: -1.29, lng: 36.785 } },
  { depot: 'Westlands Fulfillment Hub', pickup: { label: '23 Ring Rd, Westlands', lat: -1.2675, lng: 36.808 }, dropoff: { label: 'Lavington, Nairobi', lat: -1.279, lng: 36.766 } },
  { depot: 'Arc Kitisuru Depot', pickup: { label: '13 Plums Lane Ave, Kitisuru', lat: -1.229, lng: 36.79 }, dropoff: { label: 'Runda Estate, Nairobi', lat: -1.218, lng: 36.815 } },
  { depot: 'CBD Pickup Point', pickup: { label: 'Moi Ave, Nairobi CBD', lat: -1.2864, lng: 36.8172 }, dropoff: { label: 'Karen, Nairobi', lat: -1.32, lng: 36.71 } },
  { depot: 'Westlands Fulfillment Hub', pickup: { label: '23 Ring Rd, Westlands', lat: -1.2675, lng: 36.808 }, dropoff: { label: 'Parklands Plaza, Nairobi', lat: -1.262, lng: 36.82 } },
  { depot: 'Kilimani Dispatch Hub', pickup: { label: '5 Argwings Kodhek Rd, Kilimani', lat: -1.293, lng: 36.785 }, dropoff: { label: 'Yaya Centre, Kilimani', lat: -1.293, lng: 36.786 } },
  { depot: 'Arc Kitisuru Depot', pickup: { label: '13 Plums Lane Ave, Kitisuru', lat: -1.229, lng: 36.79 }, dropoff: { label: 'Gigiri, Nairobi', lat: -1.2351, lng: 36.8065 } },
  { depot: 'CBD Pickup Point', pickup: { label: 'Moi Ave, Nairobi CBD', lat: -1.2864, lng: 36.8172 }, dropoff: { label: 'Donholm, Nairobi', lat: -1.29, lng: 36.88 } },
  { depot: 'Westlands Fulfillment Hub', pickup: { label: '23 Ring Rd, Westlands', lat: -1.2675, lng: 36.808 }, dropoff: { label: 'Spring Valley, Nairobi', lat: -1.252, lng: 36.79 } },
  { depot: 'Kilimani Dispatch Hub', pickup: { label: '5 Argwings Kodhek Rd, Kilimani', lat: -1.293, lng: 36.785 }, dropoff: { label: 'Langata, Nairobi', lat: -1.325, lng: 36.74 } },
];

const GEN_PACKAGES = ['Grocery delivery', 'Bakery order', 'Prescription medicines', 'Catering order', 'Electronics', 'Supplements', 'Stationery', 'Cosmetics', 'Fresh produce', 'Home supplies'];
const GEN_DRIVER_IDS = MOCK_DRIVERS.map((d) => d.id);
const STANDARD_PHONE_PREFIX = '+254 7';

/** Statuses where a driver is on the order (so a driverId + trip is assigned). */
const GEN_DRIVER_STATUSES = new Set<Order['status']>(['assigned', 'at-depot', 'in-transit', 'arrived', 'returning', 'delivered']);
/** Depots configured to broadcast — used for auto-broadcast-origin statuses. */
const GEN_BROADCAST_DEPOTS = GEN_ROUTES.filter((r) => r.depot !== 'Kilimani Dispatch Hub');

/**
 * Generates `count` deterministic orders for one status. `seed0` offsets the
 * PRNG so each status block draws a distinct-but-stable slice of the pools.
 */
function genOrders(status: Order['status'], count: number, seed0: number): Omit<Order, 'id'>[] {
  const out: Omit<Order, 'id'>[] = [];
  const hasDriver = GEN_DRIVER_STATUSES.has(status);
  // Auto-broadcast-origin states must sit on a broadcasting depot for their
  // Dispatch Logs to build a real sequence.
  const wantsBroadcastDepot = status === 'broadcasted' || status === 'pending';
  for (let k = 0; k < count; k++) {
    const s = seed0 + k;
    const route = wantsBroadcastDepot ? GEN_BROADCAST_DEPOTS[s % GEN_BROADCAST_DEPOTS.length]! : GEN_ROUTES[s % GEN_ROUTES.length]!;
    const customer = GEN_CUSTOMERS[s % GEN_CUSTOMERS.length]!;
    const hh = String(6 + (s % 14)).padStart(2, '0');
    const mm = String((s * 7) % 60).padStart(2, '0');
    const phone = `${STANDARD_PHONE_PREFIX}${String(10 + (s % 89))} ${String(100 + (s % 900))} ${String(100 + ((s * 3) % 900))}`;
    const cancelledWithDriver = status === 'cancelled' && s % 2 === 0;
    // Roughly a third of Pending orders are back in the queue after a broadcast
    // sequence went unaccepted. The batch id is the marker that a broadcast
    // actually ran, so `dispatchNarrative` resolves these to the `exhausted`
    // Dispatch Logs shape — which is what makes "Broadcast unaccepted" + the
    // Re-broadcast action reachable while browsing older Pending orders, instead
    // of only on the single hand-authored fixture.
    const exhaustedPending = status === 'pending' && s % 3 === 0;
    out.push({
      customer,
      phone,
      depot: route.depot,
      pickup: route.pickup,
      dropoff: route.dropoff,
      package: GEN_PACKAGES[s % GEN_PACKAGES.length]!,
      items: 1 + (s % 8),
      status,
      driverId: hasDriver || cancelledWithDriver ? GEN_DRIVER_IDS[s % GEN_DRIVER_IDS.length]! : null,
      ...(status === 'broadcasted' || exhaustedPending ? { batchId: `BC-${4000 + (s % 900)}` } : null),
      createdAt: `2026-06-29T${hh}:${mm}:00`,
      priority: s % 3 === 0 ? 'express' : 'standard',
    });
  }
  return out;
}

// Per-status generated volume (each lands within the 20–100 band once the few
// hand-authored fixtures above are added in).
const GENERATED_ORDERS: Omit<Order, 'id'>[] = [
  ...genOrders('scheduled', 45, 1000),
  ...genOrders('pending', 38, 2000),
  ...genOrders('broadcasted', 30, 3000),
  ...genOrders('returned', 26, 4000),
  ...genOrders('assigned', 40, 5000),
  ...genOrders('at-depot', 28, 6000),
  ...genOrders('in-transit', 46, 7000),
  ...genOrders('returning', 24, 8000),
  ...genOrders('arrived', 28, 9000),
  ...genOrders('delivered', 60, 10000),
  ...genOrders('cancelled', 45, 11000),
];

const ALL_RAW_ORDERS: Omit<Order, 'id'>[] = [...RAW_ORDERS, ...GENERATED_ORDERS];

/**
 * Orders with deterministic, varied-length LETA unique IDs (see {@link makeOrderId}).
 * A trip exists once a driver was assigned — so every seeded order WITH a driver
 * gets a deterministic short trip ID (TRP-1xx). Orders that never reached
 * assignment (unassigned statuses, and the cancelled-before-assignment case —
 * `driverId: null`) carry no trip; their Trip cell renders "--" per the
 * Cancelled-table wireframe (`1213:98975`).
 */
/**
 * Seeded orders deliberately carry **no** `broadcastStartedAt`. A live sequence's
 * origin depends on the *depot's* configured ladder (a 65s two-group depot vs a
 * 320s full-ladder one), and which depot an order resolves to depends on the
 * active client — neither is known here. Stamping a fixed offset at this layer
 * back-dated short-ladder orders past their own end, so they exhausted the
 * instant you opened them. The drawer derives the origin from the resolved
 * config instead (`seededOffsetSeconds`), which also keeps it reset-on-reload.
 */
export const MOCK_ORDERS: Order[] = ALL_RAW_ORDERS.map((o, i) => ({
  id: makeOrderId(i),
  ...(o.driverId ? { tripId: `TRP-${101 + (i % 8)}` } : null),
  ...o,
}));

/** Statuses where the assigned driver is actively fulfilling the order (→ busy). */
const ACTIVE_DRIVER_STATUSES: Order['status'][] = ['assigned', 'at-depot', 'in-transit', 'arrived', 'returning'];

// Wire each busy driver to the active order it's fulfilling (keeps driver ↔ order
// references consistent now that order IDs are generated).
for (const order of MOCK_ORDERS) {
  if (order.driverId && ACTIVE_DRIVER_STATUSES.includes(order.status)) {
    const driver = MOCK_DRIVERS.find((d) => d.id === order.driverId);
    if (driver) { driver.currentOrderId = order.id; driver.status = 'busy'; }
  }
}

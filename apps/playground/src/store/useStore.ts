import { create } from 'zustand';
import type { Client, ClientConfig, Driver, Order, OrderEdit, OrderStatus, ToastItem } from './types.js';
import { DEFAULT_CLIENT, MOCK_CLIENTS, MOCK_DRIVERS, MOCK_ORDERS } from './mockData.js';

/**
 * Session store — holds orders, drivers, and transient toasts so changes (a new
 * order, a status update, a dispatch) persist across screens for the session.
 * No backend; resets on full page reload. Refined per PRD in Phase 1.
 */

export interface NewOrderInput {
  customer: string;
  phone: string;
  /** Pickup depot name (route-origin header). */
  depot?: string;
  pickup: Order['pickup'];
  dropoff: Order['dropoff'];
  package: string;
  items: number;
  priority: Order['priority'];
  /** Optional initial status (e.g. `scheduled`). Defaults to `pending`. */
  status?: OrderStatus;
  /** Optional driver assigned at creation. */
  driverId?: string | null;
  createdAt?: string;
}

interface StoreState {
  /** The active client tenant (the SaaS instance being viewed). */
  client: Client;
  /** All client tenants available to the Top Bar client switcher. */
  clients: Client[];
  orders: Order[];
  drivers: Driver[];
  toasts: ToastItem[];
  /** Monotonic counters for collision-free IDs (no Math.random in seeded data). */
  _orderSeq: number;
  _toastSeq: number;

  // --- selectors (convenience) ---
  getOrder: (id: string) => Order | undefined;
  getDriver: (id: string | null | undefined) => Driver | undefined;

  /** Switch the active client tenant (future Top Bar client switcher). */
  setClient: (id: string) => void;
  /**
   * Patch the active client's configuration (the Admin module, Doc 2). Writes
   * through to the entry in `clients` as well, so a setting survives switching
   * accounts and back — and so every config-driven surface (Add Order drawer,
   * Order Detail, dispatch behaviour) picks the change up immediately.
   *
   * Pass an **updater** whenever the patch derives from the current config
   * (e.g. flipping one key of a nested object). A plain object built from a
   * render-time snapshot would clobber any sibling change made in the same
   * tick, since that snapshot is one render behind.
   */
  updateClientConfig: (
    patch: Partial<ClientConfig> | ((config: ClientConfig) => Partial<ClientConfig>),
  ) => void;

  // --- mutations ---
  addOrder: (input: NewOrderInput) => Order;
  /** Patch an order's editable fields in place (Edit Order, OM §8) — status unchanged. */
  updateOrder: (id: string, patch: Partial<Order>) => void;
  updateOrderStatus: (id: string, status: OrderStatus) => void;
  assignOrder: (orderId: string, driverId: string) => void;
  /** Cancel an order, capturing the Cancel Order modal's reason codes + note (OM §11.1). */
  cancelOrder: (id: string, reasons?: string[], note?: string) => void;
  /**
   * Dispatcher-initiated return (as opposed to a driver failing delivery):
   * captures the typed reason, then moves the order into the same `returning`
   * bucket a driver-failed return uses. The Activity trail reads `returnInfo`
   * to render the dispatcher-attributed shape instead of the driver one.
   */
  returnOrder: (id: string, reason: string) => void;
  /** Append a real (non-mocked) edit-history entry — skipped when `changes` is empty. */
  recordOrderEdit: (id: string, changes: OrderEdit['changes']) => void;
  /**
   * Dispatcher re-broadcast after an exhausted sequence (OM §7.5): the order goes
   * back to Broadcasted and a fresh sequence starts running live.
   */
  rebroadcastOrder: (id: string) => void;
  /** The live sequence ended unaccepted → order returns to Pending (OM §7.5). */
  exhaustBroadcast: (id: string) => void;

  // --- toasts ---
  pushToast: (toast: Omit<ToastItem, 'id'>) => void;
  dismissToast: (id: string) => void;
}

export const useStore = create<StoreState>((set, get) => ({
  client: DEFAULT_CLIENT,
  clients: MOCK_CLIENTS,
  orders: MOCK_ORDERS,
  drivers: MOCK_DRIVERS,
  toasts: [],
  _orderSeq: 1000 + MOCK_ORDERS.length,
  _toastSeq: 0,

  getOrder: (id) => get().orders.find((o) => o.id === id),
  getDriver: (id) => (id ? get().drivers.find((d) => d.id === id) : undefined),

  setClient: (id) => {
    const next = get().clients.find((c) => c.id === id);
    if (next) set({ client: next });
  },

  updateClientConfig: (patch) => {
    set((s) => {
      const resolved = typeof patch === 'function' ? patch(s.client.config) : patch;
      const next: Client = { ...s.client, config: { ...s.client.config, ...resolved } };
      return {
        client: next,
        clients: s.clients.map((c) => (c.id === next.id ? next : c)),
      };
    });
  },

  addOrder: (input) => {
    const seq = get()._orderSeq + 1;
    const order: Order = {
      id: `ORD-${seq}`,
      customer: input.customer,
      phone: input.phone,
      depot: input.depot,
      pickup: input.pickup,
      dropoff: input.dropoff,
      package: input.package,
      items: input.items,
      status: input.status ?? 'pending',
      driverId: input.driverId ?? null,
      createdAt: input.createdAt ?? 'Just now',
      priority: input.priority,
    };
    set((s) => ({ orders: [order, ...s.orders], _orderSeq: seq }));
    // If created already assigned, mark the driver busy.
    if (order.driverId) get().assignOrder(order.id, order.driverId);
    return order;
  },

  updateOrder: (id, patch) => {
    set((s) => ({
      orders: s.orders.map((o) => (o.id === id ? { ...o, ...patch } : o)),
    }));
  },

  updateOrderStatus: (id, status) => {
    const prev = get().getOrder(id);
    // Moving a DISPATCHED order (one that has a driver) back to Pending loses
    // that driver — Pending means back in the unassigned queue, not "still
    // assigned to whoever had it." Captured as a real `pendingResets` entry so
    // the Activity trail can show it (`activityModel.ts`'s `finalize`), and
    // `driverId` is cleared — unlike the terminal transitions below, which
    // deliberately KEEP it as a historical record of who fulfilled the order.
    const losingDriver = status === 'pending' && !!prev?.driverId;
    // Captured before the order's own `driverId` is cleared below, so the
    // Activity trail's preserved "Order dispatched to {driver}" entry has a
    // name to show instead of falling back to the generic "the driver".
    const lostDriver = losingDriver ? get().drivers.find((d) => d.id === prev!.driverId) : null;
    set((s) => ({
      orders: s.orders.map((o) => {
        if (o.id !== id) return o;
        if (!losingDriver) return { ...o, status };
        return {
          ...o,
          status,
          driverId: null,
          pendingResets: [
            ...(o.pendingResets ?? []),
            { at: new Date().toISOString(), from: o.status, driverName: lostDriver?.name ?? 'the driver', driverTone: lostDriver?.tone },
          ],
        };
      }),
    }));
    // Terminal states free the assigned driver too, but keep `driverId` on
    // the order itself (see the doc comment on `pendingResets`).
    const driverToFree =
      losingDriver ||
      status === 'delivered' ||
      status === 'cancelled' ||
      status === 'returned'
        ? prev?.driverId
        : null;
    if (driverToFree) {
      set((s) => ({
        drivers: s.drivers.map((d) =>
          d.id === driverToFree
            ? { ...d, status: 'available', currentOrderId: null }
            : d,
        ),
      }));
    }
  },

  assignOrder: (orderId, driverId) => {
    set((s) => ({
      orders: s.orders.map((o) =>
        o.id === orderId
          ? { ...o, driverId, status: o.status === 'cancelled' ? o.status : 'assigned' }
          : o,
      ),
      drivers: s.drivers.map((d) =>
        d.id === driverId ? { ...d, status: 'busy', currentOrderId: orderId } : d,
      ),
    }));
  },

  exhaustBroadcast: (id) => {
    // The sequence ran to its end unaccepted → back into the queue as Pending.
    // The batch id stays (a broadcast really did run, which is what makes the
    // Dispatch Logs tab resolve to `exhausted`), and the live clock is cleared so
    // nothing keeps ticking.
    set((s) => ({
      orders: s.orders.map((o) =>
        o.id === id && o.status === 'broadcasted'
          ? { ...o, status: 'pending', broadcastStartedAt: undefined, broadcastState: undefined }
          : o,
      ),
    }));
  },

  rebroadcastOrder: (id) => {
    // Restarting the sequence puts the order back out on broadcast. The new
    // sequence's rounds continue the same timeline with no sequence demarcation
    // (OM §7.5.1), so the batch id is kept; `broadcastStartedAt` restarts the
    // live escalation clock and `rebroadcastCount` adds the Activity entry.
    set((s) => ({
      orders: s.orders.map((o) =>
        o.id === id
          ? {
              ...o,
              status: 'broadcasted',
              broadcastStartedAt: Date.now(),
              rebroadcastCount: (o.rebroadcastCount ?? 0) + 1,
              // A pinned review fixture must stop pinning once the dispatcher
              // acts, or the tab would snap back to its seeded shape.
              broadcastState: undefined,
            }
          : o,
      ),
    }));
  },

  cancelOrder: (id, reasons, note) => {
    // Attach the audit-trail fields first, then run the shared terminal
    // transition (which also frees the assigned driver).
    if (reasons?.length || note) {
      set((s) => ({
        orders: s.orders.map((o) =>
          o.id === id ? { ...o, cancelReasons: reasons, cancelNote: note || undefined } : o,
        ),
      }));
    }
    get().updateOrderStatus(id, 'cancelled');
  },

  returnOrder: (id, reason) => {
    set((s) => ({
      orders: s.orders.map((o) =>
        o.id === id ? { ...o, returnInfo: { reason, at: new Date().toISOString() } } : o,
      ),
    }));
    // 'returning' isn't a terminal status (the driver still holds the order
    // while bringing it back), so this doesn't free the driver — same as the
    // existing driver-failed path into this status.
    get().updateOrderStatus(id, 'returning');
  },

  recordOrderEdit: (id, changes) => {
    if (changes.length === 0) return;
    set((s) => ({
      orders: s.orders.map((o) =>
        o.id === id
          ? { ...o, edits: [...(o.edits ?? []), { at: new Date().toISOString(), changes }] }
          : o,
      ),
    }));
  },

  pushToast: (toast) => {
    const seq = get()._toastSeq + 1;
    set((s) => ({
      toasts: [...s.toasts, { ...toast, id: `toast-${seq}` }],
      _toastSeq: seq,
    }));
  },

  dismissToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

// Prototype dev-aid: expose the store on window so flows can be poked from the
// console (e.g. `__letaStore.getState().pushToast(...)`) during development.
if (typeof window !== 'undefined') {
  (window as Window & { __letaStore?: typeof useStore }).__letaStore = useStore;
}

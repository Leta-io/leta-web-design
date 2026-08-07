import * as React from 'react';
import { createPortal } from 'react-dom';
import {
  ModalShell,
  ModalHeaders,
  FooterFrame,
  ContentPrimitives,
  InputField,
  Select,
  SearchInput,
  TextArea,
  Stepper,
  NotificationBanner,
  EmptyState,
  Button,
  DateTimePicker,
  DesktopDropdowns,
  DesktopMenuOptions,
  LeadingInputFieldElement,
  AlertDialog,
} from '@leta-io/components';
import type { ClientConfig, DepotOption, Order, OrderStatus } from '../store/types.js';
import type { NewOrderInput } from '../store/useStore.js';
import { Popover, MenuPanel } from './Popover.js';

/**
 * Repeat-customer directory for the recipient autocomplete (Doc 1 §4.4). In the
 * real product this comes from the customer store; here a small sample set (incl.
 * a couple of "Sarah"s to exercise matching) drives the combobox + autofill.
 */
interface KnownCustomer { name: string; phone: string; email?: string; address?: string }
const KNOWN_CUSTOMERS: KnownCustomer[] = [
  { name: 'Sarah Okello', phone: '740728775', email: 'sarollo@gmail.com', address: 'Exeter Pride Apartments, Nairobi' },
  { name: 'Sarah Njeri', phone: '712004411', email: 'snjeri@gmail.com', address: 'Kileleshwa, Nairobi' },
  { name: 'John Kamau', phone: '712001009', email: 'jkamau@gmail.com', address: '38 Cedar Lane, Kilimani, Nairobi' },
  { name: 'Amina Yusuf', phone: '722001010', email: 'amina.y@gmail.com', address: '7 UN Crescent, Gigiri, Nairobi' },
  { name: 'David Njoroge', phone: '733001011', email: 'dnjoroge@gmail.com', address: 'ABC Place, Waiyaki Way, Westlands' },
  { name: 'Wanjiru Mwangi', phone: '700001012', email: 'wmwangi@gmail.com', address: 'Brookside Drive, Westlands' },
  { name: 'Otieno Achieng', phone: '714001013', email: 'otieno.a@gmail.com', address: 'Ngong Road Mall, Nairobi' },
];

/**
 * A geocoded address suggestion (Doc 1 §4 annotation: "Google Maps & Address API
 * will be used to display list of addresses when entering a new delivery
 * address"). Backed by Nominatim (OpenStreetMap) — the same no-API-key
 * geocoding/tile source `MapView` already standardizes on — rather than a paid
 * Google API, since this is a prototype, not a production integration.
 */
interface AddressSuggestion { label: string; lat: number; lon: number }

interface AddOrderDrawerProps {
  open: boolean;
  /** Active client config — drives which fields/sections render. */
  config: ClientConfig;
  onClose: () => void;
  /** Fired with the built order + whether it's scheduled (>1h out) vs immediate. */
  onSubmit: (order: NewOrderInput, scheduled: boolean) => void;
  /**
   * `create` (default) = Add Order. `edit` = Edit Order (OM §8, Figma
   * `350:38360`): same form, prefilled from `editOrder`, retitled, footer
   * "Save Changes"; Assigned/At Depot orders show the address-lock info banner.
   */
  mode?: 'create' | 'edit';
  /** The order being edited (edit mode) — prefills the form. */
  editOrder?: Order | null;
  /** The edited order's current status — drives the banner + save behaviour. */
  orderStatus?: OrderStatus;
  /** Edit-mode save — fired with the rebuilt order fields. */
  onSave?: (order: NewOrderInput) => void;
}

// Slide-in from the right edge (design-system overlay motion; honours reduced-motion).
const DRAWER_STYLE_ID = 'leta-add-order-drawer-motion';
// CSS TRANSITIONS, not keyframes — a keyframe-based toggle restarts from its
// fixed `from` value on interrupt, so closing mid-enter (e.g. a fast Add Order
// → Cancel) caused a visible jump back to the start position before sliding
// out. A transition retargets from whatever the panel's CURRENT transform is,
// so it stays smooth no matter when `closing` fires. The `open` class is added
// a frame after mount (there's nothing to transition *from* on first paint),
// giving the enter its own animation; `closing` swaps in a quicker, ease-in exit.
const DRAWER_CSS = `
.leta-drawer-panel { transform: translateX(100%); transition: transform 300ms cubic-bezier(0.16, 1, 0.3, 1); will-change: transform; }
.leta-drawer-panel.open { transform: translateX(0); }
.leta-drawer-panel.closing { transition: transform 220ms cubic-bezier(0.4, 0, 1, 1); transform: translateX(100%); }
.leta-drawer-scrim { opacity: 0; transition: opacity 300ms ease-out; }
.leta-drawer-scrim.open { opacity: 1; }
.leta-drawer-scrim.closing { transition: opacity 200ms ease-in; opacity: 0; }
@media (prefers-reduced-motion: reduce) { .leta-drawer-panel, .leta-drawer-panel.open, .leta-drawer-panel.closing, .leta-drawer-scrim, .leta-drawer-scrim.open, .leta-drawer-scrim.closing { transition: none; } }
`;
function ensureDrawerStyles(): void {
  if (typeof document === 'undefined' || document.getElementById(DRAWER_STYLE_ID)) return;
  const el = document.createElement('style');
  el.id = DRAWER_STYLE_ID;
  el.textContent = DRAWER_CSS;
  document.head.appendChild(el);
}

// Item row add/remove — one-shot sequences (a keyframe is right here, unlike the
// drawer's continuous open/close toggle), so no interruptibility concern. Enter
// is a touch slower and fades/slides up into place; exit is shorter and softer
// (small translateY, not the row's full height) per the enter/exit polish convention.
const ITEM_ROW_STYLE_ID = 'leta-add-order-item-row-motion';
const ITEM_ROW_CSS = `
@keyframes leta-item-row-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
@keyframes leta-item-row-out { from { opacity: 1; transform: translateY(0); } to { opacity: 0; transform: translateY(-6px); } }
.leta-item-row-enter { animation: leta-item-row-in 420ms cubic-bezier(0.22, 1, 0.36, 1); will-change: transform, opacity; }
.leta-item-row-exit { animation: leta-item-row-out 260ms cubic-bezier(0.4, 0, 1, 1) forwards; pointer-events: none; will-change: transform, opacity; }
@media (prefers-reduced-motion: reduce) { .leta-item-row-enter, .leta-item-row-exit { animation: none; } }
`;
function ensureItemRowStyles(): void {
  if (typeof document === 'undefined' || document.getElementById(ITEM_ROW_STYLE_ID)) return;
  const el = document.createElement('style');
  el.id = ITEM_ROW_STYLE_ID;
  el.textContent = ITEM_ROW_CSS;
  document.head.appendChild(el);
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Top-level form section header (Pickup From / Deliver To / Items / Payment Info,
 * Figma `93:7708`). These bind to the **section-heading** Content Primitive
 * (Body/L/SemiBold, `--text-default-heading`) — not the smaller `group-header`
 * style (Body/M/SemiBold, `--text-default-sub-heading`) that `InputGroup`
 * (Organisms/Forms `InputSection`) renders. No subtext or visual anchor icon in
 * this instance, so both are explicitly suppressed.
 */
function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-12px)', width: '100%' }}>
      <ContentPrimitives
        type="section-heading"
        text={title}
        showSubtext={false}
        showVisualAnchor={false}
        showTrailingContent={false}
        showInteractiveElements={false}
        showPassiveElements={false}
      />
      {children}
    </div>
  );
}
const NAIROBI = { lat: -1.286, lng: 36.817 };
// Fixed height of the combobox-search results region (matches the design-system
// DesktopDropdowns combobox-search), so the panel is the same size whether the
// query has matches or shows the empty state.
const COMBO_RESULTS_HEIGHT = 240;

interface ItemRow {
  key: number;
  /** manual mode: the typed item name. */
  name: string;
  /** product mode: the selected product id. */
  productId: string;
  qty: number;
}

/** Parse "8:00 AM" / "08:30 PM" into { h, m } 24h. */
function parseTime(time: string | null | undefined): { h: number; m: number } {
  if (!time) return { h: 12, m: 0 };
  const match = /(\d{1,2}):(\d{2})\s*(AM|PM)/i.exec(time);
  if (!match) return { h: 12, m: 0 };
  let h = parseInt(match[1]!, 10) % 12;
  if (/PM/i.test(match[3]!)) h += 12;
  return { h, m: parseInt(match[2]!, 10) };
}

/**
 * The combobox-search picker panel (depot / product) — mirrors the design-system
 * `DesktopDropdowns` combobox-search anatomy: a bare card whose **search section is
 * full-width with an edge-to-edge bottom divider** (no uniform card padding, so the
 * divider reaches both edges) over a padded, scrollable option list. Composed from
 * the same atoms (`SearchInput` + `DesktopMenuOptions`) rather than the packaged
 * variant, which bundles pagination chrome + a presentational (non-filtering) search
 * suited to long lists, not a short inline field picker.
 */
function ComboSearchPanel({ width, query, onQuery, placeholder, children }: {
  width: number; query: string; onQuery: (v: string) => void; placeholder: string; children: React.ReactNode;
}): React.ReactElement {
  return (
    <div
      role="menu"
      style={{
        width, boxSizing: 'border-box', display: 'flex', flexDirection: 'column',
        backgroundColor: 'var(--surface-neutral-bg-default)',
        border: 'var(--stroke-xs) solid var(--border-neutral-default)',
        borderRadius: 'var(--rounding-xl)', boxShadow: 'var(--shadow-neutral-3)', overflow: 'hidden',
      }}
    >
      <div style={{ padding: 'var(--padding-8px)', borderBottom: 'var(--stroke-xs) solid var(--border-neutral-default)' }}>
        <SearchInput placeholder={placeholder} value={query} autoFocus onChange={(e) => onQuery(e.target.value)} onClear={() => onQuery('')} style={{ width: '100%' }} />
      </div>
      {React.Children.count(children) === 0 ? (
        // Combobox-search-EMPTY — locks to the FULL max results height (search-empty
        // variants always render at max, never hug), message centered. (Overrides the
        // DS no-results preset's placeholder "All reviews…" copy — see EmptyState.tsx.)
        <div style={{ height: COMBO_RESULTS_HEIGHT, boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--padding-16px)' }}>
          <EmptyState type="no-results" size="desktop" showIcon={false} description="Try adjusting your search." />
        </div>
      ) : (
        // Populated — HUGS its rows, then locks at the max height and scrolls
        // (design-system dropdown height model; see DesktopDropdowns JSDoc).
        <div style={{ maxHeight: COMBO_RESULTS_HEIGHT, boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4px)', padding: 'var(--padding-8px)', overflowY: 'auto', overscrollBehavior: 'contain' }}>
          {children}
        </div>
      )}
    </div>
  );
}

/**
 * AddOrderDrawer — the config-aware order-creation form (OM Foundations Doc 1 §4),
 * a right-anchored full-viewport side sheet. Composes the design-system `ModalShell`
 * (`fillHeight`: sticky header/footer + scrolling body + scroll-shadows) with
 * `ModalHeaders` + `FooterFrame`, and builds the form from `FormSection` (a direct
 * `section-heading` Content Primitive — see {@link FormSection}) groups + the field
 * atoms. What renders is driven by the active {@link ClientConfig}:
 *   - Pickup depot: 1 depot -> locked `InputField` (+ address helper); 2+ -> `Select` dropdown.
 *   - Items section: only if `items.enabled`; each row is a name field (manual -> `InputField`,
 *     product -> `Select`) + quantity `Stepper` + Remove; an error banner appears above Add Item
 *     when 0 items are entered on submit.
 *   - Payment Info: only if `payment.enabled`; Items value is editable (manual) or derived+locked
 *     (product = sum price*qty), plus Delivery fee, Payment type, and a Total (VAT Incl.) row.
 * Two columns when the right column has content, else single column.
 */
export function AddOrderDrawer({ open, config, onClose, onSubmit, mode = 'create', editOrder = null, orderStatus, onSave }: AddOrderDrawerProps): React.ReactElement | null {
  ensureDrawerStyles();
  ensureItemRowStyles();

  const isEdit = mode === 'edit';
  // Assigned/At Depot orders can still be edited (incl. address) but the driver
  // is notified on save — the info banner warns that addresses lock once the
  // order leaves the depot (OM §8, Figma 350:38398).
  const showAddressLockBanner = isEdit && (orderStatus === 'assigned' || orderStatus === 'at-depot');
  const singleDepot = config.depots.length === 1;
  const hasRightColumn = config.items.enabled || config.payment.enabled;

  // form state
  // Single depot → locked field shows the one depot; multi → starts unselected (the
  // dispatcher searches + picks).
  const [depotId, setDepotId] = React.useState(config.depots.length === 1 ? config.depots[0]!.id : '');
  const [depotQuery, setDepotQuery] = React.useState(''); // multi-depot search field text
  const [depotOpen, setDepotOpen] = React.useState(false); // depot autocomplete dropdown
  const [recipient, setRecipient] = React.useState('');
  const [address, setAddress] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [dateLabel, setDateLabel] = React.useState('');
  const [deliveryAt, setDeliveryAt] = React.useState<Date | null>(null);
  const [orderRef, setOrderRef] = React.useState('');
  const [instructions, setInstructions] = React.useState('');
  const [items, setItems] = React.useState<ItemRow[]>([]);
  const [manualValue, setManualValue] = React.useState('');
  const [deliveryFee, setDeliveryFee] = React.useState('');
  const [paymentType, setPaymentType] = React.useState('');
  const [submitted, setSubmitted] = React.useState(false);
  const [dirty, setDirty] = React.useState(false);
  const [confirmExit, setConfirmExit] = React.useState(false);
  const [closing, setClosing] = React.useState(false); // playing the exit animation
  // Flips true a frame after mount so the CSS transition has a "from" state to
  // animate away from (applying the open transform on the very first paint
  // wouldn't animate — transitions only fire on a subsequent style change).
  // A SINGLE rAF isn't enough: it fires before the browser has painted the
  // initial (closed) state, so React's first render and the `open` class flip
  // often land in the same paint and the slide-in never animates (confirmed
  // live — the panel appeared fully open instantly). Nesting a second rAF
  // guarantees a paint happens in between.
  const [entered, setEntered] = React.useState(false);
  React.useEffect(() => {
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setEntered(true));
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, []);
  // True once the drawer's OWN slide-in transition has genuinely finished (not
  // just started, like `entered`) — guards the portal-anchored pickers (date /
  // payment / product, opened via `openPicker`+`Popover`) against capturing a
  // stale anchor. `captureRect` snapshots a field's rect at click time; if the
  // drawer panel is still translating (within the first ~300ms of opening) when
  // that click happens, the snapshot reflects a mid-slide position that's
  // already wrong a moment later once the panel finishes settling — the popover
  // would then render offset by however far the panel still had to travel. The
  // depot/recipient/address dropdowns don't have this problem (they're plain
  // CSS `position:relative`-anchored, continuously tracking the wrapper's
  // current position — nothing to go stale). `matchMedia` fallback: with
  // reduced motion the panel snaps instantly, so there's no transition to wait
  // on — treat the drawer as settled immediately.
  const [drawerSettled, setDrawerSettled] = React.useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  const handlePanelTransitionEnd = (e: React.TransitionEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && e.propertyName === 'transform' && !closing) setDrawerSettled(true);
  };
  // The field-box element behind whichever portal picker is currently open (if
  // any) — re-measured once the drawer settles so a picker opened mid-slide
  // gets corrected to its true final position. (The re-measure effect itself
  // lives just after `picker`/`setPicker` are declared, below.)
  const lastAnchorElRef = React.useRef<HTMLElement | null>(null);
  const [recipientOpen, setRecipientOpen] = React.useState(false); // autocomplete dropdown
  const [pickerQuery, setPickerQuery] = React.useState(''); // product combobox-search filter
  const itemSeq = React.useRef(0);
  // Item rows currently playing their exit animation (still in `items`, kept
  // mounted until removeItem's timeout actually filters them out).
  const [removingKeys, setRemovingKeys] = React.useState<ReadonlySet<number>>(() => new Set());
  const removeTimersRef = React.useRef(new Map<number, ReturnType<typeof setTimeout>>());
  React.useEffect(() => {
    const timers = removeTimersRef.current;
    return () => timers.forEach(clearTimeout);
  }, []);
  const closeTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const recipientBlurTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const depotBlurTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const addressBlurTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Delivery address autocomplete — live geocoded suggestions (see
  // AddressSuggestion doc comment). Debounced ~350ms after the last keystroke
  // (Doc 3 §8's search-debounce convention) and only fires once the query is
  // long enough to return meaningful results; an in-flight request is aborted
  // if the query changes again before it resolves.
  const [addressOpen, setAddressOpen] = React.useState(false);
  const [addressResults, setAddressResults] = React.useState<AddressSuggestion[]>([]);
  const [addressLoading, setAddressLoading] = React.useState(false);
  const addressDebounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const addressAbortRef = React.useRef<AbortController | null>(null);
  React.useEffect(() => {
    if (addressDebounceRef.current) clearTimeout(addressDebounceRef.current);
    const query = address.trim();
    if (query.length < 3) { setAddressResults([]); setAddressLoading(false); return; }
    addressDebounceRef.current = setTimeout(() => {
      addressAbortRef.current?.abort();
      const controller = new AbortController();
      addressAbortRef.current = controller;
      setAddressLoading(true);
      fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=5&countrycodes=ke&q=${encodeURIComponent(query)}`,
        { signal: controller.signal },
      )
        .then((r) => r.json())
        .then((data: Array<{ display_name: string; lat: string; lon: string }>) => {
          setAddressResults(data.map((d) => ({ label: d.display_name, lat: parseFloat(d.lat), lon: parseFloat(d.lon) })));
        })
        .catch((e: unknown) => { if ((e as { name?: string })?.name !== 'AbortError') setAddressResults([]); })
        .finally(() => setAddressLoading(false));
    }, 350);
    return () => { if (addressDebounceRef.current) clearTimeout(addressDebounceRef.current); };
  }, [address]);

  // Reset whenever the drawer (re)opens or the client config changes. In edit
  // mode, prefill from the order instead of starting blank (dirty stays false —
  // prefill uses raw setState, not `touch()` — so an untouched edit exits cleanly).
  React.useEffect(() => {
    if (!open) return;
    if (isEdit && editOrder) {
      const depot = config.depots.find((d) => d.name === editOrder.depot) ?? config.depots[0];
      setDepotId(depot ? depot.id : '');
      setDepotQuery(depot ? depot.name : '');
      setRecipient(editOrder.customer);
      setAddress(editOrder.dropoff.label);
      setPhone(editOrder.phone.replace(/^\+254\s*/, ''));
      setEmail('');
      const base = new Date(editOrder.createdAt);
      setDeliveryAt(isNaN(base.getTime()) ? new Date() : base);
      setDateLabel('');
      setOrderRef('');
      setInstructions('');
      // Rebuild a single item row from the order's package/count (the mock order
      // has no structured item list). Product mode → match by name, else 1st product.
      if (config.items.enabled) {
        if (config.items.mode === 'product') {
          const p =
            config.products.catalogue.find((x) => x.name === editOrder.package) ?? config.products.catalogue[0];
          setItems(p ? [{ key: ++itemSeq.current, name: '', productId: p.id, qty: editOrder.items || 1 }] : []);
        } else {
          setItems([{ key: ++itemSeq.current, name: editOrder.package, productId: '', qty: editOrder.items || 1 }]);
        }
      } else setItems([]);
      setManualValue(''); setDeliveryFee(''); setPaymentType('');
    } else {
      setDepotId(config.depots.length === 1 ? config.depots[0]!.id : '');
      setDepotQuery('');
      setRecipient(''); setAddress(''); setPhone(''); setEmail('');
      setDateLabel(''); setDeliveryAt(null); setOrderRef(''); setInstructions('');
      setItems([]); setManualValue(''); setDeliveryFee(''); setPaymentType('');
    }
    setDepotOpen(false);
    setSubmitted(false); setDirty(false); setConfirmExit(false); setClosing(false); setRecipientOpen(false);
    setAddressOpen(false); setAddressResults([]);
  }, [open, config, isEdit, editOrder]);
  React.useEffect(() => () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    if (recipientBlurTimer.current) clearTimeout(recipientBlurTimer.current);
    if (depotBlurTimer.current) clearTimeout(depotBlurTimer.current);
    if (addressBlurTimer.current) clearTimeout(addressBlurTimer.current);
    addressAbortRef.current?.abort();
  }, []);

  // Single portal picker overlay (product-row / payment-type / date). The depot is a
  // field-anchored SearchInput + combobox dropdown (like recipient), not a Popover picker.
  type Picker =
    | { kind: 'product'; anchor: DOMRect; rowKey: number }
    | { kind: 'payment'; anchor: DOMRect }
    | { kind: 'date'; anchor: DOMRect };
  const [picker, setPicker] = React.useState<Picker | null>(null);
  const openPicker = (p: Picker) => { setPickerQuery(''); setPicker(p); };
  // Corrects a mid-slide-captured anchor once the drawer settles (see the
  // `drawerSettled`/`lastAnchorElRef` doc comment above).
  React.useEffect(() => {
    if (!drawerSettled) return;
    const el = lastAnchorElRef.current;
    if (!el) return;
    const fresh = el.getBoundingClientRect();
    setPicker((p) => (p ? { ...p, anchor: fresh } : p));
  }, [drawerSettled]);
  // `Select.onSelectClick` carries no event, so each picker field's wrapper captures
  // its own rect on click-capture (fires before onSelectClick) into this shared ref;
  // the picker Popover then anchors to it.
  const fieldRectRef = React.useRef<DOMRect | null>(null);
  // Anchor to the Select's field box (`data-field-box`), not the outer labelled
  // wrapper `e.currentTarget` — the wrapper's rect includes the label above the
  // box, which throws off the Popover's flip-above math (the panel would land
  // level with the label instead of the visible field).
  const captureRect = (e: React.MouseEvent) => {
    const wrapper = e.currentTarget as HTMLElement;
    const box = wrapper.querySelector<HTMLElement>('[data-field-box]') ?? wrapper;
    lastAnchorElRef.current = box;
    fieldRectRef.current = box.getBoundingClientRect();
  };
  const anchor = () => fieldRectRef.current ?? new DOMRect(0, 0, 320, 40);

  const touch = () => setDirty(true);

  if (!open) return null;

  // derived
  const products = config.products.catalogue;
  const productMode = config.items.mode === 'product';
  const derivedItemsValue = items.reduce((sum, r) => {
    const p = products.find((x) => x.id === r.productId);
    return sum + (p ? p.price * r.qty : 0);
  }, 0);
  const itemsValueNum = productMode ? derivedItemsValue : parseFloat(manualValue) || 0;
  const feeNum = parseFloat(deliveryFee) || 0;
  const total = itemsValueNum + feeNum;

  const itemsMissing = config.items.enabled && config.items.valueRequired && items.length === 0;

  // item mutations
  const addItem = () => { touch(); setItems((rows) => [...rows, { key: ++itemSeq.current, name: '', productId: '', qty: 1 }]); };
  // Removal plays the exit animation before the row actually leaves `items` —
  // it stays mounted (with the exit class + pointer-events:none) for the
  // animation's duration, then is filtered out for real.
  const removeItem = (key: number) => {
    if (removingKeys.has(key)) return;
    touch();
    setRemovingKeys((prev) => new Set(prev).add(key));
    const t = setTimeout(() => {
      removeTimersRef.current.delete(key);
      setItems((rows) => rows.filter((r) => r.key !== key));
      setRemovingKeys((prev) => { const next = new Set(prev); next.delete(key); return next; });
    }, 260); // matches leta-item-row-out
    removeTimersRef.current.set(key, t);
  };
  const patchItem = (key: number, patch: Partial<ItemRow>) => { touch(); setItems((rows) => rows.map((r) => (r.key === key ? { ...r, ...patch } : r))); };

  // close / submit — beginClose plays the exit transition, then unmounts. 220ms
  // matches the `.closing` transition-duration (a touch quicker than the 300ms
  // enter — exits should feel lighter, per the interface-polish convention).
  const beginClose = () => {
    if (closing) return;
    setClosing(true);
    closeTimer.current = setTimeout(() => onClose(), 220);
  };
  const attemptClose = () => { if (dirty) setConfirmExit(true); else beginClose(); };

  const handleSubmit = () => {
    setSubmitted(true);
    const depot = config.depots.find((d) => d.id === depotId);
    const valid = Boolean(depot && recipient.trim() && address.trim() && phone.trim() && deliveryAt) && !itemsMissing;
    if (!valid) return;

    const scheduled = deliveryAt!.getTime() > Date.now() + 60 * 60 * 1000;
    const names = productMode
      ? items.map((r) => products.find((p) => p.id === r.productId)?.name).filter(Boolean).join(', ')
      : items.map((r) => r.name).filter(Boolean).join(', ');
    const order: NewOrderInput = {
      customer: recipient.trim(),
      phone: `+254 ${phone.trim()}`,
      depot: depot!.name,
      pickup: { label: depot!.name, ...NAIROBI },
      dropoff: { label: address.trim(), lat: NAIROBI.lat + 0.01, lng: NAIROBI.lng + 0.01 },
      package: names || 'Items',
      items: items.reduce((n, r) => n + r.qty, 0) || items.length,
      priority: 'standard',
      status: scheduled ? 'scheduled' : 'pending',
      createdAt: new Date().toISOString(),
    };
    if (isEdit) { onSave?.(order); beginClose(); }
    else onSubmit(order, scheduled);
  };

  const err = (v: string) => submitted && !v.trim();

  // Recipient autocomplete (Doc 1 §4.4) — matches fire from the first character.
  const recipientQuery = recipient.trim();
  const recipientMatches = recipientQuery
    ? KNOWN_CUSTOMERS.filter((c) => c.name.toLowerCase().includes(recipientQuery.toLowerCase()))
    : [];
  const pickCustomer = (c: KnownCustomer) => {
    touch();
    setRecipient(c.name);
    setPhone(c.phone);
    if (c.email) setEmail(c.email);
    if (c.address) setAddress(c.address);
    setRecipientOpen(false);
  };

  // Multi-depot pickup autocomplete — the SearchInput field is the query; the
  // dropdown is a combobox (matches) / combobox-empty (no match). The selected
  // depot's address shows in the field's helper text.
  const depotQ = depotQuery.trim();
  const depotMatches = depotQ
    ? config.depots.filter((d) => d.name.toLowerCase().includes(depotQ.toLowerCase()))
    : config.depots;
  const selectedDepot = config.depots.find((d) => d.id === depotId);
  const pickDepot = (d: DepotOption) => {
    touch();
    setDepotId(d.id);
    setDepotQuery(d.name);
    setDepotOpen(false);
  };

  // sections
  const pickupField = singleDepot ? (
    <InputField
      variant="basic"
      showLabel={false}
      disabled
      value={config.depots[0]?.name ?? ''}
      helperText={config.depots[0]?.address}
      style={{ width: '100%' }}
      readOnly
    />
  ) : (
    // Multi-depot: a Search field the dispatcher types into; a combobox dropdown of
    // matching depots (combobox-empty when none) opens below. Picking one fills the
    // field + shows that depot's address in the helper text.
    <div
      style={{ position: 'relative' }}
      onBlurCapture={() => { depotBlurTimer.current = setTimeout(() => setDepotOpen(false), 120); }}
      onFocusCapture={() => { if (depotBlurTimer.current) clearTimeout(depotBlurTimer.current); }}
    >
      <SearchInput
        placeholder="Search depot"
        value={depotQuery}
        helperText={selectedDepot?.address}
        error={submitted && !depotId}
        errorMessage="Select a depot"
        onChange={(e) => { touch(); setDepotQuery(e.target.value); setDepotId(''); setDepotOpen(true); }}
        onFocus={() => setDepotOpen(true)}
        onClear={() => { setDepotQuery(''); setDepotId(''); setDepotOpen(true); }}
        style={{ width: '100%' }}
      />
      {depotOpen && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 'var(--spacing-4px)', zIndex: 20 }}>
          <DesktopDropdowns
            variant={depotMatches.length ? 'combobox' : 'combobox-empty'}
            options={depotMatches.map((d) => d.name)}
            activeIndex={depotMatches.findIndex((d) => d.id === depotId)}
            emptyDescription="No depots found"
            style={{ width: '100%' }}
            onClickCapture={(e: React.MouseEvent) => {
              let el = e.target as HTMLElement | null;
              const stop = e.currentTarget as HTMLElement;
              while (el && el !== stop) {
                const t = (el.textContent ?? '').trim();
                const d = depotMatches.find((x) => x.name === t);
                if (d) { pickDepot(d); return; }
                el = el.parentElement;
              }
            }}
          />
        </div>
      )}
    </div>
  );

  const deliverFields = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-20px)', width: '100%' }}>
      {/* Recipient autocomplete — dropdown of matching customers (from the 1st char)
          + a persistent "Add …" create row (combobox-create / -empty). Anchored below
          the field (not a portal) so typing keeps it open. */}
      <div
        style={{ position: 'relative' }}
        onBlurCapture={() => { recipientBlurTimer.current = setTimeout(() => setRecipientOpen(false), 120); }}
        onFocusCapture={() => { if (recipientBlurTimer.current) clearTimeout(recipientBlurTimer.current); }}
      >
        <SearchInput
          label="Recipient name"
          placeholder="Search or enter new recipient name"
          value={recipient}
          error={err(recipient)}
          errorMessage="Enter a recipient name"
          onChange={(e) => { touch(); setRecipient(e.target.value); setRecipientOpen(e.target.value.trim().length >= 1); }}
          onFocus={() => setRecipientOpen(recipient.trim().length >= 1)}
          onClear={() => { setRecipient(''); setRecipientOpen(false); }}
          style={{ width: '100%' }}
        />
        {recipientOpen && recipientQuery && (
          <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 'var(--spacing-4px)', zIndex: 20 }}>
            <DesktopDropdowns
              variant={recipientMatches.length ? 'combobox-create' : 'combobox-create-empty'}
              options={recipientMatches.map((c) => c.name)}
              activeIndex={-1}
              createLabel={`Add “${recipientQuery}”`}
              style={{ width: '100%' }}
              onClickCapture={(e: React.MouseEvent) => {
                // The DS combobox rows render as plain <div>s (no role/button), so
                // walk up from the click target matching each element's text against
                // a known customer name (or the "Add …" create button).
                let el = e.target as HTMLElement | null;
                const stop = e.currentTarget as HTMLElement;
                while (el && el !== stop) {
                  const t = (el.textContent ?? '').trim();
                  if (el.tagName === 'BUTTON' && t.startsWith('Add ')) { setRecipientOpen(false); return; } // keep typed value as new customer
                  const match = recipientMatches.find((c) => c.name === t);
                  if (match) { pickCustomer(match); return; }
                  el = el.parentElement;
                }
              }}
            />
          </div>
        )}
      </div>
      {/* Delivery address autocomplete — live geocoded suggestions (Nominatim/OSM),
          field-anchored below the field (not a portal) so typing keeps it open. */}
      <div
        style={{ position: 'relative' }}
        onBlurCapture={() => { addressBlurTimer.current = setTimeout(() => setAddressOpen(false), 120); }}
        onFocusCapture={() => { if (addressBlurTimer.current) clearTimeout(addressBlurTimer.current); }}
      >
        <SearchInput
          label="Delivery address"
          placeholder="Search address"
          value={address}
          error={err(address)}
          errorMessage="Enter a delivery address"
          onChange={(e) => { touch(); setAddress(e.target.value); setAddressOpen(true); }}
          onFocus={() => { if (address.trim().length >= 3) setAddressOpen(true); }}
          onClear={() => { setAddress(''); setAddressResults([]); setAddressOpen(false); }}
          style={{ width: '100%' }}
        />
        {addressOpen && address.trim().length >= 3 && (
          <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 'var(--spacing-4px)', zIndex: 20 }}>
            <DesktopDropdowns
              variant={addressResults.length ? 'combobox' : 'combobox-empty'}
              options={addressResults.map((r) => r.label)}
              activeIndex={-1}
              emptyDescription={addressLoading ? 'Searching…' : 'No matching addresses'}
              style={{ width: '100%' }}
              onClickCapture={(e: React.MouseEvent) => {
                let el = e.target as HTMLElement | null;
                const stop = e.currentTarget as HTMLElement;
                while (el && el !== stop) {
                  const t = (el.textContent ?? '').trim();
                  const match = addressResults.find((r) => r.label === t);
                  if (match) { touch(); setAddress(match.label); setAddressOpen(false); return; }
                  el = el.parentElement;
                }
              }}
            />
          </div>
        )}
      </div>
      <InputField
        variant="leading"
        label="Phone number"
        placeholder="70000000"
        inputMode="tel"
        value={phone}
        error={err(phone) ? 'Enter a phone number' : undefined}
        showHelper={submitted && err(phone)}
        onChange={(e) => { touch(); setPhone(e.target.value); }}
        leadingElement={<LeadingInputFieldElement variant="single" countryCode="KE" dialCode="+254" />}
        style={{ width: '100%' }}
      />
      <InputField
        variant="basic"
        label="Recipient email"
        tag="optional"
        placeholder="Enter recipient email address"
        inputMode="email"
        value={email}
        showHelper={false}
        onChange={(e) => { touch(); setEmail(e.target.value); }}
        style={{ width: '100%' }}
      />
      <div data-picker-field onClickCapture={captureRect} style={{ position: 'relative' }}>
        <Select
          label="Delivery date"
          leadingFieldIcon="Calendar"
          placeholder="Select delivery date & time"
          value={dateLabel}
          showHelper={false}
          error={submitted && !deliveryAt ? 'Select a delivery date' : undefined}
          onSelectClick={() => openPicker({ kind: 'date', anchor: anchor() })}
          readOnly
          style={{ width: '100%' }}
        />
      </div>
      <InputField
        variant="basic"
        label="Order reference"
        tag="optional"
        placeholder="E.g #001"
        helperText="For internal reference"
        value={orderRef}
        onChange={(e) => { touch(); setOrderRef(e.target.value); }}
        style={{ width: '100%' }}
      />
      <TextArea
        label="Delivery instructions"
        tag="optional"
        placeholder="Enter delivery instructions or apartment/suite number"
        maxLength={100}
        showHelper={false}
        value={instructions}
        onChange={(e) => { touch(); setInstructions(e.target.value); }}
        style={{ width: '100%' }}
      />
    </div>
  );

  const leftColumn = (
    // No demarcator between Pickup From and Deliver To — the Figma "Demarcator"
    // there is visible:false (deliberately hidden).
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-32px)', flex: 1, minWidth: 0 }}>
      <FormSection title="Pickup From">{pickupField}</FormSection>
      <FormSection title="Deliver To">{deliverFields}</FormSection>
    </div>
  );

  const itemsSection = config.items.enabled ? (
    <FormSection title="Items">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-16px)', width: '100%' }}>
        {itemsMissing && submitted && (
          <NotificationBanner
            type="error"
            variant="filled"
            description="You need at least one item to place an order."
          />
        )}
        {items.map((row) => (
          <div
            key={row.key}
            className={removingKeys.has(row.key) ? 'leta-item-row-exit' : 'leta-item-row-enter'}
            style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-8px)', width: '100%' }}
          >
            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start', gap: 'var(--spacing-8px)', width: '100%' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                {productMode ? (
                  <div data-picker-field onClickCapture={captureRect} style={{ position: 'relative' }}>
                    <Select
                      showLabel={false}
                      showHelper={false}
                      placeholder="Select item"
                      value={products.find((p) => p.id === row.productId)?.name ?? ''}
                      onSelectClick={() => openPicker({ kind: 'product', anchor: anchor(), rowKey: row.key })}
                      readOnly
                      style={{ width: '100%' }}
                    />
                  </div>
                ) : (
                  <InputField
                    showLabel={false}
                    showHelper={false}
                    placeholder="Item name"
                    value={row.name}
                    onChange={(e) => patchItem(row.key, { name: e.target.value })}
                    style={{ width: '100%' }}
                  />
                )}
              </div>
              <Stepper variant="segmented" value={row.qty} min={1} onChange={(v) => patchItem(row.key, { qty: v })} aria-label="Quantity" />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <Button variant="plain" size="medium" iconLeft="Cancel" onClick={() => removeItem(row.key)}>
                Remove
              </Button>
            </div>
          </div>
        ))}
        <div>
          <Button variant="dashed" size="medium" iconLeft="Add" onClick={addItem}>Add Item</Button>
        </div>
      </div>
    </FormSection>
  ) : null;

  const paymentSection = config.payment.enabled ? (
    <FormSection title="Payment Info">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-20px)', width: '100%' }}>
        <InputField
          variant="basic"
          label="Items value"
          currency="KES"
          placeholder="0.00"
          inputMode="decimal"
          showHelper={false}
          disabled={productMode}
          value={productMode ? (derivedItemsValue ? String(derivedItemsValue) : '') : manualValue}
          onChange={(e) => { touch(); setManualValue(e.target.value); }}
          style={{ width: '100%' }}
        />
        <InputField
          variant="basic"
          label="Delivery fee"
          currency="KES"
          placeholder="0.00"
          inputMode="decimal"
          showHelper={false}
          value={deliveryFee}
          onChange={(e) => { touch(); setDeliveryFee(e.target.value); }}
          style={{ width: '100%' }}
        />
        <div data-picker-field onClickCapture={captureRect} style={{ position: 'relative' }}>
          <Select
            label="Payment type"
            tag="optional"
            placeholder="Select payment method"
            value={paymentType}
            showHelper={false}
            onSelectClick={() => openPicker({ kind: 'payment', anchor: anchor() })}
            readOnly
            style={{ width: '100%' }}
          />
        </div>
        {total > 0 && (
          // Solid demarcator separating the Total from the Payment Info fields
          // (Figma: the Total's leading "Demarcator" is a solid rule, not dashed).
          <div role="separator" aria-orientation="horizontal" style={{ width: '100%', height: 0, borderTop: 'var(--stroke-xs) solid var(--border-neutral-default)' }} />
        )}
        {total > 0 && (
          // Total row (Figma 1304:89506): Title (Label/M/SemiBold) over Subtext
          // (Body/M/Regular), amount right (Body/L/SemiBold).
          <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--spacing-8px)', paddingTop: 'var(--spacing-4px)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <span className="text-label-m-semibold" style={{ color: 'var(--text-default-heading)' }}>Total</span>
              <span className="text-body-m-regular" style={{ color: 'var(--text-default-sub-body)' }}>VAT Incl.</span>
            </div>
            <span className="text-body-l-semibold" style={{ color: 'var(--text-default-heading)', whiteSpace: 'nowrap' }}>
              KES {total.toLocaleString()}
            </span>
          </div>
        )}
      </div>
    </FormSection>
  ) : null;

  const rightColumn = hasRightColumn ? (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-32px)', flex: 1, minWidth: 0 }}>
      {itemsSection}
      {paymentSection}
    </div>
  ) : null;

  const body = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-16px)', width: '100%', paddingBottom: 40 }}>
      {/* Edit mode, Assigned/At Depot — address-lock heads-up (Figma 350:38398). */}
      {showAddressLockBanner && (
        <NotificationBanner
          type="info"
          variant="filled"
          description="Pickup and delivery addresses can't be changed once an order has left the depot."
        />
      )}
      <div style={{ display: 'flex', flexDirection: 'row', gap: 'var(--spacing-20px)', width: '100%', alignItems: 'stretch' }}>
        {leftColumn}
        {rightColumn && (
          <>
            <div style={{ width: 0, flexShrink: 0, borderLeft: 'var(--stroke-xs) solid var(--border-neutral-default)' }} />
            {rightColumn}
          </>
        )}
      </div>
    </div>
  );

  const PAYMENT_METHODS = ['Cash', 'M-Pesa', 'Card', 'Payment on Delivery'];

  return createPortal(
    <>
      <div
        aria-hidden
        className={`leta-drawer-scrim ${closing ? 'closing' : entered ? 'open' : ''}`}
        onClick={attemptClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(16,16,16,0.4)', zIndex: 1500 }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={isEdit ? 'Edit Order' : 'Add Order'}
        className={`leta-drawer-panel ${closing ? 'closing' : entered ? 'open' : ''}`}
        style={{ position: 'fixed', top: 0, right: 0, height: '100dvh', zIndex: 1501 }}
        onTransitionEnd={handlePanelTransitionEnd}
      >
        <ModalShell
          width={768}
          rounded={false}
          fillHeight
          onEscape={attemptClose}
          bodyStyle={{ padding: 'var(--padding-24px) var(--padding-16px) 0' }}
          header={<ModalHeaders title={isEdit ? 'Edit Order' : 'Add Order'} showSecondaryContent={false} onClose={attemptClose} />}
          footer={
            // Tertiary Action footer (Figma 483:48031): Cancel set apart on the left,
            // the primary action on the right.
            <FooterFrame
              variant="tertiary-action"
              leading={<Button variant="secondary" size="medium" onClick={attemptClose}>Cancel</Button>}
            >
              <Button variant="primary" size="medium" iconLeft={isEdit ? 'Check' : 'Add'} onClick={handleSubmit}>
                {isEdit ? 'Save Changes' : 'Add Order'}
              </Button>
            </FooterFrame>
          }
        >
          {body}
        </ModalShell>
      </div>

      {picker?.kind === 'product' && (() => {
        const q = pickerQuery.trim().toLowerCase();
        const rows = products.filter((p) => !q || p.name.toLowerCase().includes(q));
        const activeId = items.find((r) => r.key === picker.rowKey)?.productId;
        return (
          <Popover anchorRect={picker.anchor} onClose={() => setPicker(null)} placement="bottom-start">
            <ComboSearchPanel width={Math.max(320, picker.anchor.width)} query={pickerQuery} onQuery={setPickerQuery} placeholder="Search items">
              {rows.map((p) => (
                <DesktopMenuOptions
                  key={p.id}
                  type="combobox"
                  label={`${p.name} - KES ${p.price}`}
                  active={p.id === activeId}
                  onClick={() => { patchItem(picker.rowKey, { productId: p.id }); setPicker(null); }}
                />
              ))}
            </ComboSearchPanel>
          </Popover>
        );
      })()}
      {picker?.kind === 'payment' && (
        <Popover anchorRect={picker.anchor} onClose={() => setPicker(null)} placement="bottom-start">
          <MenuPanel width={Math.max(280, picker.anchor.width)}>
            {PAYMENT_METHODS.map((m) => (
              <DesktopMenuOptions
                key={m}
                type="combobox"
                label={m}
                active={m === paymentType}
                onClick={() => { touch(); setPaymentType(m); setPicker(null); }}
              />
            ))}
          </MenuPanel>
        </Popover>
      )}
      {picker?.kind === 'date' && (
        <Popover anchorRect={picker.anchor} onClose={() => setPicker(null)} placement="bottom-start">
          <DateTimePicker
            type="date-time"
            platform="desktop"
            onApply={(v) => {
              const d = v.date ?? null;
              if (d) {
                const { h, m } = parseTime(v.time);
                const dt = new Date(d);
                dt.setHours(h, m, 0, 0);
                setDeliveryAt(dt);
                const timeStr = v.time ?? '12:00 AM';
                setDateLabel(`${MONTHS[dt.getMonth()]} ${dt.getDate()} ${dt.getFullYear()}, ${timeStr}`);
                touch();
              }
              setPicker(null);
            }}
          />
        </Popover>
      )}

      {/* Exit confirmation (Doc 1 §4.6) — the design-system AlertDialog (Figma 762:66261). */}
      {confirmExit && (
        <>
          <div aria-hidden onClick={() => setConfirmExit(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(16,16,16,0.4)', zIndex: 1600 }} />
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 1601 }}>
            <AlertDialog
              variant="basic"
              title={isEdit ? 'Discard Changes?' : 'Discard Order?'}
              message={isEdit
                ? 'You have unsaved changes. Are you sure you want to discard them?'
                : 'The order details you’ve entered won’t be saved. Are you sure you want to discard them?'}
              cancelLabel={isEdit ? 'Discard Changes' : 'Discard Order'}
              confirmLabel="Keep Editing Order"
              onCancel={() => { setConfirmExit(false); beginClose(); }}
              onClose={() => setConfirmExit(false)}
              onConfirm={() => setConfirmExit(false)}
            />
          </div>
        </>
      )}
    </>,
    document.body,
  );
}

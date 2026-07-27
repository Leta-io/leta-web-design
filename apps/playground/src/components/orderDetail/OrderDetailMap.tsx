import * as React from 'react';
import type { Map as LeafletMap, Polyline } from 'leaflet';
import { renderToStaticMarkup } from 'react-dom/server';
import { Button, FeaturedIcon, MapView } from '@leta/components';
import { Icon, type IconName } from '@leta/icons';
import { MarkerLayer, type MapMarkerSpec } from '../../shell/mapMarkers.js';
import type { Order, OrderStatus } from '../../store/types.js';
import { idHash } from '../../lib/orderMeta.js';

/**
 * The View Order drawer's map — "the route's biography" (OM §7.2 map matrix).
 *
 * - **Mini map** (drawer overview card, 368×168): non-interactive `MapView`
 *   (drag/zoom disabled, no zoom control) with state-driven pins + routes and an
 *   expand button top-right. No banner/legend/cards — those are expanded-only.
 * - **Expanded map** (fullscreen dimmed overlay, 768×768): interactive MapView
 *   with the DS `MapZoomControl` (bottom-right, MapView's default), the dark
 *   **Map Fixed Banner** top-center, the **Map Legend** pill bottom-center, and a
 *   **Map Card** affixed above each of the depot / drop-off pins.
 *
 * ## Route model (wireframes `1522:115768`, enumerated 2026-07-27)
 *
 * Two route lines, visually distinct and never overlapping (they bow apart in the
 * middle but meet exactly at both pins):
 *
 * | Route | Meaning | Style |
 * |---|---|---|
 * | **Planned** | The route LETA generated. Appears **once a driver is assigned**. | `--surface-secondary-bg` (#192037) **dashed** 6/6, weight 3 |
 * | **Driven** | The path the driver actually took. | `--icons-primary-default` (#ff3941) **solid**, weight 3 |
 *
 * Per status: pre-dispatch = pins only · Assigned→Arrived = planned + live driver
 * · Returning = planned + driver + failed drop-off · **Delivered** = planned +
 * driven (full run) · **Returned** = planned + driven, where the driven line runs
 * out and **loops back to the depot** so the dispatcher can see where the driver
 * turned around · Cancelled = planned only if it was dispatched first (§11.1).
 *
 * Both lines carry the comet micro-animation (see {@link traceRoute}).
 */

const DISPATCHED: OrderStatus[] = ['assigned', 'at-depot', 'in-transit', 'arrived', 'returning'];

/** Planned = dark dashed (LETA's route); Driven = red solid (what happened). */
const PLANNED_COLOR = '--surface-secondary-bg';
const DRIVEN_COLOR = '--icons-primary-default';
const PLANNED_DASH = '6 6';
const ROUTE_WEIGHT = 3;

function cssColor(varName: string, fallback: string): string {
  if (typeof document === 'undefined') return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  return v || fallback;
}

type LatLng = [number, number];

/** Deterministic gentle bend so mock routes read as roads, not rulers. */
function routePoints(o: Order): LatLng[] {
  const a = o.pickup;
  const b = o.dropoff;
  const h = idHash(o.id);
  const dx = b.lng - a.lng;
  const dy = b.lat - a.lat;
  // two interpolated bend points, offset perpendicular to the segment
  const off = ((h % 7) - 3) * 0.0022;
  return [
    [a.lat, a.lng],
    [a.lat + dy * 0.35 + off * (dx > 0 ? 1 : -1) * 0.6, a.lng + dx * 0.3 - off],
    [a.lat + dy * 0.7 - off * 0.5, a.lng + dx * 0.72 + off * 0.8],
    [b.lat, b.lng],
  ];
}

/**
 * Bow a path sideways so two routes over the same trip stay readable as separate
 * lines. The offset is perpendicular to the overall depot→drop-off direction and
 * **tapers to zero at both ends** (`sin` envelope), so the planned and driven
 * lines still terminate exactly on the two map pins — the "slight variance but
 * ultimately connect the two map icons" rule.
 *
 * `factor` is a **fraction of the trip length**, not an absolute distance: a
 * fixed degree offset looks negligible on a long trip and absurdly large on a
 * short one (a 400m bow across a 300m delivery), so it has to scale.
 */
function bow(points: LatLng[], factor: number): LatLng[] {
  const first = points[0]!;
  const last = points[points.length - 1]!;
  const dLat = last[0] - first[0];
  const dLng = last[1] - first[1];
  const len = Math.hypot(dLat, dLng);
  if (!len) return points;
  const amount = len * factor;
  const pLat = -dLng / len;
  const pLng = dLat / len;
  const n = points.length - 1;
  return points.map(([lat, lng], i) => {
    const taper = Math.sin(Math.PI * (i / n));
    return [lat + pLat * amount * taper, lng + pLng * amount * taper] as LatLng;
  });
}

function pointAt(points: LatLng[], t: number): LatLng {
  const n = points.length - 1;
  const pos = Math.max(0, Math.min(n, t * n));
  const idx = Math.min(n - 1, Math.floor(pos));
  const local = pos - idx;
  const [aLat, aLng] = points[idx]!;
  const [bLat, bLng] = points[idx + 1]!;
  return [aLat + (bLat - aLat) * local, aLng + (bLng - aLng) * local];
}

/** The sub-path from the start up to fraction `t` (inclusive of the cut point). */
function sliceAt(points: LatLng[], t: number): LatLng[] {
  const n = points.length - 1;
  const pos = t * n;
  const idx = Math.min(n - 1, Math.floor(pos));
  return [...points.slice(0, idx + 1), pointAt(points, t)];
}

/** Delivered — the driver ran the whole trip, bowed off the planned line. */
function drivenFull(o: Order): LatLng[] {
  return bow(routePoints(o), 0.14);
}

/**
 * Returned — the driver headed out, turned around partway, and drove back to the
 * depot. Rendered as an out-leg and a return-leg bowed to opposite sides so the
 * turnaround point is legible rather than a line doubled back on itself.
 */
function drivenReturnLoop(o: Order): LatLng[] {
  const base = routePoints(o);
  const turn = 0.62;
  const outLeg = sliceAt(bow(base, 0.14), turn);
  const backLeg = sliceAt(bow(base, -0.11), turn).reverse();
  return [...outLeg, ...backLeg];
}

interface RouteState {
  /** LETA's planned route — drawn once a driver has been assigned. */
  planned: boolean;
  /** The driver's actual path, if the attempt has concluded. */
  driven: 'none' | 'full' | 'return-loop';
  driver: boolean;
  failedDropoff: boolean;
  delivered: boolean;
}

function routeStateFor(o: Order): RouteState {
  const s = o.status;
  const base: RouteState = { planned: false, driven: 'none', driver: false, failedDropoff: false, delivered: false };
  if (DISPATCHED.includes(s)) {
    return { ...base, planned: true, driver: true, failedDropoff: s === 'returning' };
  }
  if (s === 'delivered') return { ...base, planned: true, driven: 'full', delivered: true };
  if (s === 'returned') return { ...base, planned: true, driven: 'return-loop', failedDropoff: true };
  if (s === 'cancelled') return { ...base, planned: !!o.tripId };
  return base;
}

/** Driver's mock position along the route, per status. */
function driverFraction(status: OrderStatus): number {
  switch (status) {
    case 'assigned': return 0.12;
    case 'at-depot': return 0.02;
    case 'in-transit': return 0.55;
    case 'arrived': return 0.97;
    case 'returning': return 0.6;
    default: return 0;
  }
}

/** Build the pin + driver marker specs for a given order state. */
function markerSpecs(o: Order): MapMarkerSpec[] {
  const rs = routeStateFor(o);
  const specs: MapMarkerSpec[] = [
    {
      id: 'depot',
      lat: o.pickup.lat,
      lng: o.pickup.lng,
      icon: { variant: 'badge', icon: 'Depot', color: 'var(--surface-primary-bg)' },
    },
    {
      id: 'dropoff',
      lat: o.dropoff.lat,
      lng: o.dropoff.lng,
      icon: rs.failedDropoff
        ? { variant: 'object-pin', icon: 'Cancel', color: 'var(--surface-error-bg)' }
        : rs.delivered
          ? { variant: 'object-pin', icon: 'Check', color: 'var(--surface-success-bg)' }
          : { variant: 'object-pin', icon: 'Location', color: 'var(--surface-secondary-bg)' },
    },
  ];
  if (rs.driver) {
    const [lat, lng] = pointAt(routePoints(o), driverFraction(o.status));
    specs.push({ id: 'driver', lat, lng, icon: { variant: 'bike-delivery' }, zIndexOffset: 500 });
  }
  return specs;
}

/**
 * **Map Card** (local Figma component `1454:207949`) — the white card affixed
 * above the depot / drop-off pins in expanded mode. 250×56, pad 8, radius 12,
 * gap 8; the leading tile is the design-system **`FeaturedIcon`** the Figma card
 * actually instances (`Property 1=Neutral, Size=Large`, 20px outlined glyph —
 * `Depot-Outline` / `Location-Outline`); title Label/S/SemiBold, address
 * Label/S/Regular, both truncated.
 */
function mapCardHtml(icon: IconName, name: string, address: string): string {
  return renderToStaticMarkup(
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: 'var(--padding-8px)',
        width: 250,
        height: 56,
        boxSizing: 'border-box',
        background: 'var(--surface-neutral-bg-default)',
        border: 'var(--stroke-xs) solid var(--border-neutral-default)',
        borderRadius: 'var(--rounding-xl)',
        boxShadow: 'var(--shadow-neutral-2)',
      }}
    >
      <FeaturedIcon icon={icon} color="neutral" size="large" outlined style={{ flexShrink: 0 }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
        <span
          className="text-label-s-semibold"
          style={{ color: 'var(--text-default-heading)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
        >
          {name}
        </span>
        <span
          className="text-label-s-regular"
          style={{ color: 'var(--text-default-sub-body)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
        >
          {address}
        </span>
      </div>
    </div>,
  );
}

const prefersReducedMotion = (): boolean =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;

/**
 * Draw one route as a two-layer trace (route micro-animation): a 60%-opacity
 * base always visible, plus a 100%-opacity segment that sweeps start→end over 2s
 * (looping) to imply direction. The tracer is a solid comet even over a dashed
 * base, so the dashed planned route still reads as a directional sweep. Reduced
 * motion → a single static full-opacity line. Returns the created polylines + any
 * Web-Animations handles so `decorate`'s cleanup can remove/cancel them.
 */
function traceRoute(
  L: typeof import('leaflet'),
  map: LeafletMap,
  latlngs: LatLng[],
  opts: { color: string; dashArray?: string; reduced: boolean; weight?: number },
  anims: Animation[],
): Polyline[] {
  const { color, dashArray, reduced, weight = ROUTE_WEIGHT } = opts;
  const lines: Polyline[] = [];
  const base = L.polyline(latlngs, {
    color,
    weight,
    opacity: reduced ? 1 : 0.6,
    ...(dashArray ? { dashArray } : {}),
  }).addTo(map);
  lines.push(base);
  if (reduced) return lines;

  const tracer = L.polyline(latlngs, { color, weight, opacity: 1 }).addTo(map);
  lines.push(tracer);
  // Set up the comet once the SVG path is actually measured — Leaflet adds the
  // path before the renderer flushes geometry, so getTotalLength() is 0 on the
  // first tick; retry on rAF until it's non-zero (bails if the path is removed).
  const setup = () => {
    const el = tracer.getElement() as (SVGPathElement & { animate?: Element['animate'] }) | null;
    if (!el || typeof el.getTotalLength !== 'function' || typeof el.animate !== 'function') return;
    const total = el.getTotalLength();
    if (total < 1) { requestAnimationFrame(setup); return; }
    const seg = Math.max(24, total * 0.4);
    el.style.strokeDasharray = `${seg} ${total}`;
    el.style.strokeLinecap = 'round';
    anims.push(
      el.animate(
        [{ strokeDashoffset: total + seg }, { strokeDashoffset: 0 }],
        { duration: 2000, iterations: Infinity, easing: 'linear' },
      ),
    );
  };
  requestAnimationFrame(setup);
  return lines;
}

/** Attach pins/routes/cards to a Leaflet map; returns a cleanup. */
function decorate(map: LeafletMap, order: Order, expanded: boolean, depotName: string, depotAddress: string): () => void {
  const rs = routeStateFor(order);
  const layer = new MarkerLayer(map);
  layer.sync(markerSpecs(order));

  const lines: Polyline[] = [];
  const anims: Animation[] = [];
  const infoMarkers: { remove: () => void }[] = [];
  const reduced = prefersReducedMotion();
  // Leaflet needs concrete colors — resolve the tokens at runtime.
  const planned = cssColor(PLANNED_COLOR, '#192037');
  const driven = cssColor(DRIVEN_COLOR, '#ff3941');

  void import('leaflet').then((L) => {
    const add = (pts: LatLng[], o: { color: string; dashArray?: string }) => {
      lines.push(...traceRoute(L, map, pts, { ...o, reduced }, anims));
    };
    // Planned route — LETA's route, dark dashed, drawn once a driver exists.
    if (rs.planned) add(routePoints(order), { color: planned, dashArray: PLANNED_DASH });
    // Driven route — red solid; a full run (Delivered) or an out-and-back loop
    // to the depot (Returned), bowed clear of the planned line.
    if (rs.driven === 'full') add(drivenFull(order), { color: driven });
    else if (rs.driven === 'return-loop') add(drivenReturnLoop(order), { color: driven });

    // Expanded mode: a Map Card affixed above the depot + drop-off pins.
    if (expanded) {
      const card = (lat: number, lng: number, html: string) =>
        L.marker([lat, lng], {
          // Anchor the card's bottom edge ~18px above the pin, horizontally centred.
          icon: L.divIcon({ html, className: 'leta-map-infocard', iconSize: [250, 56], iconAnchor: [125, 74] }),
          interactive: false,
          zIndexOffset: 400,
        }).addTo(map);
      infoMarkers.push(
        card(order.pickup.lat, order.pickup.lng, mapCardHtml('Depot', depotName, depotAddress)) as unknown as { remove: () => void },
        card(order.dropoff.lat, order.dropoff.lng, mapCardHtml('Location', order.customer, order.dropoff.label)) as unknown as { remove: () => void },
      );
    }

    // Frame both pins, leaving room for the fixed chrome (banner/legend/cards).
    const bounds = L.latLngBounds([
      [order.pickup.lat, order.pickup.lng],
      [order.dropoff.lat, order.dropoff.lng],
    ]);
    // `maxZoom` matters: a short trip (two pins a few hundred metres apart)
    // otherwise fits at max zoom, where OSM has no tiles and the map renders blank.
    if (expanded) map.fitBounds(bounds, { paddingTopLeft: [140, 130], paddingBottomRight: [140, 120], maxZoom: 16 });
    else map.fitBounds(bounds, { padding: [28, 28], maxZoom: 16 });
  });

  return () => {
    anims.forEach((a) => a.cancel());
    layer.clear();
    lines.forEach((l) => l.remove());
    infoMarkers.forEach((m) => m.remove());
  };
}

// ── Mini map (overview card, left half) ─────────────────────────────────────────

export function OrderMiniMap({
  order,
  depotName,
  depotAddress,
  onExpand,
}: {
  order: Order;
  depotName: string;
  depotAddress: string;
  onExpand: () => void;
}): React.ReactElement {
  const cleanupRef = React.useRef<(() => void) | null>(null);
  const handleReady = React.useCallback(
    (map: LeafletMap) => {
      // `onReady` can fire more than once (re-mount / StrictMode); without this
      // the previous decoration leaks and the map ends up with two sets of
      // routes at different pan offsets.
      cleanupRef.current?.();
      cleanupRef.current = null;
      // Static thumbnail behaviour — the expand affordance is the interaction.
      map.dragging.disable();
      map.scrollWheelZoom.disable();
      map.doubleClickZoom.disable();
      map.boxZoom.disable();
      map.keyboard.disable();
      const tap = (map as unknown as { tap?: { disable(): void } }).tap;
      if (tap) tap.disable();
      cleanupRef.current = decorate(map, order, false, depotName, depotAddress);
    },
    [order, depotName, depotAddress],
  );
  React.useEffect(() => () => cleanupRef.current?.(), []);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <MapView onReady={handleReady} showZoomControl={false} style={{ width: '100%', height: '100%' }} />
      {/* Expand control — top-right (§7.2 expanded map mode, every status). */}
      <div style={{ position: 'absolute', top: 16, right: 16, zIndex: 800 }}>
        <Button variant="secondary" size="small" iconOnly="Expand" aria-label="Expand map" onClick={onExpand} />
      </div>
    </div>
  );
}

// ── Expanded-map chrome (local Figma components) ────────────────────────────────

/**
 * **Map Fixed Banners** (local Figma component `1528:120794`) — per-status text
 * on a dark `--surface-secondary-bg` bar pinned top-centre of the expanded map,
 * with a trailing Plain link button (Dispatch / View Activity).
 */
interface BannerSpec { icon: IconName; text: string; cta: 'dispatch' | 'activity' }

function bannerFor(status: OrderStatus, driverName: string | null): BannerSpec {
  const who = driverName ?? 'The driver';
  switch (status) {
    case 'assigned':
      return { icon: 'Moving-Vehicle', text: `${who} is heading to the depot.`, cta: 'dispatch' };
    case 'at-depot':
      return { icon: 'Pickup', text: `${who} is at the depot.`, cta: 'activity' };
    case 'in-transit':
      return { icon: 'Moving-Vehicle', text: `${who} is heading to the drop-off.`, cta: 'activity' };
    case 'arrived':
      return { icon: 'Drop-Off', text: `${who} has arrived at the drop-off.`, cta: 'activity' };
    case 'returning':
      return { icon: 'Moving-Vehicle', text: `${who} is returning to the depot.`, cta: 'activity' };
    case 'delivered':
      return { icon: 'Check-Circle', text: `${who} has delivered this order.`, cta: 'activity' };
    case 'cancelled':
      return {
        icon: 'Cancel-Circle',
        text: driverName ? `${driverName} cancelled this order.` : 'This order was cancelled.',
        cta: 'activity',
      };
    case 'returned':
      return { icon: 'Info', text: 'Dispatch to generate a new delivery route.', cta: 'dispatch' };
    default:
      // Scheduled / Pending / Broadcasted — no route exists yet.
      return { icon: 'Info', text: 'Dispatch to generate a delivery route.', cta: 'dispatch' };
  }
}

function MapFixedBanner({ spec, onCta }: { spec: BannerSpec; onCta: () => void }): React.ReactElement {
  return (
    <div
      style={{
        position: 'absolute',
        top: 16,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 800,
        boxSizing: 'border-box',
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--spacing-16px)',
        width: 480,
        maxWidth: 'calc(100% - 96px)',
        height: 44,
        padding: 'var(--padding-12px) var(--padding-16px)',
        borderRadius: 'var(--rounding-lg)',
        backgroundColor: 'var(--surface-secondary-bg)',
        boxShadow: 'var(--shadow-neutral-2)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-8px)', flex: 1, minWidth: 0 }}>
        <span style={{ display: 'flex', flexShrink: 0, color: 'var(--text-on-color-label)' }}>
          <Icon name={spec.icon} outlined={false} size={18} />
        </span>
        <span
          className="text-body-m-regular"
          style={{ color: 'var(--text-on-color-label)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
        >
          {spec.text}
        </span>
      </div>
      <div style={{ width: 0, height: 20, borderLeft: 'var(--stroke-xs) solid var(--border-neutral-default)', flexShrink: 0 }} />
      <Button
        variant="plain"
        size="small"
        onClick={onCta}
        // Plain's label token is dark by default; this banner is a dark surface.
        style={{
          '--leta-btn-text': 'var(--text-on-color-label)',
          '--leta-btn-text-hover': 'var(--text-on-color-label)',
          '--leta-btn-text-pressed': 'var(--text-on-color-label)',
        } as React.CSSProperties}
      >
        {spec.cta === 'dispatch' ? 'Dispatch' : 'View Activity'}
      </Button>
    </div>
  );
}

/**
 * **Map Legend** (local Figma component `1528:119929`) — a pill bottom-centre
 * keying the route lines. "1 Route" while only the planned route is drawn;
 * "2 Routes" once a driven route exists (Delivered / Returned). Hidden when no
 * route is drawn at all (pre-dispatch, cancelled-before-dispatch).
 */
function LegendItem({ color, dashed, label }: { color: string; dashed: boolean; label: string }): React.ReactElement {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-8px)' }}>
      <svg width={32} height={2} aria-hidden style={{ flexShrink: 0, overflow: 'visible' }}>
        <line x1="0" y1="1" x2="32" y2="1" stroke={color} strokeWidth={1} {...(dashed ? { strokeDasharray: '3 3' } : {})} />
      </svg>
      <span className="text-label-s-medium" style={{ color: 'var(--text-default-label)', whiteSpace: 'nowrap' }}>{label}</span>
    </div>
  );
}

function MapLegend({ showDriven }: { showDriven: boolean }): React.ReactElement {
  return (
    <div
      style={{
        position: 'absolute',
        bottom: 16,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 800,
        boxSizing: 'border-box',
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--spacing-16px)',
        height: 40,
        padding: 'var(--padding-10px) var(--padding-16px)',
        borderRadius: 'var(--rounding-round)',
        backgroundColor: 'var(--surface-neutral-bg-default)',
        border: 'var(--stroke-xs) solid var(--border-neutral-default)',
        boxShadow: 'var(--shadow-neutral-2)',
      }}
    >
      <LegendItem color={`var(${PLANNED_COLOR})`} dashed label="Planned Route" />
      {showDriven && (
        <>
          <div style={{ width: 0, height: 20, borderLeft: 'var(--stroke-xs) solid var(--border-neutral-default)' }} />
          <LegendItem color={`var(${DRIVEN_COLOR})`} dashed={false} label="Driven Route" />
        </>
      )}
    </div>
  );
}

// ── Expanded map overlay (fullscreen dimmed, 768×768 panel) ─────────────────────

export function ExpandedMapOverlay({
  order,
  depotName,
  depotAddress,
  driverName,
  onDispatch,
  onViewActivity,
  onClose,
}: {
  order: Order;
  depotName: string;
  depotAddress: string;
  driverName: string | null;
  onDispatch: () => void;
  onViewActivity: () => void;
  onClose: () => void;
}): React.ReactElement {
  const cleanupRef = React.useRef<(() => void) | null>(null);
  const timersRef = React.useRef<ReturnType<typeof setTimeout>[]>([]);
  const handleReady = React.useCallback(
    (map: LeafletMap) => {
      // Guard against a second `onReady` (re-mount / StrictMode) leaving a
      // stale decoration behind — see the mini map's note.
      cleanupRef.current?.();
      cleanupRef.current = null;
      timersRef.current.forEach(clearTimeout);
      // The overlay mounts mid-transition — Leaflet can measure the container
      // early, leaving blank tiles + a mis-framed viewport. Re-measure once
      // painted and once post-transition, THEN decorate (whose fitBounds must
      // run against the final size, or a pin lands out of frame).
      timersRef.current = [
        setTimeout(() => map.invalidateSize(), 50),
        setTimeout(() => {
          map.invalidateSize();
          cleanupRef.current?.();
          cleanupRef.current = decorate(map, order, true, depotName, depotAddress);
        }, 420),
      ];
    },
    [order, depotName, depotAddress],
  );
  React.useEffect(
    () => () => {
      timersRef.current.forEach(clearTimeout);
      cleanupRef.current?.();
    },
    [],
  );

  // Escape closes the overlay (it renders above the drawer).
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onClose]);

  const rs = routeStateFor(order);
  const spec = bannerFor(order.status, driverName);
  const anyRoute = rs.planned || rs.driven !== 'none';

  return (
    <>
      <div aria-hidden onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(16,16,16,0.4)', zIndex: 1700 }} />
      <div
        role="dialog"
        aria-label="Expanded order map"
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 768,
          height: 768,
          maxWidth: 'calc(100vw - 48px)',
          maxHeight: 'calc(100dvh - 48px)',
          borderRadius: 'var(--rounding-xl)',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-neutral-3)',
          backgroundColor: 'var(--surface-neutral-bg-default)',
          zIndex: 1701,
        }}
      >
        {/* MapView overlays the DS MapZoomControl bottom-right (its default). */}
        <MapView onReady={handleReady} style={{ width: '100%', height: '100%' }} />
        {/* Collapse — mirrors the mini map's expand control. */}
        <div style={{ position: 'absolute', top: 16, right: 16, zIndex: 800 }}>
          <Button variant="secondary" size="small" iconOnly="Collapse" aria-label="Collapse map" onClick={onClose} />
        </div>
        <MapFixedBanner spec={spec} onCta={spec.cta === 'dispatch' ? onDispatch : onViewActivity} />
        {anyRoute && <MapLegend showDriven={rs.driven !== 'none'} />}
      </div>
    </>
  );
}

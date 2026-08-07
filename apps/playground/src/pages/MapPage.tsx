import * as React from 'react';
import type { Map as LeafletMap } from 'leaflet';
import { MapView } from '@leta-io/components';
import { useStore } from '../store/useStore.js';
import type { DriverStatus } from '../store/types.js';
import { MarkerLayer, type MapMarkerSpec } from '../shell/mapMarkers.js';

const ACTIVE_ORDER = (status: string) =>
  status !== 'delivered' && status !== 'cancelled' && status !== 'returned';

function driverColor(status: DriverStatus): string {
  if (status === 'available') return 'var(--icons-success-default)';
  if (status === 'busy') return 'var(--icons-warning-default)';
  return 'var(--icons-neutral-default)';
}

/**
 * Live Map (Phase-0 verification surface). Full-bleed `MapView` with driver
 * markers + active-order pickup markers added via the `MarkerLayer` helper.
 * Clicking a marker pushes a toast — proving Leaflet, the div-icon rendering, and
 * marker click handlers all work. The dispatch flow is built in Phase 1.
 */
export function MapPage(): React.ReactElement {
  const drivers = useStore((s) => s.drivers);
  const orders = useStore((s) => s.orders);
  const pushToast = useStore((s) => s.pushToast);

  const specs = React.useMemo<MapMarkerSpec[]>(() => {
    const driverSpecs: MapMarkerSpec[] = drivers.map((d) => ({
      id: `driver-${d.id}`,
      lat: d.location.lat,
      lng: d.location.lng,
      icon: { variant: 'badge', icon: 'Motorcycle', color: driverColor(d.status) },
      onClick: () =>
        pushToast({ type: 'success', title: d.name, subtitle: `${d.vehicle} · ${d.status}` }),
    }));
    const orderSpecs: MapMarkerSpec[] = orders
      .filter((o) => ACTIVE_ORDER(o.status))
      .map((o) => ({
        id: `order-${o.id}`,
        lat: o.pickup.lat,
        lng: o.pickup.lng,
        icon: { variant: 'numeric-pin', text: String(o.items) },
        onClick: () =>
          pushToast({ type: 'warning', title: o.id, subtitle: `${o.customer} · ${o.pickup.label}` }),
      }));
    return [...driverSpecs, ...orderSpecs];
  }, [drivers, orders, pushToast]);

  const layerRef = React.useRef<MarkerLayer | null>(null);
  const specsRef = React.useRef(specs);
  specsRef.current = specs;

  const handleReady = React.useCallback((map: LeafletMap) => {
    layerRef.current = new MarkerLayer(map);
    layerRef.current.sync(specsRef.current);
  }, []);

  React.useEffect(() => {
    layerRef.current?.sync(specs);
  }, [specs]);

  return (
    <div style={{ position: 'relative', height: '100%', width: '100%' }}>
      <MapView center={[-1.286, 36.817]} zoom={12} onReady={handleReady} />
    </div>
  );
}

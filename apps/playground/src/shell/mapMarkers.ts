import * as L from 'leaflet';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MapIcon, type MapIconProps, type MapIconVariant } from '@leta-io/components';

/**
 * Map-marker integration for `MapView`.
 *
 * `MapView` exposes only `onReady(map)` (no marker prop), so screens add markers
 * directly to the Leaflet instance. This helper renders the design-system
 * `<MapIcon>` to static HTML and wraps it in a Leaflet `divIcon`, then a tiny
 * `MarkerLayer` keeps a set of markers in sync with store data (add / move /
 * remove + click handlers). Every map screen uses this identically.
 */

export interface MapMarkerSpec {
  /** Stable id (e.g. driver/order id) — used to diff on update. */
  id: string;
  lat: number;
  lng: number;
  /** MapIcon props (variant, color, text, icon). */
  icon: MapIconProps;
  /** Click handler for the marker. */
  onClick?: () => void;
  /** Raise above siblings (e.g. a selected marker). */
  zIndexOffset?: number;
}

/** Per-variant divIcon sizing + anchor (tip for pins, centre for badges). */
const VARIANT_GEOMETRY: Record<
  MapIconVariant,
  { size: [number, number]; anchor: [number, number] }
> = {
  'object-pin': { size: [26, 32], anchor: [13, 32] },
  'numeric-pin': { size: [26, 32], anchor: [13, 32] },
  'event-pin': { size: [32, 32], anchor: [16, 32] },
  badge: { size: [32, 32], anchor: [16, 16] },
  'bike-delivery': { size: [19, 32], anchor: [10, 32] },
};

export function mapIconDivIcon(props: MapIconProps): L.DivIcon {
  const geom = VARIANT_GEOMETRY[props.variant];
  const html = renderToStaticMarkup(createElement(MapIcon, props));
  return L.divIcon({
    html,
    className: 'leta-map-marker',
    iconSize: geom.size,
    iconAnchor: geom.anchor,
  });
}

/**
 * A managed set of markers on one map. Call `sync(specs)` whenever the source
 * data changes; markers are added / updated / removed by `id`.
 */
export class MarkerLayer {
  private map: L.Map;
  private markers = new Map<string, L.Marker>();

  constructor(map: L.Map) {
    this.map = map;
  }

  sync(specs: MapMarkerSpec[]): void {
    const next = new Set(specs.map((s) => s.id));

    // Remove stale markers.
    for (const [id, marker] of this.markers) {
      if (!next.has(id)) {
        marker.remove();
        this.markers.delete(id);
      }
    }

    // Add / update.
    for (const spec of specs) {
      const existing = this.markers.get(spec.id);
      const icon = mapIconDivIcon(spec.icon);
      if (existing) {
        existing.setLatLng([spec.lat, spec.lng]);
        existing.setIcon(icon);
        existing.setZIndexOffset(spec.zIndexOffset ?? 0);
        existing.off('click');
        if (spec.onClick) existing.on('click', spec.onClick);
      } else {
        const marker = L.marker([spec.lat, spec.lng], {
          icon,
          zIndexOffset: spec.zIndexOffset ?? 0,
        }).addTo(this.map);
        if (spec.onClick) marker.on('click', spec.onClick);
        this.markers.set(spec.id, marker);
      }
    }
  }

  clear(): void {
    for (const marker of this.markers.values()) marker.remove();
    this.markers.clear();
  }
}

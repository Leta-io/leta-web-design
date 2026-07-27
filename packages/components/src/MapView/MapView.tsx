import * as React from 'react';
import type { Map as LeafletMap } from 'leaflet';
import { MapZoomControl } from '../MapZoomControl/MapZoomControl.js';

/** Leaflet version — keep in sync with the `leaflet` dependency in package.json. */
const LEAFLET_VERSION = '1.9.4';
const LEAFLET_CSS_ID = 'leta-leaflet-css';

/**
 * Inject Leaflet's stylesheet once (runtime, CDN-pinned to the installed version)
 * — matching the design system's runtime-style-injection convention rather than a
 * build-time CSS import (which `tsup` doesn't bundle).
 */
function ensureLeafletCss(): void {
  if (typeof document === 'undefined' || document.getElementById(LEAFLET_CSS_ID)) return;
  const link = document.createElement('link');
  link.id = LEAFLET_CSS_ID;
  link.rel = 'stylesheet';
  link.href = `https://unpkg.com/leaflet@${LEAFLET_VERSION}/dist/leaflet.css`;
  document.head.appendChild(link);
}

export interface MapViewProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onLoad'> {
  /** Map centre as `[latitude, longitude]`. Default Nairobi (`[-1.286, 36.817]`). */
  center?: [number, number];
  /** Initial zoom level. Default 14. */
  zoom?: number;
  /** Minimum zoom level. Default 3. */
  minZoom?: number;
  /** Maximum zoom level. Default 19 (OSM raster max). */
  maxZoom?: number;
  /** Raster tile URL template. Default OpenStreetMap standard tiles. */
  tileUrl?: string;
  /** Tile attribution HTML. Default the OSM contributors notice (required by the OSM tile policy). */
  attribution?: string;
  /** Show the overlaid `<MapZoomControl>` (bottom-right). Default true. */
  showZoomControl?: boolean;
  /** Fired (after) the Leaflet map instance is created. */
  onReady?: (map: LeafletMap) => void;
}

const OSM_TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const OSM_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

/**
 * Map View — the LETA standard interactive map primitive. A **Leaflet** map
 * (OpenStreetMap raster tiles, no API key) with the design system's
 * {@link MapZoomControl} overlaid bottom-right and wired to drive the map's zoom
 * (Leaflet's own zoom control is disabled). Pan by drag, zoom by wheel / the
 * control; the zoom buttons disable at the min/max zoom.
 *
 * **Standard:** this is the canonical map surface for every LETA map view (e.g.
 * the Extra Large Modal picker) **until a more robust provider (e.g. Google Maps)
 * is adopted** — swap the internals here and every consumer updates.
 *
 * Leaflet is loaded client-side (dynamic import) so it is SSR-safe; its CSS is
 * injected at runtime (CDN-pinned). Requires network access for tiles.
 *
 * **When to use:** any embedded geographic map (route assignment, delivery
 * tracking, location pickers).
 * **When NOT to use:** a static location thumbnail (use an image) or the Map
 * Icon markers in isolation.
 */
export const MapView = React.forwardRef<HTMLDivElement, MapViewProps>(function MapView(
  {
    center = [-1.286, 36.817],
    zoom = 14,
    minZoom = 3,
    maxZoom = 19,
    tileUrl = OSM_TILE_URL,
    attribution = OSM_ATTRIBUTION,
    showZoomControl = true,
    onReady,
    style,
    ...rest
  },
  ref,
) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const mapRef = React.useRef<LeafletMap | null>(null);
  const [canZoomIn, setCanZoomIn] = React.useState(true);
  const [canZoomOut, setCanZoomOut] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    ensureLeafletCss();

    // Client-side dynamic import keeps Leaflet (which touches `window`) out of SSR.
    import('leaflet').then((L) => {
      if (cancelled || !containerRef.current || mapRef.current) return;

      const map = L.map(containerRef.current, {
        center,
        zoom,
        minZoom,
        maxZoom,
        zoomControl: false, // we use the design-system MapZoomControl instead
        attributionControl: true,
      });
      L.tileLayer(tileUrl, { attribution, minZoom, maxZoom }).addTo(map);
      mapRef.current = map;

      const syncZoom = () => {
        const z = map.getZoom();
        setCanZoomIn(z < maxZoom);
        setCanZoomOut(z > minZoom);
      };
      syncZoom();
      map.on('zoomend', syncZoom);

      // Leaflet needs a size recalculation once the container has its final box.
      requestAnimationFrame(() => map.invalidateSize());
      onReady?.(map);
    });

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
    // Mount-only: the map instance is created once; prop changes after mount are
    // out of scope for this primitive (recreate via `key` if needed).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={ref}
      style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', ...style }}
      {...rest}
    >
      {/* Backdrop behind the tiles while they load. `--surface-neutral-bg-muted`
          is the real grey token — `--surface-neutral-bg-tertiary` does not exist
          and silently resolved to transparent (cf. the `bg-primary` gotcha). */}
      <div ref={containerRef} style={{ position: 'absolute', inset: 0, backgroundColor: 'var(--surface-neutral-bg-muted)' }} />
      {showZoomControl && (
        <div style={{ position: 'absolute', bottom: 16, right: 16, zIndex: 500 }}>
          <MapZoomControl
            onZoomIn={() => mapRef.current?.zoomIn()}
            onZoomOut={() => mapRef.current?.zoomOut()}
            disableZoomIn={!canZoomIn}
            disableZoomOut={!canZoomOut}
          />
        </div>
      )}
    </div>
  );
});

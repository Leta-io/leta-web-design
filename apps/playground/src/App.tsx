import * as React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './shell/AppShell.js';
import { ComingSoonPage } from './pages/ComingSoonPage.js';
import { AdminPage } from './pages/admin/AdminPage.js';

// Route-level code splitting: MapPage pulls in Leaflet (a large dependency
// only needed on /map), and OrdersPage pulls in the heaviest DesktopDropdowns/
// DateTimePicker popovers. Lazy-loading both keeps either from bloating the
// initial bundle the browser must parse before first paint.
const OrdersPage = React.lazy(() => import('./pages/OrdersPage.js').then((m) => ({ default: m.OrdersPage })));
const MapPage = React.lazy(() => import('./pages/MapPage.js').then((m) => ({ default: m.MapPage })));

/**
 * Playground routes. The four functional flow routes (`/orders`, `/orders/new`,
 * `/orders/:id`, `/map`) currently render Phase-0 placeholders (MapPage is real);
 * each is replaced by its wireframe-driven screen in Phase 1. Decorative nav
 * destinations render a "coming soon" empty state.
 */
export function App(): React.ReactElement {
  return (
    <Routes>
      {/* Redirect the index OUTSIDE the layout so the shell (and SideBar) first
          mounts at /orders with the correct active item — no remount needed. */}
      <Route path="/" element={<Navigate to="/orders" replace />} />
      <Route element={<AppShell />}>
        <Route
          path="/orders"
          element={
            <React.Suspense fallback={null}>
              <OrdersPage />
            </React.Suspense>
          }
        />
        <Route path="/orders/new" element={<ComingSoonPage />} />
        <Route path="/orders/:id" element={<ComingSoonPage />} />
        <Route
          path="/map"
          element={
            <React.Suspense fallback={null}>
              <MapPage />
            </React.Suspense>
          }
        />
        <Route path="/dashboard" element={<ComingSoonPage />} />
        <Route path="/fleet" element={<ComingSoonPage />} />
        <Route path="/team" element={<ComingSoonPage />} />
        <Route path="/depots" element={<ComingSoonPage />} />
        {/* Admin (sidebar "Admin") — the client-configuration module. */}
        <Route path="/settings" element={<AdminPage />} />
        <Route path="/integrations" element={<ComingSoonPage />} />
        <Route path="*" element={<Navigate to="/orders" replace />} />
      </Route>
    </Routes>
  );
}

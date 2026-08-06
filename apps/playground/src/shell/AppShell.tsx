import * as React from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import type { IconName } from '@leta/icons';
import {
  SideBar,
  TopBar,
  Breadcrumbs,
  Toast,
  Button,
  type SideBarGroup,
  type BreadcrumbCrumb,
} from '@leta/components';
import { useStore } from '../store/useStore.js';
import { CURRENT_USER } from '../store/currentUser.js';
import { UserMenuDropdown } from '../components/UserMenuDropdown.js';
import { ClientSwitcherDropdown } from '../components/ClientSwitcherDropdown.js';

/**
 * AppShell — the persistent chrome for every playground screen, mirroring the
 * design-system `Page` (`9626:14490`) structure: a collapsed `SideBar` rail beside
 * a viewport of a fixed `TopBar` and a body that hosts the routed `<Outlet/>`.
 *
 * `Page` is presentational (hardcoded SideBar/TopBar, no routing), so we can't
 * render it directly — instead AppShell composes the same organisms with routing
 * wired in, and each routed page mirrors Page's body structure (pad [24,24,0,24],
 * gap 24, the table region reserving a 16px bottom gap).
 *
 * The `TopBar` uses a **global-admin** breadcrumb whose root chip is the active
 * client (Acme Corp) — the future client-instance switcher. The avatar opens the
 * `UserMenuDropdown`. A global toast region sits top-right (Doc 3 §4).
 */

interface NavEntry {
  label: string;
  icon: IconName;
  path: string;
}

/** Nav groups + footer mirror the wireframe's "Global Components" Side Bar. */
const NAV_GROUPS: { label?: string; items: NavEntry[] }[] = [
  {
    items: [
      { label: 'Dashboard', icon: 'Dashboard', path: '/dashboard' },
      { label: 'Deliveries', icon: 'Open-Box', path: '/orders' },
      { label: 'Live Map', icon: 'Map', path: '/map' },
      { label: 'Fleet', icon: 'Truck', path: '/fleet' },
      { label: 'Team', icon: 'Team', path: '/team' },
    ],
  },
  {
    label: 'Management',
    items: [
      { label: 'Depots', icon: 'Depot', path: '/depots' },
      // "Admin", not "Settings" (renamed 2026-08-05, matching the Figma wireframes) —
      // the module holds tenant administration, not just preferences. The route keeps
      // its `/settings` path for now so existing links don't break.
      { label: 'Admin', icon: 'Settings', path: '/settings' },
      { label: 'Integrations', icon: 'Integration', path: '/integrations' },
    ],
  },
];

/** A route belongs to a nav entry if it equals or is nested under that entry's path. */
function isActivePath(entryPath: string, pathname: string): boolean {
  return pathname === entryPath || pathname.startsWith(entryPath + '/');
}

/** Build the global-admin breadcrumb trail (ancestor links + current) for the route. */
function useBreadcrumbTrail(): { items: BreadcrumbCrumb[]; current: string } {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const entry = NAV_GROUPS.flatMap((g) => g.items).find((e) => isActivePath(e.path, pathname));
  const sectionLabel = entry?.label ?? 'Home';

  if (entry?.path === '/orders' && pathname !== '/orders') {
    const sub = pathname.replace('/orders/', '');
    const current = sub === 'new' ? 'New Order' : sub.toUpperCase();
    return { items: [{ label: 'Deliveries', onClick: () => navigate('/orders') }], current };
  }

  return { items: [], current: sectionLabel };
}

// Doc 3 §4: top-right placement. Toasts slide IN from the right edge (they arrive
// from off-screen right, not down from the top) on a gentle ease-out, and slide
// back out to the right on a softer, quicker ease-in (exits stay subtle per the
// interface-polish convention).
const TOAST_MOTION_ID = 'leta-toast-motion';
const TOAST_CSS = `
@keyframes leta-toast-in {
  from { opacity: 0; transform: translateX(calc(100% + 24px)); }
  to   { opacity: 1; transform: translateX(0); }
}
@keyframes leta-toast-out {
  from { opacity: 1; transform: translateX(0); }
  to   { opacity: 0; transform: translateX(calc(100% + 24px)); }
}
.leta-toast-enter { animation: leta-toast-in 320ms cubic-bezier(0.16, 1, 0.3, 1); will-change: transform, opacity; }
/* 'forwards' holds the off-screen end frame until the deferred store removal lands. */
.leta-toast-exit { animation: leta-toast-out 240ms cubic-bezier(0.4, 0, 1, 1) forwards; will-change: transform, opacity; }
@media (prefers-reduced-motion: reduce) { .leta-toast-enter, .leta-toast-exit { animation: none; } }
`;
function ensureToastStyles(): void {
  if (typeof document === 'undefined' || document.getElementById(TOAST_MOTION_ID)) return;
  const el = document.createElement('style');
  el.id = TOAST_MOTION_ID;
  el.textContent = TOAST_CSS;
  document.head.appendChild(el);
}

/**
 * Top-right transient toast stack, driven by the store (Doc 3 §4). Toasts
 * append to the end of `s.toasts` (oldest-first) — rendered in REVERSE so the
 * newest lands nearest the top-right corner and the stack grows downward.
 */
function ToastRegion(): React.ReactElement {
  const toasts = useStore((s) => s.toasts);
  const dismissToast = useStore((s) => s.dismissToast);
  ensureToastStyles();

  // Dismissal (auto-timeout or the ×) plays the exit animation first: the toast
  // is marked exiting, and the store removal is deferred until the animation has
  // run. Guards against double-dismiss (× during the auto-timeout, etc.).
  const [exiting, setExiting] = React.useState<ReadonlySet<string>>(() => new Set());
  const exitTimersRef = React.useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const beginExit = (id: string) => {
    if (exitTimersRef.current.has(id)) return;
    setExiting((prev) => new Set(prev).add(id));
    exitTimersRef.current.set(
      id,
      setTimeout(() => {
        exitTimersRef.current.delete(id);
        setExiting((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        dismissToast(id);
      }, 240), // matches the leta-toast-out slide-out duration
    );
  };
  React.useEffect(() => {
    const timers = exitTimersRef.current;
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div
      style={{
        position: 'fixed',
        top: 24,
        right: 24,
        // Toasts are global feedback and must render above every drawer/overlay
        // in the app — the View Order drawer's panel is 1500/1501, its proof
        // viewers 1700/1701, so this needs to clear all of them.
        zIndex: 1800,
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--spacing-12px)',
        pointerEvents: 'none',
      }}
    >
      {[...toasts].reverse().map((t) => (
        <div
          key={t.id}
          className={exiting.has(t.id) ? 'leta-toast-exit' : 'leta-toast-enter'}
          style={{ pointerEvents: 'auto' }}
        >
          <Toast
            type={t.type}
            title={t.title}
            subtitle={t.subtitle}
            showSubtitle={Boolean(t.subtitle)}
            showCTA={Boolean(t.cta)}
            // Doc 3 §4: 6s default, 8s when the toast carries an action.
            duration={t.cta ? 8000 : 6000}
            onDismiss={() => beginExit(t.id)}
          >
            {t.cta ? (
              <Button
                variant="secondary"
                size="medium"
                onClick={() => {
                  t.cta?.onClick();
                  beginExit(t.id);
                }}
              >
                {t.cta.label}
              </Button>
            ) : undefined}
          </Toast>
        </div>
      ))}
    </div>
  );
}

export function AppShell(): React.ReactElement {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const client = useStore((s) => s.client);
  const pushToast = useStore((s) => s.pushToast);
  const { items: crumbItems, current: crumbCurrent } = useBreadcrumbTrail();

  // User-menu overlay anchored to the clicked avatar (rect from the focused trigger).
  const [userMenuAnchor, setUserMenuAnchor] = React.useState<DOMRect | null>(null);
  // Client-switcher overlay anchored to the breadcrumb client chip.
  const [clientMenuAnchor, setClientMenuAnchor] = React.useState<DOMRect | null>(null);

  const groups: SideBarGroup[] = NAV_GROUPS.map((g) => ({
    label: g.label,
    items: g.items.map((e) => ({
      label: e.label,
      leadingIcon: e.icon,
      active: isActivePath(e.path, pathname),
    })),
  }));

  const handleItemClick = (groupIndex: number, itemIndex: number) => {
    if (groupIndex < 0) {
      // Footer items (Help Center / Get the Dispatch App) — placeholder for now.
      pushToast({ type: 'success', title: 'Coming soon', subtitle: 'This link is in progress.' });
      return;
    }
    const entry = NAV_GROUPS[groupIndex]?.items[itemIndex];
    if (entry) navigate(entry.path);
  };

  // Breadcrumb client chip fires `onClientClick` (no event) — read the focused
  // trigger's rect so the switcher Popover anchors to the chip.
  const handleClientClick = () => {
    if (clientMenuAnchor) {
      setClientMenuAnchor(null);
      return;
    }
    const el = document.activeElement as HTMLElement | null;
    setClientMenuAnchor(el ? el.getBoundingClientRect() : null);
  };

  // The TopBar avatar fires `onUserMenuClick` (no event) — read the focused
  // trigger's rect so the Popover anchors to the avatar.
  const handleUserMenuClick = () => {
    if (userMenuAnchor) {
      setUserMenuAnchor(null);
      return;
    }
    const el = document.activeElement as HTMLElement | null;
    setUserMenuAnchor(el ? el.getBoundingClientRect() : null);
  };

  return (
    <div
      style={{
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'row',
        width: '100%',
        height: '100dvh',
        backgroundColor: 'var(--surface-neutral-page-primary)',
        overflow: 'hidden',
      }}
    >
      {/* Collapsed Side Bar rail (matches Page); expandable via its logo toggle. */}
      <SideBar
        variant="collapsed"
        groups={groups}
        onItemClick={handleItemClick}
        style={{ flexShrink: 0 }}
      />

      {/* Viewport — fixed Top Bar + a viewport-filling body (no page scroll). */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ flexShrink: 0 }}>
          <TopBar
            left={
              <Breadcrumbs
                type="global-admin"
                client={client.name}
                onClientClick={handleClientClick}
                items={crumbItems}
                current={crumbCurrent}
              />
            }
            user={{ name: CURRENT_USER.name, tone: CURRENT_USER.tone, avatarSrc: CURRENT_USER.avatarSrc }}
            onNotificationsClick={() => {}}
            onUserMenuClick={handleUserMenuClick}
          />
        </div>

        {/* Body — fills the viewport; each route owns its own padding/scroll
            (data pages mirror the Page body padding; the map is full-bleed). */}
        <main style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <Outlet />
        </main>
      </div>

      {/* User menu dropdown — portal-positioned below the TopBar avatar. */}
      <UserMenuDropdown anchorRect={userMenuAnchor} onClose={() => setUserMenuAnchor(null)} />

      {/* Account switcher — portal-positioned below the breadcrumb client chip. */}
      <ClientSwitcherDropdown anchorRect={clientMenuAnchor} onClose={() => setClientMenuAnchor(null)} />

      <ToastRegion />
    </div>
  );
}

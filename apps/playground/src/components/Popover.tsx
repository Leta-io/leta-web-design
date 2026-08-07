import * as React from 'react';
import { createPortal } from 'react-dom';
import { useEscapeLayer } from '@leta-io/components';

export type PopoverPlacement = 'bottom-start' | 'bottom-end' | 'top-start' | 'top-end';

// Restrained enter motion for overlays — a quick fade + subtle rise/scale from the
// trigger edge. Uses an ease-out curve and a short duration to feel responsive, not
// flashy (design-system app). Honours reduced-motion preferences.
const POPOVER_STYLE_ID = 'leta-popover-motion';
const POPOVER_CSS = `
@keyframes leta-popover-in {
  from { opacity: 0; transform: translateY(-6px) scale(0.98); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes leta-popover-out {
  from { opacity: 1; transform: translateY(0) scale(1); }
  to   { opacity: 0; transform: translateY(-4px) scale(0.98); }
}
.leta-popover-panel { animation: leta-popover-in 140ms cubic-bezier(0.16, 1, 0.3, 1); will-change: transform, opacity; }
.leta-popover-panel.exiting { animation: leta-popover-out 100ms cubic-bezier(0.4, 0, 1, 1) forwards; }
@media (prefers-reduced-motion: reduce) { .leta-popover-panel, .leta-popover-panel.exiting { animation: none; } }
/* Scrollable dropdown lists show NO scrollbar chrome — the scroll affordance is the
   list height instead: it's sized so the last visible option is partially cut off. */
.leta-popover-list { scrollbar-width: none; -ms-overflow-style: none; }
.leta-popover-list::-webkit-scrollbar { display: none; width: 0; height: 0; }
`;
function ensurePopoverStyles(): void {
  if (typeof document === 'undefined' || document.getElementById(POPOVER_STYLE_ID)) return;
  const el = document.createElement('style');
  el.id = POPOVER_STYLE_ID;
  el.textContent = POPOVER_CSS;
  document.head.appendChild(el);
}

interface PopoverProps {
  /** The trigger's bounding rect (e.g. from `el.getBoundingClientRect()`). */
  anchorRect: DOMRect | null;
  onClose: () => void;
  placement?: PopoverPlacement;
  /** Gap between the trigger and the panel. Default 4px. */
  offset?: number;
  children: React.ReactNode;
}

// Doc 3 §1: "Only one dropdown may be open at a time, platform-wide" — a new
// Popover force-closes whichever OTHER Popover was previously open, however
// far apart in the component tree the two triggers are (a table dropdown vs.
// the Top Bar's user-menu/client-switcher, which each keep their own React
// state). This is a single shared owner across every Popover instance in the
// app — deliberately module-level, not context-based, since a React context
// would still require every trigger to share a common provider.
let currentOwner: symbol | null = null;
let currentForceClose: (() => void) | null = null;

/**
 * Popover — a portal-based overlay positioned from a trigger's bounding rect.
 *
 * Renders into `document.body` (escaping any ancestor stacking context — e.g. the
 * Table's bordered/overflow card that previously buried dropdowns *under* page
 * content) with a click-catching backdrop and a `zIndex` above the Toast region
 * (1000) and the fixed Bulk Actions Toolbar (50).
 *
 * The panel is unstyled — the caller supplies a design-system surface
 * (`DesktopDropdowns` / `DateTimePicker` render their own chrome; composed
 * `DesktopMenuOptions` menus use {@link MenuPanel}). The panel is clamped to the
 * viewport and flips above the trigger when it would overflow the bottom edge.
 *
 * **Single-open (Doc 3 §1):** opening a Popover force-closes any other open
 * Popover, platform-wide. **Escape (Doc 3 §10):** registered on the shared
 * `@leta-io/components` overlay stack, so Escape closes only the topmost overlay
 * even when a Popover is nested inside a modal/drawer. **Focus-return (Doc 3
 * §1.3/§10):** the element focused at the moment this Popover opened (almost
 * always its trigger — clicking a button focuses it) regains focus once the
 * Popover closes, however it closed.
 */
export function Popover({
  anchorRect,
  onClose,
  placement = 'bottom-start',
  offset = 4,
  children,
}: PopoverProps): React.ReactElement | null {
  const panelRef = React.useRef<HTMLDivElement>(null);
  // `top` for below placements (top-anchored); `bottom` for above placements — an
  // above panel is anchored by its BOTTOM edge to the trigger, so it grows/shrinks
  // upward and stays glued to the trigger as its content height changes.
  const [pos, setPos] = React.useState<{ left: number; top?: number; bottom?: number } | null>(null);
  const [exiting, setExiting] = React.useState(false);
  const exitTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  ensurePopoverStyles();

  const onCloseRef = React.useRef(onClose);
  onCloseRef.current = onClose;

  // Intercept user-initiated closes to play the exit animation first.
  const handleClose = React.useCallback(() => {
    if (exiting) return;
    setExiting(true);
    exitTimerRef.current = setTimeout(() => { onClose(); }, 110);
  }, [exiting, onClose]);

  React.useEffect(() => () => { if (exitTimerRef.current) clearTimeout(exitTimerRef.current); }, []);

  // Escape closes only the topmost overlay — shared with modals/drawers via
  // `@leta-io/components`' overlay stack (Doc 3 §10).
  useEscapeLayer(true, handleClose);

  // Single-open (Doc 3 §1) + focus-return (§1.3/§10): every call site mounts
  // a Popover only while open and unmounts it on close (never toggles
  // `anchorRect` on an already-mounted instance from non-null to null), so
  // mount/unmount IS open/close here — claim ownership (force-closing
  // whichever other Popover held it) on mount, release + refocus the trigger
  // on unmount.
  React.useEffect(() => {
    const id = Symbol('popover');
    const triggerEl = document.activeElement as HTMLElement | null;
    if (currentOwner !== null && currentForceClose) currentForceClose();
    currentOwner = id;
    currentForceClose = () => onCloseRef.current();
    return () => {
      if (currentOwner === id) { currentOwner = null; currentForceClose = null; }
      triggerEl?.focus?.();
    };
  }, []);

  // Position after layout (needs the panel's measured size to clamp/flip).
  const reposition = React.useCallback(() => {
    if (!anchorRect || !panelRef.current) return;
    const panel = panelRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const margin = 8;
    const isEnd = placement === 'bottom-end' || placement === 'top-end';
    const above = placement === 'top-start' || placement === 'top-end';
    // Panel cards carry a drop shadow whose dominant lobe falls *downward*
    // (`0px 5px 8px -4px`, ~13px of visible bleed) — the convention for a card
    // sitting below its trigger, where that bleed just fades into empty space.
    // When the panel instead sits ABOVE the trigger (explicit `top-*` placement,
    // or the dynamic flip-above below), that same downward bleed now falls
    // directly onto the trigger/field beneath it, reading as if the panel is
    // overlapping it even though the boxes have a clean `offset` gap. Give
    // above-placed panels extra clearance so the shadow fades out before
    // reaching the trigger.
    const aboveOffset = offset + 8;

    let left = isEnd ? anchorRect.right - panel.width : anchorRect.left;
    left = Math.max(margin, Math.min(left, vw - panel.width - margin));

    if (above) {
      // Bottom-anchored to the trigger's top: the panel opens upward and its bottom
      // edge stays a fixed `aboveOffset` above the trigger regardless of content height.
      const bottom = Math.max(margin, vh - anchorRect.top + aboveOffset);
      setPos({ left, bottom });
      return;
    }

    let top = anchorRect.bottom + offset;
    // Flip above the trigger if it would overflow the bottom edge.
    if (top + panel.height > vh - margin && anchorRect.top - aboveOffset - panel.height > margin) {
      top = anchorRect.top - aboveOffset - panel.height;
    }
    top = Math.max(margin, Math.min(top, vh - panel.height - margin));
    setPos({ left, top });
  }, [anchorRect, placement, offset]);

  React.useLayoutEffect(() => { reposition(); }, [reposition]);

  // Reposition when the panel's own size changes — e.g. deselecting rows shrinks the
  // "N selected" dropdown — so a below panel re-clamps and a left offset stays correct
  // (an above panel is already bottom-anchored, so its gap to the trigger never grows).
  React.useEffect(() => {
    const el = panelRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => reposition());
    ro.observe(el);
    return () => ro.disconnect();
  }, [reposition]);

  if (!anchorRect) return null;

  return createPortal(
    <>
      <div
        aria-hidden
        onClick={handleClose}
        style={{ position: 'fixed', inset: 0, zIndex: 1999 }}
      />
      <div
        ref={panelRef}
        className={pos ? `leta-popover-panel${exiting ? ' exiting' : ''}` : undefined}
        style={{
          position: 'fixed',
          left: pos?.left ?? anchorRect.left,
          ...(pos?.bottom != null
            ? { bottom: pos.bottom }
            : { top: pos?.top ?? anchorRect.bottom + offset }),
          zIndex: 2000,
          transformOrigin: `${placement.startsWith('top') ? 'bottom' : 'top'} ${placement.endsWith('end') ? 'right' : 'left'}`,
          // Hide until measured to avoid a one-frame jump.
          visibility: pos ? 'visible' : 'hidden',
        }}
      >
        {children}
      </div>
    </>,
    document.body,
  );
}

/**
 * MenuPanel — the design-system dropdown card chrome (white surface, 1px border,
 * `--rounding-xl`, `--shadow-neutral-3`, 8px padding) for composed
 * `DesktopMenuOptions` menus rendered inside a {@link Popover}. Mirrors the
 * chrome `DesktopDropdowns` applies to its own panels.
 */
export function MenuPanel({
  width = 220,
  children,
}: {
  width?: number;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <div
      role="menu"
      style={{
        width,
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--spacing-4px)',
        padding: 'var(--padding-8px)',
        backgroundColor: 'var(--surface-neutral-bg-default)',
        border: 'var(--stroke-xs) solid var(--border-neutral-default)',
        borderRadius: 'var(--rounding-xl)',
        boxShadow: 'var(--shadow-neutral-3)',
      }}
    >
      {children}
    </div>
  );
}

/**
 * A 1px section demarcator inside a {@link MenuPanel}. **Full-bleed** — negative
 * horizontal margin cancels the panel's 8px padding so the line spans edge-to-edge
 * (matching the Figma Actions Dropdown's full-width section borders), while the rows
 * keep their padding.
 */
export function MenuDivider(): React.ReactElement {
  return (
    <div
      aria-hidden
      style={{
        height: 'var(--stroke-xs)',
        backgroundColor: 'var(--border-neutral-default)',
        marginTop: 'var(--spacing-4px)',
        marginBottom: 'var(--spacing-4px)',
        marginLeft: 'calc(-1 * var(--padding-8px))',
        marginRight: 'calc(-1 * var(--padding-8px))',
      }}
    />
  );
}

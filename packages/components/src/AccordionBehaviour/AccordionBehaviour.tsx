import * as React from 'react';
import { Icon } from '@leta/icons';

/**
 * # Accordion Behaviour
 *
 * The LETA design-system pattern for any component that **opens and closes to
 * hide & reveal content**. The design system does not have a component literally
 * named "Accordion" — the accordions are the **List Section**, **Table Section**,
 * and **Input Section** organisms (and bespoke wireframe sections like the View
 * Order drawer's Order Detail Accordions). They all share this behaviour:
 *
 * 1. **Two states — Open & Closed.** In the Closed state the content disappears
 *    and only the section header (a `ContentPrimitives type="section-heading"`)
 *    remains; its trailing slot shows a **Ghost / Prominent Icon-Only button with
 *    the Chevron-Down icon**, indicating the section can be opened. In the Open
 *    state the content is revealed and the chevron points up.
 * 2. **Hover anywhere on the header → the trailing chevron button shows its hover
 *    state.** Hovering *any* area of the section-header content primitive (not
 *    just the button itself) drives the button into its ghost-hover state.
 * 3. **Click anywhere on the header toggles** open/closed.
 * 4. **Smooth ease-in-out open/close animation** — the content reveal animates
 *    (interruptible CSS transition), and the chevron rotates.
 *
 * This module packages that behaviour so every accordion-behaviour component
 * implements it identically:
 * - {@link AccordionHeader} — wraps the section-heading in the clickable +
 *   hoverable header row (the whole row is the toggle + hover target).
 * - {@link AccordionChevron} — the Ghost/Prominent Icon-Only chevron button that
 *   goes to its hover state when the header row is hovered, and rotates on open.
 *   Pass it into the section-heading's `interactiveElements` slot.
 * - {@link AccordionContent} — the animated reveal wrapper (ease-in-out), which
 *   also owns the header→body gap so the header sits flush when collapsed.
 */

let injected = false;
function ensureAccordionStyles(): void {
  if (injected || typeof document === 'undefined') return;
  injected = true;
  const el = document.createElement('style');
  el.setAttribute('data-leta', 'accordion-behaviour');
  // Hovering ANY area of the header row drives the trailing chevron button into
  // its ghost-hover state (Accordion Behaviour rule 2). Focus-visible mirrors it.
  el.textContent = `
.leta-accordion-head { cursor: pointer; border-radius: var(--rounding-md); outline: none; }
.leta-accordion-chevron { background: transparent; border-radius: var(--rounding-lg); transition: background-color 120ms cubic-bezier(0.2, 0, 0, 1); }
.leta-accordion-chevron--ghost:hover,
.leta-accordion-head:hover .leta-accordion-chevron--ghost,
.leta-accordion-head:focus-visible .leta-accordion-chevron--ghost { background-color: var(--surface-neutral-ghost-button-hover); }
.leta-accordion-head:focus-visible { outline: var(--stroke-sm) solid var(--border-secondary-component-focus); outline-offset: 2px; }
.leta-accordion-head:focus:not(:focus-visible) { outline: none; }
@media (prefers-reduced-motion: reduce) {
  .leta-accordion-content, .leta-accordion-chevron, .leta-accordion-chevron > svg { transition-duration: 0.01ms !important; }
}`;
  document.head.appendChild(el);
}

/** Convenience open/closed state hook. */
export function useAccordion(defaultOpen = true): { open: boolean; toggle: () => void; setOpen: React.Dispatch<React.SetStateAction<boolean>> } {
  const [open, setOpen] = React.useState(defaultOpen);
  const toggle = React.useCallback(() => setOpen((o) => !o), []);
  return { open, toggle, setOpen };
}

export interface AccordionHeaderProps {
  open: boolean;
  onToggle: () => void;
  /** The `ContentPrimitives type="section-heading"` (with an {@link AccordionChevron} in its interactiveElements slot). */
  children: React.ReactNode;
}

/**
 * The clickable + hoverable section-header row. The whole row toggles the section
 * and drives the trailing chevron's hover state. The chevron itself remains the
 * semantic focusable control (for keyboard/AT); this row is the large hit area.
 */
export function AccordionHeader({ open, onToggle, children }: AccordionHeaderProps): React.ReactElement {
  ensureAccordionStyles();
  return (
    <div className="leta-accordion-head" onClick={onToggle}>
      {children}
    </div>
  );
}

/**
 * The accordion's chevron toggle. Rotates 180° between closed (down) and open (up)
 * with an ease-in-out transition. This is the semantic toggle control.
 *
 * Two visual treatments, mirroring the two Button variants the designs use:
 * - `ghost` (default) — **Ghost / Prominent Icon-Only**, a 40×40 box that takes the
 *   ghost-hover fill when the enclosing {@link AccordionHeader} is hovered/focused
 *   (via CSS) or when hovered directly. Used by the section organisms (List / Table
 *   / Input Section) and the Order Detail accordions.
 * - `plain` — **Plain / Icon-Only / Small**, a bare glyph hugging the icon with no
 *   hover fill. Used by the Activity-tab timeline entries (Figma `1487:173235`,
 *   where the chevron instance is `Variant=Plain, Type=Icon Only, Size=Small`
 *   at 16×16).
 */
export function AccordionChevron({
  open,
  onToggle,
  size = 24,
  variant = 'ghost',
}: {
  open: boolean;
  onToggle: () => void;
  size?: number;
  /** Visual treatment — see the doc comment. Defaults to `ghost`. */
  variant?: 'ghost' | 'plain';
}): React.ReactElement {
  const ghost = variant === 'ghost';
  return (
    <button
      type="button"
      className={`leta-accordion-chevron leta-accordion-chevron--${variant}`}
      aria-label={open ? 'Collapse section' : 'Expand section'}
      aria-expanded={open}
      onClick={(e) => {
        // Stop the enclosing header row's onClick from also firing (double-toggle).
        e.stopPropagation();
        onToggle();
      }}
      style={{
        // Idle background, border-radius, and background-color transition live in
        // the injected `.leta-accordion-chevron` CSS — NOT inline — so the
        // `.leta-accordion-head:hover .leta-accordion-chevron--ghost` rule can win
        // (inline styles beat stylesheet rules). Only layout props stay inline.
        // Plain hugs the glyph (no 40×40 box, no hover fill).
        width: ghost ? 40 : size,
        height: ghost ? 40 : size,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        padding: 0,
        border: 0,
        cursor: 'pointer',
        color: 'var(--icons-neutral-default)',
      }}
    >
      <Icon
        name="Chevron-Down"
        outlined={false}
        size={size}
        style={{
          transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          transitionProperty: 'transform',
          transitionDuration: '300ms',
          transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      />
    </button>
  );
}

/**
 * Animated open/close reveal (Accordion Behaviour rule 4). Uses the
 * `grid-template-rows: 0fr → 1fr` technique so arbitrary-height content animates
 * smoothly (ease-in-out, interruptible CSS transition) without measuring height.
 * Owns the header→body gap as inner `paddingTop` so it collapses with the content
 * (no phantom gap above a closed section). `prefers-reduced-motion` → instant.
 *
 * @param gap    row gap between body children (default `--spacing-24px`)
 * @param topGap header→body gap, applied as padding-top that animates away
 *               (default `--spacing-12px`)
 */
export function AccordionContent({
  open,
  children,
  gap = 'var(--spacing-24px)',
  topGap = 'var(--spacing-12px)',
}: {
  open: boolean;
  children: React.ReactNode;
  gap?: string;
  topGap?: string;
}): React.ReactElement {
  ensureAccordionStyles();
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const mounted = React.useRef(false);
  // Height/opacity/overflow are driven IMPERATIVELY in the layout effect — a
  // ref-measured height animation with a forced reflow between the concrete
  // height and 0 (React state + rAF proved too fragile: the setState-to-0 got
  // swallowed by re-render/cleanup timing). Fully open → `height:auto`
  // (+overflow visible so nested focus rings aren't clipped); closed → 0.
  React.useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    if (!mounted.current) {
      // First mount: settle to the initial state, no enter/exit animation.
      mounted.current = true;
      el.style.height = open ? 'auto' : '0px';
      el.style.opacity = open ? '1' : '0';
      el.style.overflow = open ? 'visible' : 'hidden';
      return;
    }
    const full = el.scrollHeight;
    if (open) {
      el.style.overflow = 'hidden';
      el.style.height = '0px';
      void el.offsetHeight; // force reflow so the transition runs from 0
      el.style.height = `${full}px`;
      el.style.opacity = '1';
      const onEnd = (e: TransitionEvent) => {
        if (e.propertyName !== 'height') return;
        el.style.height = 'auto'; // release so nested content stays responsive
        el.style.overflow = 'visible';
        el.removeEventListener('transitionend', onEnd);
      };
      el.addEventListener('transitionend', onEnd);
      return () => el.removeEventListener('transitionend', onEnd);
    }
    // Closing: pin the current height, force reflow, then animate to 0.
    el.style.overflow = 'hidden';
    el.style.height = `${full}px`;
    void el.offsetHeight;
    el.style.height = '0px';
    el.style.opacity = '0';
    return;
  }, [open]);
  return (
    <div
      ref={wrapRef}
      aria-hidden={!open}
      className="leta-accordion-content"
      style={{
        // `min-height: 0` defeats the flexbox default (`min-height: auto`) that
        // would otherwise stop this flex-column child from shrinking below its
        // content height — without it, `height: 0` never collapses.
        minHeight: 0,
        transitionProperty: 'height, opacity',
        transitionDuration: '320ms, 220ms',
        transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap, width: '100%', paddingTop: topGap }}>
        {children}
      </div>
    </div>
  );
}

import * as React from 'react';
import { Icon, type IconName } from '@leta/icons';
import { Button } from '../Button/Button.js';
import { Title } from '../Title/Title.js';

export type ModalHeadersVariant = 'default' | 'with-tabs';

export interface ModalHeadersProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title' | 'children'> {
  /** Which header treatment. `with-tabs` adds a tab row beneath the title. */
  variant?: ModalHeadersVariant;
  /** Modal title text. */
  title?: string;
  /** Close-button handler. The close button is always rendered. */
  onClose?: () => void;
  /** When true, renders a Breadcrumbs component above the title. */
  showBreadcrumb?: boolean;
  /** Content to render in the breadcrumb slot (typically a `<Breadcrumbs>` element). */
  breadcrumb?: React.ReactNode;
  /** When true, renders a back-navigation arrow (`Arrow-Left`) before the title. */
  showNavArrow?: boolean;
  /** Fired when the nav arrow is clicked. */
  onNavBack?: () => void;
  /** When true, renders a leading icon before the title text. */
  showLeadingIcon?: boolean;
  /** The icon to show before the title (when `showLeadingIcon` is true). */
  leadingIcon?: IconName;
  /** Color of the leading icon. Defaults to `--icons-neutral-default`. */
  leadingIconColor?: string;
  /**
   * Controls the **Secondary Content** slot (Figma `9200:38903`). Defaults to
   * `true` to mirror Figma, where the slot frame is visible. The slot reserves
   * its row even when empty so prototypes can populate it later.
   */
  showSecondaryContent?: boolean;
  /**
   * Leading group of the Secondary Content slot — the left side of its
   * SPACE_BETWEEN row (Figma "Status Badges"). Typically status `<Badge>`s.
   */
  secondaryLeading?: React.ReactNode;
  /**
   * Trailing group of the Secondary Content slot — the right side of its
   * SPACE_BETWEEN row (Figma "Header CTAs"). Typically secondary `<Button>`s.
   */
  secondaryTrailing?: React.ReactNode;
  /** Tab row (typically a `<PageTabsControl>` element). Only shown in `with-tabs` variant. */
  tabs?: React.ReactNode;
}

/**
 * Modal Headers — the top region of a modal/dialog. Title, optional
 * breadcrumbs, optional leading icon/arrow, a close affordance, and
 * (optionally) in-modal tab navigation.
 *
 * **When to use:** at the top of every modal/dialog.
 *
 * **When NOT to use:** page-level headers (use Top Page Section) or drawers
 * with their own chrome.
 *
 * Figma `228:5568`:
 * - **default** — title + close button; 80px, padding 20 all sides.
 * - **with-tabs** — title + close + PageTabsControl row; 120px, padding [20,20,0,20].
 *
 * Both: `--surface-neutral-bg-default`, top-left/top-right radius 12px
 * (`--rounding-xl`), bottom border `--stroke-xs` / `--border-neutral-default`.
 *
 * Composes {@link Title}, {@link Button} (Ghost Prominent Icon Only for close),
 * and optionally {@link Breadcrumbs} / {@link PageTabsControl}.
 *
 * **Figma slots** (composable child-injection points, never hardcoded):
 * - `breadcrumb` — the Breadcrumbs area above the title.
 * - `secondaryLeading` / `secondaryTrailing` — the **Secondary Content** SLOT
 *   (`9200:38903`): a SPACE_BETWEEN row, gap 10, fills width. Visible in Figma,
 *   so `showSecondaryContent` defaults to `true`.
 * - `tabs` — the **Page Tabs Control** SLOT (`with-tabs` variant only).
 */
/**
 * The back arrow is a bare icon in Figma (no button chrome), but must stay
 * keyboard-operable — so it ships as a `<button>` reset down to the glyph's own
 * box: no background, no border, no padding, and the standard project focus ring.
 */
let navArrowStylesInjected = false;
function ensureNavArrowStyles(): void {
  if (navArrowStylesInjected || typeof document === 'undefined') return;
  navArrowStylesInjected = true;
  const el = document.createElement('style');
  el.setAttribute('data-leta', 'modal-nav-arrow');
  el.textContent = `
.leta-modal-nav-arrow {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: none;
  background: none;
  color: var(--icons-neutral-default);
  cursor: pointer;
  flex-shrink: 0;
}
.leta-modal-nav-arrow:focus { outline: none; }
.leta-modal-nav-arrow:focus-visible {
  outline: var(--stroke-sm) solid var(--border-secondary-component-focus);
  outline-offset: 4px;
}`;
  document.head.appendChild(el);
}

export const ModalHeaders = React.forwardRef<HTMLDivElement, ModalHeadersProps>(
  function ModalHeaders(
    {
      variant = 'default',
      title = 'Title',
      onClose,
      showBreadcrumb = false,
      breadcrumb,
      showNavArrow = false,
      onNavBack,
      showLeadingIcon = false,
      leadingIcon,
      leadingIconColor = 'var(--icons-neutral-default)',
      showSecondaryContent = true,
      secondaryLeading,
      secondaryTrailing,
      tabs,
      style,
      ...rest
    },
    ref,
  ) {
    const hasTabs = variant === 'with-tabs';
    if (showNavArrow) ensureNavArrowStyles();

    return (
      <div
        ref={ref}
        style={{
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
          width: '100%',
          // Default: padding 20 all sides; With Tabs: no bottom padding (tabs
          // sit at the bottom edge above the demarcator).
          paddingTop: 'var(--padding-20px)',
          paddingRight: 'var(--padding-20px)',
          paddingBottom: hasTabs ? 0 : 'var(--padding-20px)',
          paddingLeft: 'var(--padding-20px)',
          backgroundColor: 'var(--surface-neutral-bg-default)',
          // Top-left + top-right rounded (modal top); bottom corners 0.
          borderTopLeftRadius: 'var(--rounding-xl)',
          borderTopRightRadius: 'var(--rounding-xl)',
          borderBottomLeftRadius: 0,
          borderBottomRightRadius: 0,
          // Bottom-only divider painted as inset box-shadow (like the project
          // convention) so it doesn't add to the auto height.
          //
          // Applied to BOTH variants: in Figma the header root itself carries the
          // bottom stroke (`strokeSides [0,0,1,0]`) at the FULL modal width, while
          // the nested PageTabsControl's own `Demarcator` is inset by this
          // component's 20px horizontal padding. The two sit coincident, so the
          // edge-to-edge line the design shows is this one — do NOT try to widen
          // the tabs control to produce it (a negative-margin wrapper cancels
          // itself out, since the control re-applies the same padding internally).
          border: 'none',
          boxShadow: `inset 0 -1px 0 var(--border-neutral-default)`,
          ...style,
        }}
        {...rest}
      >
        {/* Container — vertical stack: top content + optional secondary */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Top Content — title area + close button, space-between.
              Center-aligned so the title/leading-icon line up vertically with
              the close button (Figma Top Content counterAxis = CENTER). */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20 }}>
            {/* Title + Breadcrumbs column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, justifyContent: 'center', minWidth: 0 }}>
              {showBreadcrumb && breadcrumb}
              {/* Title row: optional arrow + optional leading icon + Title */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-8px)' }}>
                {/*
                  Back arrow. In Figma this is a **bare `Arrow-Left` icon**, not a
                  button — it carries no 40×40 ghost chrome, no hover fill and no
                  padding (it was wrongly built as a Ghost / Prominent Icon-Only
                  Button, which inflated the title row and painted a hover square).

                  It is still rendered as a real `<button>`, because back
                  navigation must be keyboard-reachable and announced — but the
                  button is stripped to the glyph's own box so it is visually
                  identical to the icon in the design. Focus is the standard
                  project ring (`:focus-visible`), inherited from the reset.
                */}
                {showNavArrow && (
                  <button
                    type="button"
                    onClick={onNavBack}
                    aria-label="Go back"
                    className="leta-modal-nav-arrow"
                  >
                    <Icon name="Arrow-Left" size="xl" aria-hidden />
                  </button>
                )}
                {showLeadingIcon && leadingIcon && (
                  <Icon name={leadingIcon} size="xl" color={leadingIconColor} aria-hidden />
                )}
                <Title text={title} variant="page-dialog" />
              </div>
            </div>
            {/* Close button */}
            <Button
              variant="ghost"
              size="medium"
              prominent
              iconOnly="Cancel"
              onClick={onClose}
              aria-label="Close"
              style={{ flexShrink: 0 }}
            />
          </div>

          {/* Secondary Content slot (Figma SLOT 9200:38903) — SPACE_BETWEEN row,
              gap 10, fills width. Leading group (badges) left, trailing group
              (CTAs) right. Both side-wrappers are gap-8 flex rows. The row is
              reserved whenever showSecondaryContent is true, even if empty. */}
          {showSecondaryContent && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 10,
                width: '100%',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-8px)' }}>
                {secondaryLeading}
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  gap: 'var(--spacing-8px)',
                }}
              >
                {secondaryTrailing}
              </div>
            </div>
          )}
        </div>

        {/* Tab row (with-tabs variant only) — stays inset within the header's
            20px horizontal padding, mirroring Figma's 728-wide Tab Container.
            The edge-to-edge line under it is the header root's own bottom stroke
            (see the boxShadow above), not this control's demarcator. */}
        {hasTabs && tabs}
      </div>
    );
  },
);

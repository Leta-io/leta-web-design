import * as React from 'react';
import { AccordionContent } from '../AccordionBehaviour/AccordionBehaviour.js';
import { ContentPrimitives } from '../ContentPrimitives/ContentPrimitives.js';
import { Toggle } from '../Toggle/Toggle.js';
import { Button } from '../Button/Button.js';
import { FooterFrame } from '../FooterFrame/FooterFrame.js';
import {
  NotificationBanner,
  type NotificationBannerType,
} from '../NotificationBanner/NotificationBanner.js';

/* ============================================================================
 * ConfigurationCardRow — a single white settings row inside the card body.
 * Mirrors Figma's nested "Content Card" (Surface/neutral/bg-primary, xl radius).
 * ========================================================================== */

export interface ConfigurationCardRowProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  /** Row title (Label/M/SemiBold). */
  title: string;
  /** Row description (Body/M/Regular). */
  description?: string;
  /** Trailing action — e.g. a `<Button>` ("Dispatch"). */
  trailing?: React.ReactNode;
}

export const ConfigurationCardRow = React.forwardRef<HTMLDivElement, ConfigurationCardRowProps>(
  function ConfigurationCardRow({ title, description = 'Enter description here', trailing, style, ...rest }, ref) {
    return (
      <div
        ref={ref}
        style={{
          display: 'flex',
          alignItems: 'center',
          width: '100%',
          boxSizing: 'border-box',
          padding: 'var(--padding-20px)',
          borderRadius: 'var(--rounding-xl)',
          backgroundColor: 'var(--surface-neutral-bg-default)',
          boxShadow: 'inset 0 0 0 var(--stroke-xs) var(--border-neutral-default)',
          ...style,
        }}
        {...rest}
      >
        <ContentPrimitives
          type="utility"
          text={title}
          subtext={description}
          showVisualAnchor={false}
          showTrailingContent={trailing != null}
          showPassiveElements={false}
          showInteractiveElements
          interactiveElements={trailing}
        />
      </div>
    );
  },
);

/* ============================================================================
 * ConfigurationCard — toggle-able settings section.
 * Header (title + description + Toggle) is always shown. When enabled, the body
 * (children rows) and footer (validation message + actions) are revealed.
 *
 * The reveal follows the standard **Accordion Behaviour** animation, and the
 * body stays mounted while disabled — a collapsed card is hidden, not reset, so
 * a nested sub-mode / criteria the user already set is still there when they
 * switch the section back on.
 * ========================================================================== */

export type ConfigurationCardVariant = 'toggle' | 'control';

export interface ConfigurationCardProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title' | 'onToggle'> {
  /**
   * Which card shape:
   * - `toggle` (default) — the standard settings card: a Toggle in the header
   *   switches the setting on/off and reveals the body.
   * - `control` — the same card **minus the switch**, for a setting that isn't
   *   on/off (durations, a derived read-only value, a link out to another
   *   module). Its body is always visible, and the header's trailing slot takes
   *   whatever {@link ConfigurationCardProps.control} supplies — or nothing.
   */
  variant?: ConfigurationCardVariant;
  /**
   * Header trailing content for the `control` variant — an inline input, a
   * read-only value, or a link-out Button. Ignored by the `toggle` variant,
   * whose trailing slot is the Toggle.
   */
  control?: React.ReactNode;
  /** Section title (Label/M/SemiBold). */
  title: string;
  /** Section description (Body/M/Regular). */
  description?: string;
  /** Whether the section is enabled. Controls the header Toggle + body/footer visibility. */
  enabled?: boolean;
  /** Fires when the header Toggle is flipped. */
  onToggle?: (enabled: boolean) => void;
  /**
   * Body content — typically one or more `<ConfigurationCardRow>`. Revealed when
   * enabled and hidden (but kept mounted, so entered values survive) when not.
   */
  children?: React.ReactNode;
  /** Show the footer region when enabled. Default true. */
  showFooter?: boolean;
  /** Validation / helper message shown in the footer's subtle Notification Banner. */
  footerMessage?: string;
  /** Notification Banner type for the footer message. Default "info". */
  footerMessageType?: NotificationBannerType;
  /** Secondary action label. */
  cancelLabel?: string;
  /** Secondary action handler. */
  onCancel?: () => void;
  /** Primary action label. */
  submitLabel?: string;
  /** Primary action handler. */
  onSubmit?: () => void;
}

export const ConfigurationCard = React.forwardRef<HTMLDivElement, ConfigurationCardProps>(
  function ConfigurationCard(
    {
      variant = 'toggle',
      control,
      title,
      description = 'Enter description here',
      enabled = false,
      onToggle,
      children,
      showFooter = true,
      footerMessage = 'Validation goes here. Keep it short',
      footerMessageType = 'info',
      cancelLabel = 'Action',
      onCancel,
      submitLabel = 'Action',
      onSubmit,
      style,
      ...rest
    },
    ref,
  ) {
    // A control card has no switch to be "off", so its body is always open.
    const open = variant === 'control' ? true : enabled;
    const headerTrailing =
      variant === 'control' ? (
        control
      ) : (
        <Toggle checked={enabled} onChange={(checked) => onToggle?.(checked)} aria-label={title} />
      );
    const hasFooter = open && showFooter && (footerMessage || cancelLabel || submitLabel);

    return (
      <div
        ref={ref}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'stretch',
          // No root gap: the body's `AccordionContent` owns the header→body gap
          // as an animating padding-top (so it collapses with the body, leaving
          // no phantom space above a disabled card), and the footer carries its
          // own top margin. Both are 24px, matching Figma's card gap.
          gap: 0,
          width: '100%',
          boxSizing: 'border-box',
          padding: 'var(--padding-20px)',
          borderRadius: 'var(--rounding-xxl)',
          backgroundColor: 'var(--surface-neutral-bg-subtle)',
          boxShadow: 'inset 0 0 0 var(--stroke-xs) var(--border-neutral-default)',
          ...style,
        }}
        {...rest}
      >
        {/* Header */}
        <ContentPrimitives
          type="utility"
          text={title}
          subtext={description}
          showVisualAnchor={false}
          showTrailingContent={headerTrailing != null}
          showPassiveElements={false}
          showInteractiveElements
          interactiveElements={headerTrailing}
        />

        {/* Body (rows) — revealed by the header Toggle with the standard
            Accordion Behaviour animation. The rows stay MOUNTED while disabled
            (height 0) so anything the user has entered survives a collapse; the
            region is `inert` when hidden so its controls leave the tab order. */}
        {children != null && (
          <div inert={!open} style={{ display: 'contents' }}>
            <AccordionContent open={open} topGap="var(--spacing-24px)" gap="var(--spacing-16px)">
              {children}
            </AccordionContent>
          </div>
        )}

        {/* Footer */}
        {hasFooter && (
          <FooterFrame
            style={{ marginTop: 'var(--spacing-24px)' }}
            variant="card"
            leading={
              footerMessage ? (
                <NotificationBanner
                  variant="subtle"
                  type={footerMessageType}
                  description={footerMessage}
                />
              ) : undefined
            }
          >
            {cancelLabel && (
              <Button variant="secondary" onClick={onCancel}>
                {cancelLabel}
              </Button>
            )}
            {submitLabel && (
              <Button variant="primary" onClick={onSubmit}>
                {submitLabel}
              </Button>
            )}
          </FooterFrame>
        )}
      </div>
    );
  },
);

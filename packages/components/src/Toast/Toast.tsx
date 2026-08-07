import * as React from 'react';
import { Icon, type IconName } from '@leta-io/icons';
import { Button } from '../Button/Button.js';

export type ToastType = 'success' | 'warning' | 'error';

export interface ToastProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title' | 'children'> {
  /** Outcome the toast reports. Default `success`. */
  type?: ToastType;
  /** Bold title line. */
  title?: string;
  /** Show the title line. Default true. */
  showTitle?: boolean;
  /** Supporting subtitle line. */
  subtitle?: string;
  /** Show the subtitle line. Default true. */
  showSubtitle?: boolean;
  /** Renders a trailing dismiss (×) button and is the dismiss handler. */
  onDismiss?: () => void;
  /**
   * Auto-dismiss delay in ms. When set together with `onDismiss`, the toast
   * fires `onDismiss` after this delay. LETA toasts persist ~7000ms.
   */
  duration?: number;
  /** Optional trailing CTA (a `<Button>`), shown when `showCTA`. */
  children?: React.ReactNode;
  /** Show the trailing CTA slot. Default false (mirrors Figma). */
  showCTA?: boolean;
}

const TYPE_CONFIG: Record<
  ToastType,
  { icon: IconName; iconColor: string }
> = {
  success: { icon: 'Check-Circle', iconColor: 'var(--icons-success-default)' },
  warning: { icon: 'Warning', iconColor: 'var(--icons-warning-default)' },
  error: { icon: 'Cancel-Circle', iconColor: 'var(--icons-error-default)' },
};

/**
 * Desktop Toast — a transient, auto-dismissing notification confirming the
 * outcome of an action. Per Doc 3 §4, the consumer's toast container places
 * these top-right (stacking downward, newest on top) and persists them 6s by
 * default / 8s when a CTA is present (set `duration`); positioning/stacking is
 * owned by that container, this component is the visual surface. `type="error"`
 * (a destructive outcome) renders `role="alert"`/`aria-live="assertive"`
 * instead of `role="status"`/`polite`. Figma `68:36772`.
 */
export const Toast = React.forwardRef<HTMLDivElement, ToastProps>(function Toast(
  {
    type = 'success',
    title = 'Toast Title',
    showTitle = true,
    subtitle = 'Subtitle goes here. More info is provided',
    showSubtitle = true,
    onDismiss,
    duration,
    children,
    showCTA = false,
    style,
    ...rest
  },
  ref,
) {
  const config = TYPE_CONFIG[type];
  // Destructive outcomes (Doc 3 §4) interrupt assistive tech immediately
  // instead of waiting for a polite announcement slot.
  const isDestructive = type === 'error';

  React.useEffect(() => {
    if (!duration || !onDismiss) return;
    const t = setTimeout(onDismiss, duration);
    return () => clearTimeout(t);
  }, [duration, onDismiss]);

  const rootStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 'var(--spacing-16px)',
    width: 512,
    maxWidth: '100%',
    boxSizing: 'border-box',
    padding: 'var(--padding-16px)',
    borderRadius: 'var(--rounding-xl)',
    backgroundColor: 'var(--surface-neutral-bg-default)',
    boxShadow: 'inset 0 0 0 var(--stroke-xs) var(--border-neutral-default), var(--shadow-neutral-2)',
    ...style,
  };

  return (
    <div
      ref={ref}
      role={isDestructive ? 'alert' : 'status'}
      aria-live={isDestructive ? 'assertive' : 'polite'}
      style={rootStyle}
      {...rest}
    >
      {/* Leading: status icon + text */}
      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 'var(--spacing-12px)', minWidth: 0 }}>
        <div style={{ flexShrink: 0, width: 24, height: 24, color: config.iconColor }}>
          <Icon name={config.icon} outlined={false} size={24} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-2px)', minWidth: 0 }}>
          {showTitle && title && (
            <span className="text-body-l-medium" style={{ color: 'var(--text-default-heading)' }}>
              {title}
            </span>
          )}
          {showSubtitle && subtitle && (
            <span className="text-body-m-regular" style={{ color: 'var(--text-default-sub-body)' }}>
              {subtitle}
            </span>
          )}
        </div>
      </div>

      {/* Trailing: optional CTA + dismiss */}
      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 'var(--spacing-8px)', flexShrink: 0 }}>
        {showCTA && children}
        {onDismiss && (
          <Button
            variant="ghost"
            size="medium"
            iconOnly="Cancel"
            prominent
            onClick={onDismiss}
            aria-label="Dismiss"
          />
        )}
      </div>
    </div>
  );
});

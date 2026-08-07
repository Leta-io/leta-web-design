import * as React from 'react';
import { Icon } from '@leta-io/icons';
import type { IconName } from '@leta-io/icons';

export type MobileFeaturedIconColor =
  | 'information'
  | 'success'
  | 'warning'
  | 'error'
  | 'highlight'
  | 'neutral';

export type MobileFeaturedIconVariant = 'basic' | 'filled';
export type MobileFeaturedIconSize = 'small' | 'medium' | 'large';

export interface MobileFeaturedIconProps
  extends React.HTMLAttributes<HTMLSpanElement> {
  icon: IconName;
  /** Semantic colour — maps to the icon and (for `filled`) the background tint. */
  color: MobileFeaturedIconColor;
  /**
   * `basic` renders just the icon (no background).
   * `filled` renders the icon centred in a tinted circular background.
   * @default 'filled'
   */
  variant?: MobileFeaturedIconVariant;
  /** @default 'medium' */
  size?: MobileFeaturedIconSize;
}

/* Background fill per colour (used only by `filled` variant). */
const BG_TOKEN: Record<MobileFeaturedIconColor, string> = {
  information: 'var(--surface-information-bg-subtle)',
  success:     'var(--surface-success-bg-subtle)',
  warning:     'var(--surface-warning-bg-subtle)',
  error:       'var(--surface-error-bg-subtle)',
  highlight:   'var(--surface-highlight-bg-subtle)',
  neutral:     'var(--surface-neutral-bg-muted)',
};

/* Icon colour per semantic. */
const ICON_TOKEN: Record<MobileFeaturedIconColor, string> = {
  information: 'var(--icons-information-default)',
  success:     'var(--icons-success-default)',
  warning:     'var(--icons-warning-default)',
  error:       'var(--icons-error-default)',
  highlight:   'var(--icons-highlight-default)',
  neutral:     'var(--icons-neutral-default)',
};

/* Container dimension per size (applies to both Basic and Filled). */
const CONTAINER_PX: Record<MobileFeaturedIconSize, number> = {
  small:  20,
  medium: 32,
  large:  56,
};

/* Icon pixel size per (variant, size) — sourced directly from Figma `4136:74148`. */
const ICON_PX: Record<MobileFeaturedIconVariant, Record<MobileFeaturedIconSize, number>> = {
  basic: {
    small:  20, // fills container
    medium: 24, // 4px padding around
    large:  56, // fills container
  },
  filled: {
    small:  16,
    medium: 20,
    large:  32,
  },
};

/**
 * Mobile Featured Icon — visual anchor for mobile cards / list rows / empty states.
 *
 * 6 colours × 2 variants × 3 sizes = 36 Figma variants under node `4136:74148`.
 *
 * - **Basic** — icon only (no background)
 * - **Filled** — icon centred in a tinted circular background (same pattern as desktop FeaturedIcon)
 *
 * Non-interactive, purely presentational.
 */
export const MobileFeaturedIcon = React.forwardRef<HTMLSpanElement, MobileFeaturedIconProps>(
  function MobileFeaturedIcon(
    { icon, color, variant = 'filled', size = 'medium', style, ...rest },
    ref,
  ) {
    const containerPx = CONTAINER_PX[size];
    const iconPx = ICON_PX[variant][size];
    const isFilled = variant === 'filled';

    return (
      <span
        ref={ref}
        role="img"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: containerPx,
          height: containerPx,
          flexShrink: 0,
          boxSizing: 'border-box',
          ...(isFilled
            ? {
                backgroundColor: BG_TOKEN[color],
                borderRadius: 'var(--rounding-round)',
              }
            : null),
          ...style,
        }}
        {...rest}
      >
        <Icon name={icon} outlined={false} size={iconPx} color={ICON_TOKEN[color]} />
      </span>
    );
  },
);

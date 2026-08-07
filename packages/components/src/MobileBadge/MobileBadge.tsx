import * as React from 'react';
import { Icon } from '@leta-io/icons';
import type { IconName } from '@leta-io/icons';
import { ProgressTracker } from '../ProgressTracker/ProgressTracker.js';

export type MobileBadgeColor =
  | 'blue'
  | 'green'
  | 'red'
  | 'orange'
  | 'yellow'
  | 'purple'
  | 'grey'
  | 'coral-red';

export type MobileBadgeVariant = 'basic' | 'progress';

export interface MobileBadgeProps
  extends Omit<React.HTMLAttributes<HTMLSpanElement>, 'children'> {
  /** Badge label text. */
  label: string;
  /**
   * Semantic colour. Each value maps to a `--surface/{semantic}/mobile-badge`,
   * `--border/{semantic}/mobile-badge`, and `--text/{semantic}/label` token triple.
   * Per Figma `3100:17588`.
   *
   * Ignored for `variant="progress"` (always uses the grey/neutral palette per Figma).
   */
  color: MobileBadgeColor;
  /** Optional leading (left) icon, 14×14. Ignored when `variant="progress"`. */
  leadingIcon?: IconName;
  /** Optional trailing (right) icon, 14×14. Ignored when `variant="progress"`. */
  trailingIcon?: IconName;
  /**
   * Badge layout variant.
   * - `basic` (default): plain text badge with optional icons.
   * - `progress`: leading-indicator badge with a `ProgressTracker` on the left and progress text.
   *   Always renders in the grey/neutral palette per Figma.
   */
  variant?: MobileBadgeVariant;
  /**
   * Progress value 0–100, used only when `variant="progress"`.
   * @default 0
   */
  progressValue?: number;
}

/** Token bindings per colour, mirroring Figma `3100:17588` exactly. */
const COLOR_TOKENS: Record<
  MobileBadgeColor,
  { surface: string; border: string; text: string }
> = {
  blue:        { surface: 'var(--surface-information-mobile-badge)', border: 'var(--border-information-mobile-badge)', text: 'var(--text-information-label)' },
  green:       { surface: 'var(--surface-success-mobile-badge)',     border: 'var(--border-success-mobile-badge)',     text: 'var(--text-success-label)' },
  red:         { surface: 'var(--surface-error-mobile-badge)',       border: 'var(--border-error-mobile-badge)',       text: 'var(--text-error-label)' },
  orange:      { surface: 'var(--surface-warning-mobile-badge)',     border: 'var(--border-warning-mobile-badge)',     text: 'var(--text-warning-label)' },
  yellow:      { surface: 'var(--surface-caution-mobile-badge)',     border: 'var(--border-caution-mobile-badge)',     text: 'var(--text-caution-label)' },
  purple:      { surface: 'var(--surface-highlight-mobile-badge)',   border: 'var(--border-highlight-mobile-badge)',   text: 'var(--text-highlight-label)' },
  grey:        { surface: 'var(--surface-neutral-mobile-badge)',     border: 'var(--border-neutral-mobile-badge)',     text: 'var(--text-default-label)' },
  'coral-red': { surface: 'var(--surface-primary-mobile-badge)',     border: 'var(--border-primary-mobile-badge)',     text: 'var(--text-default-label)' },
};

/**
 * Mobile Badge — compact pill-shaped status indicator for mobile interfaces.
 *
 * 8 colour variants × 3 icon-position types (No Icon / Leading / Trailing) = 24
 * Figma variants under node `3100:17588`. Purely presentational — non-interactive.
 *
 * Padding is asymmetric: the icon-side uses `--padding-6px` and the text-side
 * uses `--padding-8px`. No Icon uses 8/8.
 *
 * Typography: Caption/L/SemiBold (10/16/-0.28). Icons render at 14×14 with
 * `color` matching the text colour.
 */
export const MobileBadge = React.forwardRef<HTMLSpanElement, MobileBadgeProps>(
  function MobileBadge(
    {
      label,
      color,
      leadingIcon,
      trailingIcon,
      variant = 'basic',
      progressValue = 0,
      style,
      ...rest
    },
    ref,
  ) {
    /* Progress variant always uses neutral/grey palette per Figma. */
    const effectiveColor: MobileBadgeColor = variant === 'progress' ? 'grey' : color;
    const tokens = COLOR_TOKENS[effectiveColor];

    /* Progress variant has a leading ProgressTracker (treated as a leading element). */
    const hasLeading = variant === 'progress' || leadingIcon != null;
    const hasTrailing = variant !== 'progress' && trailingIcon != null;

    /* Asymmetric padding: leading-side compressed to 6px, text-side at 8px.
     * No Icon: 8/8. */
    const paddingLeft = hasLeading ? 'var(--padding-6px)' : 'var(--padding-8px)';
    const paddingRight = hasTrailing ? 'var(--padding-6px)' : 'var(--padding-8px)';

    return (
      <span
        ref={ref}
        className="text-caption-l-semibold"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 'var(--spacing-4px)',
          minHeight: 20,
          maxHeight: 24,
          paddingLeft,
          paddingRight,
          borderRadius: 'var(--rounding-xl)',
          backgroundColor: tokens.surface,
          color: tokens.text,
          boxShadow: `inset 0 0 0 var(--stroke-xs) ${tokens.border}`,
          border: 'none',
          boxSizing: 'border-box',
          whiteSpace: 'nowrap',
          ...style,
        }}
        {...rest}
      >
        {variant === 'progress' ? (
          <ProgressTracker value={progressValue} />
        ) : (
          hasLeading && <Icon name={leadingIcon!} size={14} color={tokens.text} />
        )}
        {label}
        {hasTrailing && <Icon name={trailingIcon!} size={14} color={tokens.text} />}
      </span>
    );
  },
);

import * as React from 'react';
import { Icon } from '@leta-io/icons';
import type { IconName } from '@leta-io/icons';

export type FeaturedIconColor = 'information' | 'highlight' | 'error' | 'success' | 'neutral' | 'warning' | 'teal';
export type FeaturedIconSize  = 'medium' | 'large';

export interface FeaturedIconProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Any icon from @leta-io/icons. */
  icon: IconName;
  /**
   * Semantic color variant — controls background tint and icon tint.
   * Maps directly to Figma's "Property 1" variant property.
   */
  color: FeaturedIconColor;
  /**
   * Size variant.
   * - medium: 32 × 32 px container, 16 px icon
   * - large:  40 × 40 px container, 20 px icon
   * @default 'medium'
   */
  size?: FeaturedIconSize;
  /**
   * Container shape.
   * - `rounded`: rounded square (`--rounding-lg`) — the component default.
   * - `circle`:  fully round (`--rounding-round`) — matches Figma instances that
   *   override the corner radius (e.g. the Table Cell "API" type).
   * @default 'rounded'
   */
  shape?: 'rounded' | 'circle';
  /**
   * Render the icon glyph outlined rather than filled. Defaults to filled so
   * existing consumers are unchanged; pass `true` where the design uses the
   * outlined glyph (e.g. Order Detail item cards use `Orders` outlined).
   * @default false
   */
  outlined?: boolean;
}

const BG: Record<FeaturedIconColor, string> = {
  information: 'var(--surface-information-bg-subtle)',
  highlight:   'var(--surface-highlight-bg-subtle)',
  error:       'var(--surface-error-bg-subtle)',
  success:     'var(--surface-success-bg-subtle)',
  neutral:     'var(--surface-neutral-bg-muted)',
  warning:     'var(--surface-warning-bg-subtle)',
  // Figma variant "Teal" maps to the `notice` token family (LETA's teal).
  teal:        'var(--surface-notice-bg-subtle)',
};

const ICON_COLOR: Record<FeaturedIconColor, string> = {
  information: 'var(--icons-information-default)',
  highlight:   'var(--icons-highlight-default)',
  error:       'var(--icons-error-default)',
  success:     'var(--icons-success-default)',
  neutral:     'var(--icons-neutral-default)',
  warning:     'var(--icons-warning-default)',
  teal:        'var(--icons-notice-default)',
};

/** CSS variable for the outer container dimension per size. */
const CONTAINER_SIZE: Record<FeaturedIconSize, string> = {
  medium: 'var(--featured-icon-container-medium)', // 32px
  large:  'var(--featured-icon-container-large)',  // 40px
};

/** Icon pixel size per size variant (matches --featured-icon-icon-{size} token values). */
const ICON_SIZE: Record<FeaturedIconSize, number> = {
  medium: 16,
  large:  20,
};

/**
 * Featured Icon — a rounded-square container with a centered icon, used as a
 * visual anchor for card section titles. Non-interactive, purely presentational.
 */
export const FeaturedIcon = React.forwardRef<HTMLSpanElement, FeaturedIconProps>(
  function FeaturedIcon({ icon, color, size = 'medium', shape = 'rounded', outlined = false, style, ...rest }, ref) {
    return (
      <span
        ref={ref}
        role="img"
        style={{
          display:         'inline-flex',
          alignItems:      'center',
          justifyContent:  'center',
          width:           CONTAINER_SIZE[size],
          height:          CONTAINER_SIZE[size],
          borderRadius:    shape === 'circle' ? 'var(--rounding-round)' : 'var(--rounding-lg)',
          backgroundColor: BG[color],
          flexShrink:      0,
          boxSizing:       'border-box',
          ...style,
        }}
        {...rest}
      >
        <Icon name={icon} outlined={outlined} size={ICON_SIZE[size]} color={ICON_COLOR[color]} />
      </span>
    );
  },
);

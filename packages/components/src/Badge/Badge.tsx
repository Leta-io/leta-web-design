import * as React from 'react';
import { Icon, type IconName } from '@leta-io/icons';

export type BadgeColor =
  | 'caution'
  | 'warning'
  | 'error'
  | 'information'
  | 'success'
  | 'notice'
  | 'primary'
  | 'primary-alt'
  | 'neutral'
  | 'highlight'
  | 'secondary';

const BG: Record<BadgeColor, string> = {
  caution:       'var(--surface-caution-desktop-badge)',
  warning:       'var(--surface-warning-desktop-badge)',
  error:         'var(--surface-error-desktop-badge)',
  information:   'var(--surface-information-desktop-badge)',
  success:       'var(--surface-success-desktop-badge)',
  notice:        'var(--surface-notice-desktop-badge)',
  primary:       'var(--surface-primary-desktop-badge)',
  'primary-alt': 'var(--surface-primary-alt-desktop-badge)',
  neutral:       'var(--surface-neutral-desktop-badge)',
  highlight:     'var(--surface-highlight-desktop-badge)',
  secondary:     'var(--surface-secondary-desktop-badge)',
};

const BORDER: Record<BadgeColor, string> = {
  caution:       'var(--border-caution-desktop-badge)',
  warning:       'var(--border-warning-desktop-badge)',
  error:         'var(--border-error-desktop-badge)',
  information:   'var(--border-information-desktop-badge)',
  success:       'var(--border-success-desktop-badge)',
  notice:        'var(--border-notice-desktop-badge)',
  primary:       'var(--border-primary-desktop-badge)',
  'primary-alt': 'var(--border-primary-alt-desktop-badge)',
  neutral:       'var(--border-neutral-desktop-badge)',
  highlight:     'var(--border-highlight-desktop-badge)',
  secondary:     'var(--border-secondary-desktop-badge)',
};

const TEXT_COLOR: Record<BadgeColor, string> = {
  caution:       'var(--text-caution-label)',
  warning:       'var(--text-warning-label)',
  error:         'var(--text-error-label)',
  information:   'var(--text-information-label)',
  success:       'var(--text-success-label)',
  notice:        'var(--text-notice-label)',
  // Figma "Coral Red" badge uses the default (dark) label colour, not the red primary label.
  primary:       'var(--text-default-label)',
  // Figma "Coral Red (Alt)" fills the badge with the saturated coral red → white on-color text.
  'primary-alt': 'var(--text-on-color-label)',
  neutral:       'var(--text-default-label)',
  highlight:     'var(--text-highlight-label)',
  secondary:     'var(--text-secondary-label)',
};

const ICON_COLOR: Record<BadgeColor, string> = {
  caution:       'var(--icons-caution-badge)',
  warning:       'var(--icons-warning-badge)',
  error:         'var(--icons-error-badge)',
  information:   'var(--icons-information-badge)',
  success:       'var(--icons-success-badge)',
  notice:        'var(--icons-notice-badge)',
  primary:       'var(--icons-primary-badge)',
  'primary-alt': 'var(--icons-on-color-default)',
  neutral:       'var(--icons-neutral-default)',
  highlight:     'var(--icons-highlight-badge)',
  secondary:     'var(--icons-secondary-badge)',
};

export interface BadgeProps
  extends Omit<React.HTMLAttributes<HTMLSpanElement>, 'children'> {
  /** Badge label text. */
  label: string;
  /** Semantic color variant. Default: 'neutral'. */
  color?: BadgeColor;
  /** Icon rendered before the label (Figma "Leading Icon" type). */
  leadingIcon?: IconName;
  /** Icon rendered after the label (Figma "Trailing Icon" type). */
  trailingIcon?: IconName;
  /**
   * Render the badge's icon(s) outlined rather than filled. Defaults to
   * **filled**, matching Figma's Delivery Badges (`68:36703`), whose icon
   * instances are all filled glyphs (`Icon/Return`, `Icon/Broadcast`,
   * `Icon/Check-Circle` — never the `-Outline` siblings). Mirrors `Button`'s
   * `iconOutlined`: without an explicit value the library-wide outlined default
   * would silently flip these to the thinner outline glyph.
   */
  iconOutlined?: boolean;
}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  function Badge(
    { label, color = 'neutral', leadingIcon, trailingIcon, iconOutlined = false, className, style, ...rest },
    ref,
  ) {
    const iconColor = ICON_COLOR[color];

    return (
      <span
        ref={ref}
        className={`text-label-s-medium${className ? ` ${className}` : ''}`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 'var(--spacing-4px)',
          paddingTop: 'var(--padding-2px)',
          paddingBottom: 'var(--padding-2px)',
          paddingLeft: leadingIcon ? 'var(--padding-4px)' : 'var(--padding-6px)',
          paddingRight: trailingIcon ? 'var(--padding-4px)' : 'var(--padding-6px)',
          borderRadius: 'var(--rounding-md)',
          backgroundColor: BG[color],
          color: TEXT_COLOR[color],
          boxShadow: `inset 0 0 0 var(--stroke-xs) ${BORDER[color]}`,
          whiteSpace: 'nowrap',
          boxSizing: 'border-box',
          userSelect: 'none',
          ...style,
        }}
        {...rest}
      >
        {leadingIcon && <Icon name={leadingIcon} outlined={iconOutlined} size={12} color={iconColor} />}
        {label}
        {trailingIcon && <Icon name={trailingIcon} outlined={iconOutlined} size={12} color={iconColor} />}
      </span>
    );
  },
);

import * as React from 'react';
import { Icon, type IconName } from '@leta-io/icons';
import { ContentPrimitives } from '../ContentPrimitives/ContentPrimitives.js';
import type { BadgeColor } from '../Badge/Badge.js';

export type MetricVariance = 'none' | 'neutral' | 'positive' | 'negative';

export interface DesktopMetricCardProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  /** The large metric value, e.g. "10". */
  metric?: string;
  /** Eyebrow / period label above the metric, e.g. "This week". */
  eyebrowText?: string;
  /** Visual-anchor icon (top-left, 24px). Figma default is Check-Circle (outlined). */
  leadingIcon?: IconName;
  /** Whether the visual-anchor icon uses its outlined variant. Default true. */
  leadingIconOutlined?: boolean;
  /** Show the outlined Question help icon after the eyebrow text. Default true. */
  showEyebrowTrailingIcon?: boolean;
  /** Variance treatment for the trailing badge. Default "none" (no badge). */
  variance?: MetricVariance;
  /** Variance badge label, e.g. "20%". Shown when variance ≠ "none". */
  varianceLabel?: string;
  /** Optional subtext below the metric. Hidden by default (mirrors Figma). */
  subtext?: string;
  /** Show the metric subtext row. Default false. */
  showMetricSubtext?: boolean;
  /**
   * Trailing content (top-right). Defaults to a Proceed (↗) arrow.
   * Pass `null` to render nothing.
   */
  trailingContent?: React.ReactNode;
  /**
   * Force a visual state (Figma `State` axis). When set, overrides the
   * interactive hover/pressed tracking — useful for catalogs/snapshots.
   */
  state?: MetricCardState;
}

/** Maps the Figma "Variance" axis to the variance badge's color + leading icon. */
const VARIANCE_BADGE: Record<
  Exclude<MetricVariance, 'none'>,
  { color: BadgeColor; icon?: IconName }
> = {
  neutral: { color: 'neutral' },
  positive: { color: 'success', icon: 'Up-Arrow' },
  negative: { color: 'error', icon: 'Down-Arrow' },
};

const STYLE_ID = 'leta-metric-card-styles';
const STYLES = `
  .leta-metric-card:focus-visible {
    outline: var(--stroke-sm) solid var(--border-secondary-component-focus);
    outline-offset: 4px;
  }
`;

function ensureStyles(): void {
  if (typeof document === 'undefined') return;
  if (document.getElementById(STYLE_ID)) return;
  const el = document.createElement('style');
  el.id = STYLE_ID;
  el.textContent = STYLES;
  document.head.appendChild(el);
}

export type MetricCardState = 'default' | 'hover' | 'pressed' | 'focus';

/**
 * Per-state visual spec, mirroring Figma's `State` axis:
 * - Default: idle surface, `--border-neutral-default` @ 1px, no shadow
 * - Hover:   hover surface, hover border @ 1px, "Neutral Drop Shadow 1"
 * - Pressed: pressed surface, darker pressed border @ 1px, no shadow
 * - Focus:   same body as Default + a focus ring (the standard
 *            `:focus-visible` treatment; `ring: true` renders it statically
 *            when the state is forced via the `state` prop)
 */
const STATE_STYLE: Record<
  MetricCardState,
  { surface: string; border: string; borderWidth: string; shadow?: string; ring?: boolean }
> = {
  default: {
    surface: 'var(--surface-neutral-card-idle)',
    border: 'var(--border-neutral-default)',
    borderWidth: 'var(--stroke-xs)',
  },
  hover: {
    surface: 'var(--surface-neutral-card-hover)',
    border: 'var(--border-neutral-card-hover)',
    borderWidth: 'var(--stroke-xs)',
    shadow: 'var(--shadow-neutral-1)',
  },
  pressed: {
    surface: 'var(--surface-neutral-card-pressed)',
    border: 'var(--border-neutral-card-pressed)',
    borderWidth: 'var(--stroke-xs)',
  },
  focus: {
    surface: 'var(--surface-neutral-card-idle)',
    border: 'var(--border-neutral-default)',
    borderWidth: 'var(--stroke-xs)',
    ring: true,
  },
};

export const DesktopMetricCard = React.forwardRef<HTMLButtonElement, DesktopMetricCardProps>(
  function DesktopMetricCard(
    {
      metric = '10',
      eyebrowText = 'This week',
      leadingIcon = 'Check-Circle',
      leadingIconOutlined = true,
      showEyebrowTrailingIcon = true,
      variance = 'none',
      varianceLabel = '20%',
      subtext,
      showMetricSubtext = false,
      trailingContent,
      state: forcedState,
      className,
      style,
      onMouseEnter,
      onMouseLeave,
      onMouseDown,
      onMouseUp,
      ...rest
    },
    ref,
  ) {
    ensureStyles();

    const [hovered, setHovered] = React.useState(false);
    const [pressed, setPressed] = React.useState(false);
    const state: MetricCardState =
      forcedState ?? (pressed ? 'pressed' : hovered ? 'hover' : 'default');

    const hasVariance = variance !== 'none';
    const varianceBadge = hasVariance ? VARIANCE_BADGE[variance] : undefined;

    const spec = STATE_STYLE[state];
    const boxShadow = `inset 0 0 0 ${spec.borderWidth} ${spec.border}${spec.shadow ? `, ${spec.shadow}` : ''}`;

    // When `state="focus"` is forced (e.g. catalog), render the focus ring
    // statically. Real keyboard focus is handled by the :focus-visible CSS.
    const ringStyle: React.CSSProperties = spec.ring
      ? {
          outline: 'var(--stroke-sm) solid var(--border-secondary-component-focus)',
          outlineOffset: 4,
        }
      : {};

    const rootStyle: React.CSSProperties = {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-start',
      justifyContent: 'center',
      width: '100%',
      boxSizing: 'border-box',
      padding: 'var(--padding-20px)',
      // Reset the native <button> border/appearance so the only edge is our
      // inset box-shadow border (the UA default is a 2px outset border).
      border: 'none',
      appearance: 'none',
      WebkitAppearance: 'none',
      font: 'inherit',
      borderRadius: 'var(--rounding-xl)',
      backgroundColor: spec.surface,
      boxShadow,
      cursor: 'pointer',
      textAlign: 'left',
      transition: 'background-color 120ms ease, box-shadow 120ms ease',
      ...ringStyle,
      ...style,
    };

    const trailing =
      trailingContent === undefined ? <Icon name="Proceed" size={20} /> : trailingContent;

    return (
      <button
        ref={ref}
        type="button"
        className={`leta-metric-card${className ? ` ${className}` : ''}`}
        style={rootStyle}
        onMouseEnter={(e) => {
          setHovered(true);
          onMouseEnter?.(e);
        }}
        onMouseLeave={(e) => {
          setHovered(false);
          setPressed(false);
          onMouseLeave?.(e);
        }}
        onMouseDown={(e) => {
          setPressed(true);
          onMouseDown?.(e);
        }}
        onMouseUp={(e) => {
          setPressed(false);
          onMouseUp?.(e);
        }}
        {...rest}
      >
        <ContentPrimitives
          type="metrics"
          metric={metric}
          eyebrowText={eyebrowText}
          leadingIcon={leadingIcon}
          leadingIconOutlined={leadingIconOutlined}
          showEyebrowTrailingIcon={showEyebrowTrailingIcon}
          showMetricVariance={hasVariance}
          metricVarianceLabel={varianceLabel}
          metricVarianceColor={varianceBadge?.color ?? 'neutral'}
          metricVarianceIcon={varianceBadge?.icon}
          subtext={subtext}
          showMetricSubtext={showMetricSubtext}
          showTrailingContent={trailing != null}
          showPassiveElements
          passiveElements={trailing}
          showInteractiveElements={false}
        />
      </button>
    );
  },
);

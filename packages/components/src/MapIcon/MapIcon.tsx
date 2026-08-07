import * as React from 'react';
import { Icon } from '@leta-io/icons';
import type { IconName } from '@leta-io/icons';
import { BIKE_DELIVERY_DATA_URI } from './bike-delivery-asset.js';

export type MapIconVariant =
  | 'object-pin'
  | 'numeric-pin'
  | 'badge'
  | 'event-pin'
  | 'bike-delivery';

export interface MapIconProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Which shape to render. */
  variant: MapIconVariant;
  /**
   * Fill colour for the inner Background shape (the coloured circle inside the
   * pin / behind the badge content). Default: 'var(--surface-secondary-bg)'.
   * The outer pin/badge body is always white with a light-gray stroke for
   * visibility against white-background maps.
   *
   * For `event-pin`, this controls the pin-icon colour instead.
   * Ignored for `bike-delivery` (fixed illustration).
   */
  color?: string;
  /**
   * Icon to display inside Object Pin or Badge.
   * Takes precedence over `text` when both are supplied.
   */
  icon?: IconName;
  /**
   * Text to display (e.g. a count like "5") — required for `numeric-pin`,
   * optional for `badge`. Ignored for `object-pin`, `event-pin`, `bike-delivery`.
   */
  text?: string;
}

const DEFAULT_INNER_COLOR = 'var(--surface-secondary-bg)';
const OUTER_BODY_FILL = 'var(--surface-neutral-bg-default)';
const OUTER_BODY_STROKE = 'var(--border-neutral-default)';
const CONTENT_COLOR = 'var(--text-on-color-label)';

/**
 * Three-layer Neutral Drop Shadow 2, applied as stacked CSS drop-shadow filters
 * so the shadow follows the pin/badge alpha shape (not a rectangular bounding box).
 * CSS drop-shadow doesn't support spread, so this is a visual approximation.
 */
const SHAPE_SHADOW =
  'drop-shadow(0 4px 6px rgba(0,0,0,0.10)) ' +
  'drop-shadow(1px 0 2px rgba(0,0,0,0.06)) ' +
  'drop-shadow(0 -1px 2px rgba(37,37,37,0.04))';

/* Teardrop path from Figma export (viewBox 0 0 26 32). */
const TEARDROP_PATH =
  'M26 12.8C26 22.4292 13.6797 32 13 32C12.3203 32 0 22.4292 0 12.8C0 5.73075 5.8203 0 13 0C20.1797 0 26 5.73075 26 12.8Z';

/* ------------------------------------------------------------------ */
/*  Pin/Badge shape components                                        */
/* ------------------------------------------------------------------ */

/**
 * Object Pin / Numeric Pin shape — 26×32 teardrop with white body, light-gray
 * stroke, and a 24×24 coloured inner circle near the top.
 */
function PinShape({ color }: { color: string }) {
  return (
    <svg
      aria-hidden
      width={26}
      height={32}
      viewBox="0 0 26 32"
      fill="none"
      style={{ display: 'block', flexShrink: 0, filter: SHAPE_SHADOW }}
    >
      <path
        d={TEARDROP_PATH}
        fill={OUTER_BODY_FILL}
        stroke={OUTER_BODY_STROKE}
        strokeWidth={0.2}
      />
      <circle cx={13} cy={13} r={12} fill={color} />
    </svg>
  );
}

/**
 * Badge shape — 32×32 circle with white body + light-gray stroke,
 * inner 29×29 coloured circle leaves a ~1.5px white ring.
 */
function BadgeShape({ color }: { color: string }) {
  return (
    <svg
      aria-hidden
      width={32}
      height={32}
      viewBox="0 0 32 32"
      fill="none"
      style={{ display: 'block', flexShrink: 0, filter: SHAPE_SHADOW }}
    >
      <circle
        cx={16}
        cy={16}
        r={16}
        fill={OUTER_BODY_FILL}
        stroke={OUTER_BODY_STROKE}
        strokeWidth={0.2}
      />
      <circle cx={16} cy={16} r={14.5} fill={color} />
    </svg>
  );
}

/**
 * Event Pin shape — white teardrop (21×26) behind a dark Location-Check icon.
 * The icon's check is a negative-space cutout, so the white teardrop behind
 * lets the check appear white.
 */
function EventPinShape({ color }: { color: string }) {
  return (
    <div
      style={{
        position: 'relative',
        width: 32,
        height: 32,
        flexShrink: 0,
        filter: SHAPE_SHADOW,
      }}
    >
      <svg
        aria-hidden
        width={21}
        height={26}
        viewBox="0 0 26 32"
        fill="none"
        style={{
          position: 'absolute',
          top: 3,
          left: 5.5,
          display: 'block',
        }}
        preserveAspectRatio="none"
      >
        <path d={TEARDROP_PATH} fill={OUTER_BODY_FILL} />
      </svg>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon name="Location-Check" size={32} color={color} />
      </div>
    </div>
  );
}

/**
 * Bike Delivery shape — 19×32 raster illustration of a top-down bike courier.
 * The artwork is a fixed PNG (inlined as base64 data URI) — no colour prop.
 */
function BikeDeliveryShape() {
  return (
    <img
      src={BIKE_DELIVERY_DATA_URI}
      alt=""
      aria-hidden
      width={19}
      height={32}
      style={{
        display: 'block',
        flexShrink: 0,
        objectFit: 'contain',
        filter: SHAPE_SHADOW,
      }}
    />
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                    */
/* ------------------------------------------------------------------ */

/**
 * Map Icon — base map marker component for LETA map interfaces.
 *
 * Five variants:
 * - **object-pin** — teardrop with an inner coloured circle + an icon (default: User)
 * - **numeric-pin** — teardrop with an inner coloured circle + a number (`text`)
 * - **badge** — circle with an inner coloured fill + text or icon
 * - **event-pin** — solid teardrop with built-in Location-Check icon
 * - **bike-delivery** — fixed 19×32 raster illustration of a top-down bike courier
 *
 * Interactive — consumers attach onClick / onMouseEnter handlers for
 * tooltips, drawers, modals, etc.
 */
export const MapIcon = React.forwardRef<HTMLDivElement, MapIconProps>(
  function MapIcon(
    {
      variant,
      color,
      icon,
      text,
      style,
      onClick,
      ...rest
    },
    ref,
  ) {
    const isObjectPin = variant === 'object-pin';
    const isNumericPin = variant === 'numeric-pin';
    const isBadge = variant === 'badge';
    const isEventPin = variant === 'event-pin';
    const isBikeDelivery = variant === 'bike-delivery';

    /* Effective colour for the inner shape (or icon for event-pin) */
    const effectiveColor =
      color ?? (isEventPin ? 'var(--icons-secondary-default)' : DEFAULT_INNER_COLOR);

    /* Layout dimensions */
    const width = isBikeDelivery ? 19 : isObjectPin || isNumericPin ? 26 : 32;
    const height = 32;

    /* Numeric Pin requires text */
    if (process.env.NODE_ENV !== 'production' && isNumericPin && !text) {
      // eslint-disable-next-line no-console
      console.warn(
        '[MapIcon] variant="numeric-pin" requires a `text` prop (e.g. text="5").',
      );
    }

    return (
      <div
        ref={ref}
        style={{
          position: 'relative',
          display: 'inline-flex',
          width,
          height,
          flexShrink: 0,
          cursor: onClick ? 'pointer' : undefined,
          ...style,
        }}
        onClick={onClick}
        {...rest}
      >
        {/* Shape layer */}
        {(isObjectPin || isNumericPin) && <PinShape color={effectiveColor} />}
        {isBadge && <BadgeShape color={effectiveColor} />}
        {isEventPin && <EventPinShape color={effectiveColor} />}
        {isBikeDelivery && <BikeDeliveryShape />}

        {/* Content overlay (skipped for event-pin and bike-delivery — both self-contained) */}
        {!isEventPin && !isBikeDelivery && (
          <div
            style={{
              position: 'absolute',
              ...(isObjectPin || isNumericPin
                ? { top: 5, left: 5, width: 16, height: 16 }
                : { inset: 0 }),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {isObjectPin && (
              <Icon name={icon ?? 'User'} outlined={false} size={16} color={CONTENT_COLOR} />
            )}
            {isBadge && icon && (
              <Icon name={icon} outlined={false} size={16} color={CONTENT_COLOR} />
            )}
            {(isNumericPin || (isBadge && !icon && text != null)) && (
              <span
                className="text-label-m-semibold"
                style={{
                  color: CONTENT_COLOR,
                  whiteSpace: 'nowrap',
                  textAlign: 'center',
                  lineHeight: 1,
                }}
              >
                {text}
              </span>
            )}
          </div>
        )}
      </div>
    );
  },
);

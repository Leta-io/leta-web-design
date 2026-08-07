import * as React from 'react';
import { Icon } from '@leta-io/icons';
import { HoverTip } from '../Tooltip/HoverTip.js';

export type DurationLabelVariant = 'finished' | 'active';
export type DurationLabelStatus = 'on-target' | 'delayed' | 'at-risk';

export interface DurationLabelProps
  extends Omit<React.HTMLAttributes<HTMLSpanElement>, 'children'> {
  /**
   * `finished` — a completed/measured duration: a status icon paired with greyed
   * time. `active` — a live, running timer: no icon, the time itself is coloured
   * by status. Default `finished`.
   */
  variant?: DurationLabelVariant;
  /**
   * The timing status. Drives the Finished icon (on-target = green Check-Circle,
   * delayed = red Cancel-Circle) and the Active time colour (on-target = default,
   * at-risk = warning/orange, delayed = error/red). Default `on-target`.
   *
   * Note: Figma has no `finished` + `at-risk` variant — that combination renders
   * greyed time with no leading icon.
   */
  status?: DurationLabelStatus;
  /** The duration text. Caller-supplied (e.g. "1h 24m 12s"). Default "0h 0m 0s". */
  time?: string;
  /**
   * Hover tooltip on the Finished status icon (e.g. "Delivery on time" /
   * "Delivery delayed"), per the order-table wireframes. No tooltip when
   * omitted; ignored by the Active variant (which renders no icon).
   */
  iconTooltip?: string;
}

/** Active-variant time colour by status. */
const ACTIVE_TEXT: Record<DurationLabelStatus, string> = {
  'on-target': 'var(--text-default-label)',
  'at-risk': 'var(--text-warning-label)',
  delayed: 'var(--text-error-label)',
};

/**
 * Duration Labels — a compact inline label that communicates a duration and its
 * status, used inside table Duration cells and timing summaries (Figma
 * `4445:107943`).
 *
 * - **Finished** pairs a status icon with greyed-out time for a completed
 *   duration: green `Check-Circle` = on target, red `Cancel-Circle` = delayed.
 * - **Active** shows a live, running time coloured by status: default = on
 *   target, orange = at risk, red = delayed.
 *
 * Presentational and non-interactive; the accessible name is the `time` text and
 * the status icon is decorative.
 */
export const DurationLabel = React.forwardRef<HTMLSpanElement, DurationLabelProps>(
  function DurationLabel(
    { variant = 'finished', status = 'on-target', time = '0h 0m 0s', iconTooltip, className, style, ...rest },
    ref,
  ) {
    const finished = variant === 'finished';

    // Finished status icon (none for the unsupported finished + at-risk pairing).
    let icon: React.ReactNode = null;
    if (finished) {
      if (status === 'on-target') {
        icon = <Icon name="Check-Circle" outlined={false} size={16} color="var(--icons-success-default)" />;
      } else if (status === 'delayed') {
        icon = <Icon name="Cancel-Circle" size={16} color="var(--icons-error-default)" />;
      }
    }

    const timeColor = finished ? 'var(--text-disabled-label)' : ACTIVE_TEXT[status];

    return (
      <span
        ref={ref}
        role="img"
        aria-label={time}
        className={className}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 'var(--spacing-8px)',
          whiteSpace: 'nowrap',
          ...style,
        }}
        {...rest}
      >
        {icon && (
          iconTooltip ? (
            <HoverTip label={iconTooltip} style={{ flexShrink: 0 }}>
              {icon}
            </HoverTip>
          ) : (
            <span aria-hidden style={{ flexShrink: 0, display: 'flex' }}>
              {icon}
            </span>
          )
        )}
        <span className="text-label-m-medium" style={{ color: timeColor, fontVariantNumeric: 'tabular-nums' }}>
          {time}
        </span>
      </span>
    );
  },
);

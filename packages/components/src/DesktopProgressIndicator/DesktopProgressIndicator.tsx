import * as React from 'react';
import { Icon } from '@leta-io/icons';

export type DesktopProgressIndicatorVariant = 'upload' | 'task' | 'system-process';

export interface DesktopProgressIndicatorProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children'> {
  /**
   * The kind of process — drives both layout and bar colour:
   * - `upload` — **horizontal**: track + a trailing `%` (replaced by a check
   *   icon at 100%). Green bar. No helper text.
   * - `task` — **vertical**: track with a helper line beneath. Green bar.
   * - `system-process` — **vertical**: track with a helper line beneath. Blue bar.
   */
  variant?: DesktopProgressIndicatorVariant;
  /** Completion percentage, 0–100. */
  value: number;
  /** Helper line beneath the bar — `task` / `system-process` only (e.g. "3 of 10 steps completed"). */
  helperText?: string;
}

const BAR_COLOR: Record<DesktopProgressIndicatorVariant, string> = {
  upload: 'var(--surface-success-task-progress-bar)',
  task: 'var(--surface-success-task-progress-bar)',
  'system-process': 'var(--surface-information-progress-bar)',
};

/**
 * Desktop Progress Indicator — a linear progress bar that communicates the
 * completion of an ongoing or measured process. (Distinct from the 14×14
 * Progress Tracker donut used in mobile badges.)
 *
 * **When to use:** for determinate progress with a known percentage.
 *
 * **When NOT to use:** for indeterminate spinners or tiny inline indicators.
 *
 * Three Types (`7353:37255`), each with its **own layout** — do not conflate:
 * - **Upload** — horizontal; green bar + a trailing `%` that becomes a green
 *   `Check-Circle` at 100%. No helper text.
 * - **Task** — vertical; green bar with a helper line beneath (e.g. "3 of 10
 *   steps completed").
 * - **System Process** — vertical; **blue** bar with a helper line beneath
 *   (e.g. "API usage: 60% of limit", "Storage used"). System-driven / background work.
 *
 * 8px pill track; `role="progressbar"` with aria value attributes.
 */
export const DesktopProgressIndicator = React.forwardRef<
  HTMLDivElement,
  DesktopProgressIndicatorProps
>(function DesktopProgressIndicator(
  { variant = 'upload', value, helperText, className, style, ...rest },
  ref,
) {
  const pct = Math.max(0, Math.min(100, value));

  const track = (trackStyle: React.CSSProperties) => (
    <div
      style={{
        height: 8,
        borderRadius: 'var(--rounding-round)',
        backgroundColor: 'var(--surface-neutral-progress-bar-track)',
        overflow: 'hidden',
        ...trackStyle,
      }}
    >
      <div
        style={{
          width: `${pct}%`,
          height: '100%',
          borderRadius: 'var(--rounding-round)',
          backgroundColor: BAR_COLOR[variant],
          transition: 'width 300ms ease-out',
        }}
      />
    </div>
  );

  const ariaProps = {
    role: 'progressbar' as const,
    'aria-valuenow': Math.round(pct),
    'aria-valuemin': 0,
    'aria-valuemax': 100,
  };

  // Upload — horizontal: track + trailing % (check icon at 100%).
  if (variant === 'upload') {
    return (
      <div
        ref={ref}
        {...ariaProps}
        className={className}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--spacing-8px)',
          boxSizing: 'border-box',
          ...style,
        }}
        {...rest}
      >
        {track({ flex: 1 })}
        {pct >= 100 ? (
          <Icon name="Check-Circle" outlined={false} size={20} color="var(--icons-success-default)" aria-hidden />
        ) : (
          <span
            className="text-label-m-regular"
            style={{ color: 'var(--text-default-label)', flexShrink: 0 }}
          >
            {Math.round(pct)}%
          </span>
        )}
      </div>
    );
  }

  // Task / System Process — vertical: track with a helper line beneath.
  return (
    <div
      ref={ref}
      {...ariaProps}
      className={className}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: 'var(--spacing-8px)',
        boxSizing: 'border-box',
        ...style,
      }}
      {...rest}
    >
      {track({ width: '100%' })}
      {helperText && (
        <span
          className="text-body-s-regular"
          style={{ width: '100%', color: 'var(--text-default-helper)' }}
        >
          {helperText}
        </span>
      )}
    </div>
  );
});

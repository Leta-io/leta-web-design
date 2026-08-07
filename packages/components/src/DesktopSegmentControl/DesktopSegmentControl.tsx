import * as React from 'react';
import type { IconName } from '@leta-io/icons';
import { ViewSwitcherTab } from '../ViewSwitcherTab/ViewSwitcherTab.js';
import { SegmentSwitcherTab } from '../SegmentSwitcherTab/SegmentSwitcherTab.js';

export type DesktopSegmentControlVariant = 'view' | 'segment';

/** A single segment within a Desktop Segment Control. */
export interface DesktopSegmentControlItem {
  /** Segment label text. */
  label: string;
  /** Optional icon before the label. */
  leadingIcon?: IconName;
}

export interface DesktopSegmentControlProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children' | 'onChange'> {
  /**
   * `view` — compact (ViewSwitcherTab); switches the layout of the current
   * content without changing data (e.g. Grid vs List). `segment` — prominent
   * (SegmentSwitcherTab); high-level navigation within a drawer/panel.
   */
  variant: DesktopSegmentControlVariant;
  /** The segments to render, left to right. */
  segments: DesktopSegmentControlItem[];
  /** Index of the active segment. Controlled. */
  value: number;
  /** Fired with the clicked segment's index. */
  onChange: (index: number) => void;
}

/**
 * Desktop Segment Control — a segmented control that groups 2+ mutually
 * exclusive options into a single track, with exactly one active.
 *
 * Two sizes from one Figma set (`5778:230039`):
 * - **`view`** — compact (wraps {@link ViewSwitcherTab}); toggles how the same
 *   data is displayed (Grid / List / Map). Sits near the content it controls.
 * - **`segment`** — prominent (wraps {@link SegmentSwitcherTab}); high-level
 *   navigation within a drawer/panel, swapping the body content.
 *
 * **When NOT to use:** top-level page navigation (use Page Tabs Control),
 * filtering (use Top Filter), binary on/off (use Toggle), or long/overflowing
 * option sets.
 *
 * Data-driven: `value`/`onChange` enforce single-active. Renders a `<div>`
 * track (`role="group"`); each tab exposes `aria-pressed`.
 */
export const DesktopSegmentControl = React.forwardRef<HTMLDivElement, DesktopSegmentControlProps>(
  function DesktopSegmentControl(
    { variant, segments, value, onChange, className, style, ...rest },
    ref,
  ) {
    const Tab = variant === 'view' ? ViewSwitcherTab : SegmentSwitcherTab;
    // View track hugs its 32px tabs with 4px padding (→ 40px); Segment track
    // hugs its 40px tabs with 8px padding (→ 56px).
    const trackPadding = variant === 'view' ? 'var(--padding-4px)' : 'var(--padding-8px)';

    return (
      <div
        ref={ref}
        role="group"
        className={className}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 'var(--spacing-8px)',
          padding: trackPadding,
          borderRadius: 'var(--rounding-lg)',
          backgroundColor: 'var(--surface-neutral-segment-track)',
          boxSizing: 'border-box',
          ...style,
        }}
        {...rest}
      >
        {segments.map((seg, i) => (
          <Tab
            key={i}
            label={seg.label}
            leadingIcon={seg.leadingIcon}
            active={i === value}
            aria-pressed={i === value}
            onClick={() => onChange(i)}
          />
        ))}
      </div>
    );
  },
);

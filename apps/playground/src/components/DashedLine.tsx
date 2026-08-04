import * as React from 'react';

/**
 * The LETA prototype dashed-line convention (set 2026-08-04).
 *
 * Every dashed line across the prototypes is drawn the SAME way, matching the
 * designer's Figma stroke settings: **Style Dashed · Dash 6 · Gap 6 · Dash cap
 * ROUND**, stroke color `--border-neutral-default`. Two earlier attempts were
 * both wrong and reported:
 *   1. A `repeating-linear-gradient` on a 1px-wide `<div>` — rendered visibly
 *      faint (a hairline element at a fractional device-pixel anti-aliases
 *      across two columns, washing out the color).
 *   2. A native CSS `border-left: … dashed` — crisp, but browsers render dash
 *      caps SQUARE, not the round caps the Figma stroke uses, and choose their
 *      own dash length rather than an exact 6/6.
 *
 * The correct reproduction is an inline SVG `<line>` with `stroke-linecap:
 * round` and `stroke-dasharray: 6 6`, which is both crisp (pixel-aligned 1px
 * stroke) AND round-capped. The SVG has no `viewBox`, so user units are CSS
 * px and the 6/6 dash rhythm never stretches; `height="100%"` lets it fill a
 * flex item or a fixed-height box set via `style`.
 *
 * Use this component for ANY dashed line (timeline connectors, address
 * connectors, demarcators, etc.) — do not hand-roll a gradient or a CSS dashed
 * border.
 */
export function DashedLine({
  orientation = 'vertical',
  style,
}: {
  /** `vertical` (default) draws a top-to-bottom line; `horizontal` left-to-right. */
  orientation?: 'vertical' | 'horizontal';
  /** Box sizing — set a fixed `height`/`width`, or `flex: '1 0 0'` to fill. */
  style?: React.CSSProperties;
}): React.ReactElement {
  const vertical = orientation === 'vertical';
  return (
    <svg
      aria-hidden
      preserveAspectRatio="none"
      width={vertical ? 1 : '100%'}
      height={vertical ? '100%' : 1}
      style={{ display: 'block', flexShrink: 0, overflow: 'visible', ...style }}
    >
      <line
        x1={vertical ? 0.5 : 0}
        y1={vertical ? 0 : 0.5}
        x2={vertical ? 0.5 : '100%'}
        y2={vertical ? '100%' : 0.5}
        stroke="var(--border-neutral-default)"
        strokeWidth={1}
        strokeDasharray="6 6"
        strokeLinecap="round"
      />
    </svg>
  );
}

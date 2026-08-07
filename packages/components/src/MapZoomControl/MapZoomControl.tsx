import * as React from 'react';
import { Icon } from '@leta-io/icons';

export interface MapZoomControlProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Called when the zoom-in (+) button is clicked. */
  onZoomIn?: () => void;
  /** Called when the zoom-out (−) button is clicked. */
  onZoomOut?: () => void;
  /** Disables the zoom-in button (e.g. when already at maximum zoom). */
  disableZoomIn?: boolean;
  /** Disables the zoom-out button (e.g. when already at minimum zoom). */
  disableZoomOut?: boolean;
}

const STYLE_ID = 'leta-map-zoom-control-styles';
const ZOOM_STYLES = `
  .leta-map-zoom-btn:focus-visible {
    outline: var(--stroke-sm) solid var(--border-secondary-component-focus);
    outline-offset: 4px;
  }
`;

function ensureStyles(): void {
  if (typeof document === 'undefined') return;
  if (document.getElementById(STYLE_ID)) return;
  const el = document.createElement('style');
  el.id = STYLE_ID;
  el.textContent = ZOOM_STYLES;
  document.head.appendChild(el);
}

export const MapZoomControl = React.forwardRef<HTMLDivElement, MapZoomControlProps>(
  function MapZoomControl(
    {
      onZoomIn,
      onZoomOut,
      disableZoomIn = false,
      disableZoomOut = false,
      className,
      style,
      ...rest
    },
    ref,
  ) {
    ensureStyles();

    return (
      <div
        ref={ref}
        className={className}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          width: 40,
          height: 96,
          padding: 'var(--padding-8px)',
          gap: 'var(--spacing-16px)',
          borderRadius: 'var(--rounding-lg)',
          backgroundColor: 'var(--surface-neutral-bg-default)',
          // inset stroke + directional map-panel shadow (matches --shadow-neutral-3 intent)
          boxShadow:
            'inset 0 0 0 var(--stroke-xs) var(--border-neutral-default), var(--shadow-neutral-3)',
          boxSizing: 'border-box',
          ...style,
        }}
        {...rest}
      >
        <button
          type="button"
          className="leta-map-zoom-btn"
          onClick={onZoomIn}
          disabled={disableZoomIn}
          aria-label="Zoom in"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 24,
            height: 24,
            background: 'none',
            border: 'none',
            padding: 0,
            borderRadius: 'var(--rounding-sm)',
            cursor: disableZoomIn ? 'not-allowed' : 'pointer',
            opacity: disableZoomIn ? 0.4 : 1,
            color: 'var(--icons-neutral-default)',
            transition: 'opacity 150ms ease-out',
            flexShrink: 0,
          }}
        >
          {/* Figma uses the filled `material-symbols:add-rounded` glyph; the
              library-wide outlined default would render a thinner plus. */}
          <Icon name="Add" outlined={false} size={24} />
        </button>

        <div
          aria-hidden="true"
          style={{
            width: '100%',
            height: 0,
            borderTop: 'var(--stroke-xs) solid var(--border-neutral-default)',
            flexShrink: 0,
          }}
        />

        <button
          type="button"
          className="leta-map-zoom-btn"
          onClick={onZoomOut}
          disabled={disableZoomOut}
          aria-label="Zoom out"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 24,
            height: 24,
            background: 'none',
            border: 'none',
            padding: 0,
            borderRadius: 'var(--rounding-sm)',
            cursor: disableZoomOut ? 'not-allowed' : 'pointer',
            opacity: disableZoomOut ? 0.4 : 1,
            color: 'var(--icons-neutral-default)',
            transition: 'opacity 150ms ease-out',
            flexShrink: 0,
          }}
        >
          {/* Filled `material-symbols:remove-rounded`, per Figma — see Zoom in. */}
          <Icon name="Minus" outlined={false} size={24} />
        </button>
      </div>
    );
  },
);

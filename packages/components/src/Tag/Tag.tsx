import * as React from 'react';
import { Icon } from '@leta-io/icons';

export interface TagProps
  extends Omit<React.HTMLAttributes<HTMLSpanElement>, 'children'> {
  /** Tag label text. */
  label: string;
  /**
   * When provided, renders a trailing Cancel icon as a <button>.
   * Callback fires on button click.
   */
  onRemove?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  /** Accessible label for the remove button. Default: "Remove". */
  removeLabel?: string;
}

export const Tag = React.forwardRef<HTMLSpanElement, TagProps>(
  function Tag(
    { label, onRemove, removeLabel = 'Remove', className, style, ...rest },
    ref,
  ) {
    const [hovered, setHovered] = React.useState(false);
    const [pressed, setPressed] = React.useState(false);

    const bg = pressed
      ? 'var(--surface-information-desktop-badge-pressed)'
      : hovered
        ? 'var(--surface-information-desktop-badge-hover)'
        : 'var(--surface-information-desktop-badge)';

    const border = pressed
      ? 'var(--border-information-desktop-badge-pressed)'
      : hovered
        ? 'var(--border-information-desktop-badge-hover)'
        : 'var(--border-information-desktop-badge)';

    return (
      <span
        ref={ref}
        className={`text-label-s-medium${className ? ` ${className}` : ''}`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 'var(--spacing-4px)',
          paddingTop: 'var(--padding-4px)',
          paddingBottom: 'var(--padding-4px)',
          paddingLeft: 'var(--padding-6px)',
          paddingRight: onRemove ? 'var(--padding-4px)' : 'var(--padding-6px)',
          borderRadius: 'var(--rounding-md)',
          backgroundColor: bg,
          color: 'var(--text-information-label)',
          boxShadow: `inset 0 0 0 var(--stroke-xs) ${border}`,
          whiteSpace: 'nowrap',
          boxSizing: 'border-box',
          userSelect: 'none',
          transition: 'background-color 150ms ease-out, box-shadow 150ms ease-out',
          ...style,
        }}
        onMouseEnter={(e) => { setHovered(true); rest.onMouseEnter?.(e); }}
        onMouseLeave={(e) => { setHovered(false); setPressed(false); rest.onMouseLeave?.(e); }}
        onMouseDown={(e) => { setPressed(true); rest.onMouseDown?.(e); }}
        onMouseUp={(e) => { setPressed(false); rest.onMouseUp?.(e); }}
        {...rest}
      >
        {label}
        {onRemove && (
          <button
            type="button"
            aria-label={removeLabel}
            onClick={onRemove}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'none',
              border: 'none',
              padding: 0,
              margin: 0,
              cursor: 'pointer',
              color: 'inherit',
              lineHeight: 0,
            }}
          >
            <Icon name="Cancel" size={16} color="var(--icons-information-badge)" />
          </button>
        )}
      </span>
    );
  },
);

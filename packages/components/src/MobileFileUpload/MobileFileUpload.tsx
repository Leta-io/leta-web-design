import * as React from 'react';
import { Icon, type IconName } from '@leta-io/icons';

export interface MobileFileUploadImage {
  src: string;
  alt?: string;
}

export interface MobileFileUploadProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> {
  /** Label above the grid. Default "Attach an image". */
  label?: string;
  /** Show the label section. Default true. */
  showLabel?: boolean;
  /** Show an Info marker after the label. */
  showLabelIcon?: boolean;
  labelIcon?: IconName;
  /** Optional/Required tag after the label. Default `optional`. */
  tag?: 'none' | 'optional' | 'required';
  /** Uploaded image thumbnails. */
  images?: MobileFileUploadImage[];
  /** Number of trailing "Add Photo" tiles. Defaults to filling a 3-up row when empty, else 0. */
  addTiles?: number;
  /** "Add Photo" tile label. */
  addLabel?: string;
  /** Fires when an Add Photo tile is activated. */
  onAdd?: () => void;
  /** Fires with the index of the image whose delete badge was clicked. */
  onRemove?: (index: number) => void;
}

const STYLE_ID = 'leta-mobile-file-upload-styles';
const STYLES = `
  .leta-mfu__add, .leta-mfu__delete { cursor: pointer; }
  .leta-mfu__add:focus-visible, .leta-mfu__delete:focus-visible {
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

const TILE: React.CSSProperties = { width: 111, height: 104, flexShrink: 0, borderRadius: 'var(--rounding-lg)', boxSizing: 'border-box' };

/**
 * Mobile file upload — the `File Upload` type of Data Entry `38:42` (Mobile
 * variant). A 3-up grid of 111×104 tiles: "Add Photo" placeholders (icon + label
 * on `--surface-neutral-input-field` with a solid border) and uploaded image
 * thumbnails with a red delete badge. (Desktop drag-zone is `FileUpload`.)
 */
export const MobileFileUpload = React.forwardRef<HTMLDivElement, MobileFileUploadProps>(function MobileFileUpload(
  {
    label = 'Attach an image',
    showLabel = true,
    showLabelIcon = false,
    labelIcon = 'Info',
    tag = 'optional',
    images = [],
    addTiles,
    addLabel = 'Add Photo',
    onAdd,
    onRemove,
    style,
    ...rest
  },
  ref,
) {
  ensureStyles();
  const adds = addTiles ?? (images.length === 0 ? 3 : 0);

  return (
    <div
      ref={ref}
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 'var(--spacing-8px)', width: 350, boxSizing: 'border-box', ...style }}
      {...rest}
    >
      {showLabel && (
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 'var(--spacing-4px)', minHeight: 20 }}>
          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 'var(--spacing-8px)' }}>
            <span className="text-label-m-medium" style={{ color: 'var(--text-default-label-idle)' }}>{label}</span>
            {showLabelIcon && (
              <span style={{ display: 'flex', color: 'var(--icons-neutral-idle)', flexShrink: 0 }}>
                <Icon name={labelIcon} outlined size={18} />
              </span>
            )}
          </div>
          {tag !== 'none' && (
            <span className="text-label-m-regular" style={{ color: 'var(--text-default-label-idle)' }}>
              {tag === 'optional' ? '(Optional)' : '(Required)'}
            </span>
          )}
        </div>
      )}

      {/* Tile grid */}
      <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 'var(--spacing-8px)' }}>
        {images.map((img, i) => (
          <div key={`img-${i}`} style={{ ...TILE, position: 'relative', overflow: 'visible' }}>
            <img
              src={img.src}
              alt={img.alt ?? ''}
              style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'var(--rounding-lg)', display: 'block' }}
            />
            <button
              type="button"
              className="leta-mfu__delete"
              aria-label="Remove image"
              onClick={() => onRemove?.(i)}
              style={{
                position: 'absolute', top: 3, right: 3, width: 24, height: 24,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: 0, borderRadius: 'var(--rounding-round)', padding: 0,
                backgroundColor: 'var(--surface-neutral-bg-default)',
                color: 'var(--icons-error-default)',
              }}
            >
              <Icon name="Delete" outlined size={16} />
            </button>
          </div>
        ))}
        {Array.from({ length: adds }).map((_, i) => (
          <button
            key={`add-${i}`}
            type="button"
            className="leta-mfu__add"
            onClick={onAdd}
            style={{
              ...TILE,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 'var(--padding-10px)',
              border: 'var(--stroke-xs) dashed var(--border-neutral-default)',
              backgroundColor: 'var(--surface-neutral-input-field)',
            }}
          >
            <span style={{ display: 'flex', color: 'var(--icons-neutral-idle)' }}>
              <Icon name="Image-Upload" outlined={false} size={40} />
            </span>
            <span className="text-label-s-regular" style={{ color: 'var(--text-default-label-idle)' }}>{addLabel}</span>
          </button>
        ))}
      </div>
    </div>
  );
});

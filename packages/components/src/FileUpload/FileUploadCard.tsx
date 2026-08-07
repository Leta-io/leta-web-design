import * as React from 'react';
import { Icon } from '@leta-io/icons';
import { Button } from '../Button/Button.js';
import { DesktopProgressIndicator } from '../DesktopProgressIndicator/DesktopProgressIndicator.js';

export type FileUploadCardStatus = 'uploading' | 'uploaded';

export interface FileUploadCardProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children'> {
  /** `uploading` → Loading glyph + progress bar; `uploaded` → Check-Circle glyph, no bar. */
  status?: FileUploadCardStatus;
  /** File name (Label/M/SemiBold). */
  filename: string;
  /** File size, e.g. "32MB" (Label/S/Regular). */
  size?: string;
  /** Upload progress 0–100 (`uploading` only). */
  progress?: number;
  /** Fires when the trailing × is clicked. */
  onRemove?: () => void;
}

/**
 * A single row of the File Upload queue — the "File Upload Cards" sub-instance of
 * Data Entry `38:42` (`Property 1 = Uploading | Uploaded`). A `--surface-neutral-
 * bg-tertiary` card with a leading status glyph, filename + size, a trailing Ghost
 * Icon-Only remove button, and (when uploading) a `DesktopProgressIndicator`.
 */
export const FileUploadCard = React.forwardRef<HTMLDivElement, FileUploadCardProps>(function FileUploadCard(
  { status = 'uploading', filename, size, progress = 0, onRemove, style, ...rest },
  ref,
) {
  return (
    <div
      ref={ref}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--spacing-8px)',
        boxSizing: 'border-box',
        width: '100%',
        padding: 'var(--padding-12px)',
        borderRadius: 'var(--rounding-lg)',
        backgroundColor: 'var(--surface-neutral-bg-muted)',
        ...style,
      }}
      {...rest}
    >
      {/* Filename + remove button */}
      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--spacing-20px)' }}>
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 'var(--spacing-8px)', flex: 1, minWidth: 0 }}>
          <span style={{ flexShrink: 0, display: 'flex', color: 'var(--icons-neutral-default)' }}>
            <Icon name={status === 'uploaded' ? 'Check-Circle' : 'Loading'} outlined size={20} />
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4px)', flex: 1, minWidth: 0 }}>
            <span className="text-label-m-semibold" style={{ color: 'var(--text-default-heading)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {filename}
            </span>
            {size && (
              <span className="text-label-s-regular" style={{ color: 'var(--text-default-sub-body)' }}>{size}</span>
            )}
          </div>
        </div>
        <Button variant="ghost" size="small" iconOnly="Cancel" aria-label="Remove file" onClick={onRemove} />
      </div>

      {/* Progress (uploading only) */}
      {status === 'uploading' && <DesktopProgressIndicator variant="upload" value={progress} />}
    </div>
  );
});

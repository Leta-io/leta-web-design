import * as React from 'react';
import { Icon, type IconName } from '@leta-io/icons';
import { Button } from '../Button/Button.js';

export interface FileUploadProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> {
  /** Label above the drop zone. Default "Attach an image". */
  label?: string;
  /** Show the label section. Default true. */
  showLabel?: boolean;
  /** Show an Info marker after the label. */
  showLabelIcon?: boolean;
  labelIcon?: IconName;
  /** Optional/Required tag after the label. Default `optional`. */
  tag?: 'none' | 'optional' | 'required';
  /** Prompt text inside the drop zone. */
  promptText?: string;
  /** Browse button label. */
  browseLabel?: string;
  /** Max-size hint below the button. */
  maxSizeText?: string;
  /** `accept` attribute for the file input. */
  accept?: string;
  /** Allow multiple files. */
  multiple?: boolean;
  /** Fires with the selected/dropped files. */
  onFiles?: (files: FileList) => void;
  /** File-queue slot — render `<FileUploadCard>` groups (Uploading/Uploaded) here. */
  children?: React.ReactNode;
}

/**
 * Desktop drag-and-drop file upload zone — the `File Upload` type of Data Entry
 * `38:42` (Desktop variant). Label + a dashed drop zone with a "Browse to upload"
 * Secondary button + max-size hint; a hidden file input is triggered by Browse,
 * and drag-drop is supported via `onFiles`. The Uploading / Uploaded states render
 * a queue of `<FileUploadCard>`s in the `children` slot. (Figma has no disabled
 * state.) The mobile image-tile grid is the separate `MobileFileUpload` component.
 */
export const FileUpload = React.forwardRef<HTMLDivElement, FileUploadProps>(function FileUpload(
  {
    label = 'Attach an image',
    showLabel = true,
    showLabelIcon = false,
    labelIcon = 'Info',
    tag = 'optional',
    promptText = 'Drag or drop your file here or',
    browseLabel = 'Browse to upload',
    maxSizeText = 'Maximum file size: 100 MB',
    accept,
    multiple = false,
    onFiles,
    children,
    style,
    ...rest
  },
  ref,
) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = React.useState(false);

  const handleFiles = (files: FileList | null) => {
    if (files && files.length) onFiles?.(files);
  };

  return (
    <div
      ref={ref}
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 'var(--spacing-20px)', width: 350, boxSizing: 'border-box', ...style }}
      {...rest}
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 'var(--spacing-8px)' }}>
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

        {/* Drop zone (dashed border) */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            handleFiles(e.dataTransfer.files);
          }}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 'var(--spacing-16px)',
            boxSizing: 'border-box',
            width: '100%',
            minHeight: 180,
            padding: 'var(--padding-16px)',
            borderRadius: 'var(--rounding-lg)',
            border: `var(--stroke-xs) dashed ${dragOver ? 'var(--border-secondary-component-focus)' : 'var(--border-neutral-default)'}`,
            backgroundColor: 'var(--surface-neutral-input-field)',
          }}
        >
          <span className="text-label-m-regular" style={{ color: 'var(--text-default-label)', textAlign: 'center' }}>
            {promptText}
          </span>
          <Button variant="secondary" size="small" onClick={() => inputRef.current?.click()}>
            {browseLabel}
          </Button>
          <span className="text-label-s-regular" style={{ color: 'var(--text-default-label-idle)', textAlign: 'center' }}>
            {maxSizeText}
          </span>
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            multiple={multiple}
            onChange={(e) => handleFiles(e.target.files)}
            style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', border: 0 }}
          />
        </div>
      </div>

      {/* File queue (Uploading / Uploaded groups of <FileUploadCard>) */}
      {children}
    </div>
  );
});

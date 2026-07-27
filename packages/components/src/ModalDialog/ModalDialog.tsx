import * as React from 'react';
import type { IconName } from '@leta/icons';
import { ModalShell } from '../Modal/ModalShell.js';
import { ModalHeaders } from '../ModalHeaders/ModalHeaders.js';
import { FooterFrame } from '../FooterFrame/FooterFrame.js';
import { Button } from '../Button/Button.js';
import { TextArea } from '../TextArea/TextArea.js';
import { InputField } from '../InputField/InputField.js';
import { OptionCard } from '../OptionCard/OptionCard.js';
import { SIGNATURE_IMAGE } from './signature-asset.js';
import { DOORSTEP_DELIVERY_IMAGE } from './image-asset.js';

export type ModalDialogVariant =
  | 'comment'
  | 'form'
  | 'signature'
  | 'image'
  | 'multi-choice';

export interface ModalDialogProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  /** Which single-purpose body. Default `comment`. */
  variant?: ModalDialogVariant;
  /** Modal title. Default "Title". */
  title?: string;
  /** Body override — replaces the variant's default body content. */
  children?: React.ReactNode;
  /** `image` variant — the image source. Defaults to the Figma sample delivery photo. */
  imageSrc?: string;
  /** `signature` variant — a captured-signature image source. Defaults to the Figma sample signature. */
  signatureSrc?: string;
  /** Cancel/dismiss label. Default "Close". */
  cancelLabel?: string;
  /**
   * Render the confirm button. Default true; read-only viewers (the `image` /
   * `signature` proof dialogs, whose Figma variants carry a single Close
   * action) pass false for a Close-only footer.
   */
  showConfirm?: boolean;
  /** Confirm label. Default "Confirm". */
  confirmLabel?: string;
  /**
   * Style the confirm button as destructive red (`Button variant="destructive"`)
   * instead of primary — Doc 3 §5: "primary styled to the action's nature".
   * Default false.
   */
  destructive?: boolean;
  /** Disable the confirm button (e.g. until a required selection is made). Default false. */
  confirmDisabled?: boolean;
  /** Optional leading icon on the confirm button (outlined), e.g. the Cancel Order trash. */
  confirmIconLeft?: IconName;
  onCancel?: () => void;
  onConfirm?: () => void;
  /** Header close handler. Falls back to `onCancel`. */
  onClose?: () => void;
  /**
   * Fixed body height override (px) — replaces the variant's default so a
   * children-composed body can match its wireframe exactly (e.g. the Cancel
   * Order modal's 454px multi-choice body).
   */
  bodyHeight?: number;
}

/** Per-variant body height (px). undefined ⇒ shell hugs content. */
const BODY_HEIGHT: Partial<Record<ModalDialogVariant, number>> = {
  signature: 352,
  image: 352,
  'multi-choice': 352,
};

/** Body wrapper padding/gap per variant. */
function bodyStyleFor(variant: ModalDialogVariant): React.CSSProperties {
  // Signature/Image use the 480-wide rect → 16px horizontal padding.
  // Comment/Form/Multi-choice use 20px all-round (472-wide content).
  const tight = variant === 'signature' || variant === 'image';
  return {
    padding: tight ? '24px 16px' : 20,
    gap: 24,
    alignItems: 'flex-start',
  };
}

const RECT: React.CSSProperties = {
  width: 480,
  height: 304,
  borderRadius: 'var(--rounding-lg)',
  backgroundColor: 'var(--surface-neutral-bg-default)',
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  flexShrink: 0,
};

function defaultBody(variant: ModalDialogVariant, imageSrc?: string, signatureSrc?: string): React.ReactNode {
  switch (variant) {
    case 'comment':
      return (
        <TextArea
          showLabel={false}
          showHelper={false}
          showCounter
          placeholder="Some descriptive text here would be very nice to see"
          style={{ width: '100%' }}
        />
      );
    case 'form':
      return (
        <div style={{ display: 'flex', flexDirection: 'row', gap: 32, width: '100%' }}>
          <InputField label="Label Text" showHelper={false} placeholder="Field Text" style={{ flex: 1 }} />
          <InputField label="Label Text" showHelper={false} placeholder="Field Text" style={{ flex: 1 }} />
        </div>
      );
    case 'signature':
      return (
        <div
          role="img"
          aria-label="Signature"
          style={{
            ...RECT,
            backgroundImage: `url(${signatureSrc ?? SIGNATURE_IMAGE})`,
            boxShadow: 'inset 0 0 0 var(--stroke-sm) var(--border-neutral-default)',
          }}
        />
      );
    case 'image':
      return (
        <div
          role="img"
          aria-label="Preview"
          style={{
            ...RECT,
            backgroundImage: `url(${imageSrc ?? DOORSTEP_DELIVERY_IMAGE})`,
            // Grey backdrop while the image loads (`--surface-neutral-bg-tertiary`
            // is not a real token — it resolved to transparent).
            backgroundColor: 'var(--surface-neutral-bg-muted)',
            boxShadow: 'inset 0 0 0 var(--stroke-xs) var(--border-neutral-default)',
          }}
        />
      );
    case 'multi-choice':
      // Figma's Options frame: 7 Option Cards stacked, gap 16. The body is a
      // fixed 352px and scrolls (the option list is taller). The cards have
      // NO trailing element — selection is shown by the Active border alone.
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%' }}>
          {Array.from({ length: 7 }).map((_, i) => (
            <OptionCard key={i} title="Text" description="Enter description here" showTrailing={false} />
          ))}
        </div>
      );
  }
}

/**
 * Modal Dialog (`1317:4855`) — a 512px-wide single-purpose dialog for one focused
 * task: capturing a short input or a small form, previewing a signature or image,
 * or picking from a set of choices. Shell = `ModalHeaders` (default) + body +
 * `FooterFrame` (Close / Confirm). Five `variant`s set the body:
 * - **comment** — a `TextArea` (counter, no label).
 * - **form** — a two-column row of `InputField`s.
 * - **signature** — a bordered **preview** of a captured signature (480×304;
 *   override via `signatureSrc`).
 * - **image** — an image **preview** (480×304, e.g. proof of delivery;
 *   override via `imageSrc`).
 * - **multi-choice** — a vertical list of `OptionCard`s.
 *
 * Provide `children` to replace any variant's body.
 */
export const ModalDialog = React.forwardRef<HTMLDivElement, ModalDialogProps>(
  function ModalDialog(
    {
      variant = 'comment',
      title = 'Title',
      children,
      imageSrc,
      signatureSrc,
      cancelLabel = 'Close',
      confirmLabel = 'Confirm',
      destructive = false,
      confirmDisabled = false,
      confirmIconLeft,
      onCancel,
      onConfirm,
      showConfirm = true,
      onClose,
      bodyHeight,
      ...rest
    },
    ref,
  ) {
    return (
      <ModalShell
        ref={ref}
        width={512}
        rounded
        role="dialog"
        aria-label={title}
        onEscape={onClose ?? onCancel}
        header={
          <ModalHeaders variant="default" title={title} onClose={onClose ?? onCancel} showSecondaryContent={false} />
        }
        footer={
          <FooterFrame variant="default">
            <Button variant="secondary" size="medium" onClick={onCancel}>
              {cancelLabel}
            </Button>
            {showConfirm && (
              <Button
                variant={destructive ? 'destructive' : 'primary'}
                size="medium"
                disabled={confirmDisabled}
                iconLeft={confirmIconLeft}
                iconOutlined={confirmIconLeft != null}
                onClick={onConfirm}
              >
                {confirmLabel}
              </Button>
            )}
          </FooterFrame>
        }
        bodyHeight={bodyHeight ?? BODY_HEIGHT[variant]}
        bodyStyle={bodyStyleFor(variant)}
        {...rest}
      >
        {children ?? defaultBody(variant, imageSrc, signatureSrc)}
      </ModalShell>
    );
  },
);

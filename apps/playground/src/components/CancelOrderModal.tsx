import * as React from 'react';
import { ModalDialog, SelectionControl, TextArea } from '@leta/components';
import { DialogOverlay } from './DialogOverlay.js';

/**
 * Cancel Order modal (Figma `1382:104119`, OM §11.1) — the reason-capture
 * confirmation that gates every order cancellation (row overflow + bulk).
 *
 * A `ModalDialog` (multi-choice, 512×606) whose body is: "Tell us why you are
 * cancelling the order." over five reason checkboxes, then an optional
 * free-text note (100-char counter). The destructive **Cancel Order** footer
 * button stays disabled until at least one reason is checked — and, per OM
 * §11.1, while "Other" is checked the note becomes required (the wireframe's
 * "(Optional)" label covers the non-Other reasons).
 */

export const CANCEL_REASONS = [
  'Customer requested it',
  'Payment Issue',
  'Items unavailable',
  'Customer unreachable',
  'Other',
] as const;

interface CancelOrderModalProps {
  /** The order id(s) being cancelled — bulk and single share this one modal. */
  orderIds: string[];
  onClose: () => void;
  /** Confirmed — fired with the checked reasons + the (possibly empty) note. */
  onConfirm: (reasons: string[], note: string) => void;
}

export function CancelOrderModal({ orderIds, onClose, onConfirm }: CancelOrderModalProps): React.ReactElement {
  const [selected, setSelected] = React.useState<ReadonlySet<string>>(() => new Set());
  const [note, setNote] = React.useState('');
  const n = orderIds.length;
  // CTA copy standard "Action [Count] Orders" — singular drops the count (task 2).
  const confirmLabel = n === 1 ? 'Cancel Order' : `Cancel ${n} Orders`;

  const toggle = (reason: string, next: boolean) =>
    setSelected((prev) => {
      const s = new Set(prev);
      if (next) s.add(reason);
      else s.delete(reason);
      return s;
    });

  const canConfirm = selected.size > 0 && (!selected.has('Other') || note.trim().length > 0);

  return (
    <DialogOverlay onClose={onClose}>
      {({ close, closeAnd }) => (
        <ModalDialog
          variant="multi-choice"
          title="Cancel Order"
          cancelLabel="Close"
          confirmLabel={confirmLabel}
          destructive
          confirmDisabled={!canConfirm}
          confirmIconLeft="Delete"
          bodyHeight={454}
          onCancel={close}
          onClose={close}
          onConfirm={() => canConfirm && closeAnd(() => onConfirm([...selected], note.trim()))}
        >
          {/* Reasons — multi-select checkboxes (wireframe copy supersedes the
              older OM §11.1 reason-code list). */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-8px)', width: '100%' }}>
            <span className="text-body-m-medium" style={{ color: 'var(--text-default-body)' }}>
              {n === 1 ? 'Tell us why you are cancelling this order' : <>Tell us why you’re cancelling <strong style={{ fontWeight: 600 }}>{n}</strong> orders</>}
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-16px)' }}>
              {CANCEL_REASONS.map((reason) => (
                <SelectionControl
                  key={reason}
                  variant="checkbox"
                  label={reason}
                  checked={selected.has(reason)}
                  onChange={(next) => toggle(reason, next)}
                />
              ))}
            </div>
          </div>

          {/* Free-text note — required only while "Other" is checked (OM §11.1). */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-8px)', width: '100%' }}>
            <span className="text-body-m-medium" style={{ color: 'var(--text-default-body)' }}>
              Anything else you want to add? (Optional)
            </span>
            <TextArea
              showLabel={false}
              showHelper={false}
              placeholder="Tell us more"
              maxLength={100}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              aria-label={`Cancellation note for ${orderIds.length} order(s)`}
              style={{ width: '100%' }}
            />
          </div>
        </ModalDialog>
      )}
    </DialogOverlay>
  );
}

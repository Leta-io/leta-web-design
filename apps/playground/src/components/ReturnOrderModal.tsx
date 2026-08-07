import * as React from 'react';
import { ModalDialog, TextArea } from '@leta/components';
import { DialogOverlay } from './DialogOverlay.js';

/**
 * Return Order modal — the reason-capture confirmation that gates a
 * dispatcher marking an order for return (row overflow, bulk toolbar, and the
 * View Order drawer footer share this one modal, mirroring `CancelOrderModal`).
 *
 * A single required free-text reason, rather than Cancel Order's
 * checkbox-list — the Activity trail's "Dispatcher Activity (Return Order)"
 * entry (Figma `1489:183266`) renders it verbatim as one quoted line, so
 * there's nothing to render if there's no reason.
 */

interface ReturnOrderModalProps {
  /** The order id(s) being returned — bulk and single share this one modal. */
  orderIds: string[];
  onClose: () => void;
  /** Confirmed — fired with the typed reason. */
  onConfirm: (reason: string) => void;
}

export function ReturnOrderModal({ orderIds, onClose, onConfirm }: ReturnOrderModalProps): React.ReactElement {
  const [reason, setReason] = React.useState('');
  const n = orderIds.length;
  const confirmLabel = n === 1 ? 'Return Order' : `Return ${n} Orders`;
  const canConfirm = reason.trim().length > 0;

  return (
    <DialogOverlay onClose={onClose}>
      {({ close, closeAnd }) => (
        <ModalDialog
          variant="multi-choice"
          title="Return Order"
          cancelLabel="Close"
          confirmLabel={confirmLabel}
          destructive
          confirmDisabled={!canConfirm}
          confirmIconLeft="Undo"
          bodyHeight={280}
          onCancel={close}
          onClose={close}
          onConfirm={() => canConfirm && closeAnd(() => onConfirm(reason.trim()))}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-8px)', width: '100%' }}>
            <span className="text-body-m-medium" style={{ color: 'var(--text-default-body)' }}>
              {n === 1 ? 'Why is this order being returned?' : <>Why are these <strong style={{ fontWeight: 600 }}>{n}</strong> orders being returned?</>}
            </span>
            <TextArea
              showLabel={false}
              showHelper={false}
              placeholder="Tell us more"
              maxLength={100}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              aria-label={`Return reason for ${orderIds.length} order(s)`}
              style={{ width: '100%' }}
            />
          </div>
        </ModalDialog>
      )}
    </DialogOverlay>
  );
}

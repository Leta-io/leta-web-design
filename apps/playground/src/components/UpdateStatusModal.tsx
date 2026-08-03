import * as React from 'react';
import { ModalDialog, OptionCard } from '@leta/components';
import { Icon } from '@leta/icons';
import type { OrderStatus } from '../store/types.js';
import { DialogOverlay } from './DialogOverlay.js';

/**
 * Update Status modal (Figma `1239:108227`, OM §12.6) — a manual status override.
 * A `ModalDialog` (multi-choice) whose body is "Choose an option for **N**
 * order(s)" over single-select `OptionCard`s. Options are status-gated:
 *
 * - **Pending** → only *Mark order as delivered*.
 * - Scheduled / Broadcasted / Returned / Assigned / At Depot / In Transit /
 *   Arrived → *Mark order as pending* + *Mark order as delivered*.
 * - Delivered / Cancelled / Returning → no options (the action isn't offered, so
 *   the modal is never opened for them).
 *
 * "Mark as Cancelled" is deliberately absent — Cancel Order owns cancellation
 * (OM §12.6). The confirm button is disabled until an option is picked.
 */

export type UpdateStatusTarget = 'pending' | 'delivered';

/** Option copy pluralizes with the selection count (single "order" / bulk "orders"). */
function optionMeta(target: UpdateStatusTarget, plural: boolean): { title: string; description: string } {
  const obj = plural ? 'orders' : 'order';
  const verb = plural ? 'Orders will' : 'Order will';
  const status = target === 'pending' ? 'pending' : 'delivered';
  return { title: `Mark ${obj} as ${status}`, description: `${verb} be moved to ${status} status` };
}

/** OM §12.6 — the options offered for a set of selected orders' statuses. */
export function updateStatusOptionsFor(statuses: OrderStatus[]): UpdateStatusTarget[] {
  if (statuses.length > 0 && statuses.every((s) => s === 'pending')) return ['delivered'];
  return ['pending', 'delivered'];
}

interface UpdateStatusModalProps {
  /** The order id(s) being updated — bulk and single share this one modal. */
  orderIds: string[];
  /** The selected orders' current statuses (drives which options are offered). */
  statuses: OrderStatus[];
  onClose: () => void;
  /** Confirmed — fired with the chosen target status. */
  onConfirm: (target: UpdateStatusTarget) => void;
}

export function UpdateStatusModal({ orderIds, statuses, onClose, onConfirm }: UpdateStatusModalProps): React.ReactElement {
  const options = updateStatusOptionsFor(statuses);
  const [selected, setSelected] = React.useState<UpdateStatusTarget | null>(null);
  const n = orderIds.length;

  // Body hugs its content: pad 20 + count line 20 + gap 24 + cards (76 each,
  // gap 16) + pad 20.
  const bodyHeight = 20 + 20 + 24 + options.length * 76 + Math.max(0, options.length - 1) * 16 + 20;

  return (
    <DialogOverlay onClose={onClose}>
      {({ close, closeAnd }) => (
        <ModalDialog
          variant="multi-choice"
          title="Update Status"
          cancelLabel="Close"
          confirmLabel={n === 1 ? 'Update Order' : `Update ${n} Orders`}
          confirmDisabled={!selected}
          confirmIconLeft="Check"
          bodyHeight={bodyHeight}
          onCancel={close}
          onClose={close}
          onConfirm={() => selected && closeAnd(() => onConfirm(selected))}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-24px)', width: '100%' }}>
            <span className="text-body-m-medium" style={{ color: 'var(--text-default-body)' }}>
              {n === 1 ? 'Choose an option for this order' : <>Choose an option for <strong style={{ fontWeight: 600 }}>{n}</strong> orders</>}
            </span>
            <div role="radiogroup" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-16px)' }}>
              {options.map((target) => {
                const active = selected === target;
                return (
                  <OptionCard
                    key={target}
                    title={optionMeta(target, n !== 1).title}
                    description={optionMeta(target, n !== 1).description}
                    selected={active}
                    showTrailing
                    trailing={
                      <Icon
                        name="Check-Circle"
                        outlined={false}
                        size={20}
                        color="var(--icons-neutral-default)"
                        style={{ visibility: active ? 'visible' : 'hidden' }}
                      />
                    }
                    onClick={() => setSelected(target)}
                  />
                );
              })}
            </div>
          </div>
        </ModalDialog>
      )}
    </DialogOverlay>
  );
}

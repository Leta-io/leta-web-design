import * as React from 'react';
import { ModalDialog, OptionCard, Select, DateTimePicker, NotificationBanner } from '@leta/components';
import { Icon } from '@leta/icons';
import { Popover } from './Popover.js';
import { DialogOverlay } from './DialogOverlay.js';

/**
 * Reschedule Order modal (Figma `1239:108226` bulk / `1408:237256` single,
 * OM §11.2 + the 2026-07-17 Bulk-Actions changelog). A `ModalDialog`
 * (multi-choice) with:
 *  - an optional **consequence warning banner** — shown when at least one
 *    selected order is driver-held (Assigned/At Depot);
 *  - a **manual** field (`Select` opens the `DateTimePicker`) defaulting to the
 *    anchor date/time; and
 *  - four **suggested** `OptionCard`s (2x2) computed off `chipBase`: +1h / +4h /
 *    +8h / tomorrow-same-time.
 *
 * **Button state (no-op rule):** the confirm is disabled only when the on-screen
 * value would be a no-op — i.e. it equals the order's current scheduled time
 * (`noOpDate`). Single scheduled order → starts disabled (default = its own
 * time); single unscheduled / any bulk → starts enabled (`noOpDate` null).
 */

const MONTHS_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const HOUR = 3600000;

function fmtDateTime(d: Date): string {
  let h = d.getHours();
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${MONTHS_ABBR[d.getMonth()]} ${d.getDate()} ${d.getFullYear()}, ${String(h).padStart(2, '0')}:${m} ${ampm}`;
}

const SUGGESTIONS: { label: string; offset: (d: Date) => Date }[] = [
  { label: '1 hour later', offset: (d) => new Date(d.getTime() + 1 * HOUR) },
  { label: '4 hours later', offset: (d) => new Date(d.getTime() + 4 * HOUR) },
  { label: '8 hours later', offset: (d) => new Date(d.getTime() + 8 * HOUR) },
  { label: 'Tomorrow, same time', offset: (d) => new Date(d.getTime() + 24 * HOUR) },
];

/** Combine a picked calendar date (midnight) with a "9:00 AM" time string. */
function combine(date: Date | null | undefined, time: string | null | undefined): Date | null {
  if (!date) return null;
  const d = new Date(date);
  const m = /(\d+):(\d+)\s*(AM|PM)/i.exec(time ?? '');
  if (m) {
    let h = Number(m[1]) % 12;
    if (/pm/i.test(m[3]!)) h += 12;
    d.setHours(h, Number(m[2]), 0, 0);
  }
  return d;
}

interface RescheduleModalProps {
  orderIds: string[];
  /** Manual-field default (single scheduled → its time; else today's next full hour). */
  anchorDate: Date;
  /** Base the four suggestion chips are computed from (single → its time; bulk → now). */
  chipBase: Date;
  /**
   * The value that would be a no-op (a single scheduled order's own time) — the
   * confirm is disabled while the on-screen value equals it. Null (unscheduled
   * single / any bulk) → confirm always enabled.
   */
  noOpDate?: Date | null;
  /** At least one selected order is driver-held (Assigned/At Depot) → warn. */
  hasDriverHeld: boolean;
  onClose: () => void;
  /** Confirmed — fired with the chosen new date/time. */
  onConfirm: (date: Date) => void;
}

export function RescheduleModal({ orderIds, anchorDate, chipBase, noOpDate = null, hasDriverHeld, onClose, onConfirm }: RescheduleModalProps): React.ReactElement {
  const n = orderIds.length;
  const [manualDate, setManualDate] = React.useState<Date>(anchorDate);
  // Which control is active: a suggestion index, 'manual', or null (default —
  // the manual field's value stands in). Drives the card highlight + chosen value.
  const [selectedIdx, setSelectedIdx] = React.useState<number | 'manual' | null>(null);
  const [pickerAnchor, setPickerAnchor] = React.useState<DOMRect | null>(null);

  const suggestions = SUGGESTIONS.map((s) => ({ label: s.label, date: s.offset(chipBase) }));
  const chosenValue = typeof selectedIdx === 'number' ? suggestions[selectedIdx]!.date : manualDate;
  // No-op = the on-screen value matches the order's current scheduled time.
  const isNoOp = noOpDate != null && chosenValue.getTime() === noOpDate.getTime();

  const openPicker = (e: React.MouseEvent) => {
    const el = e.currentTarget as HTMLElement;
    const box = el.querySelector<HTMLElement>('[data-field-box]') ?? el;
    setPickerAnchor(box.getBoundingClientRect());
  };

  return (
    <DialogOverlay
      onClose={onClose}
      extra={
        pickerAnchor && (
          <Popover anchorRect={pickerAnchor} onClose={() => setPickerAnchor(null)} placement="bottom-start">
            <DateTimePicker
              type="date-time"
              platform="desktop"
              onApply={({ date, time }) => {
                const d = combine(date, time);
                if (d) { setManualDate(d); setSelectedIdx('manual'); }
                setPickerAnchor(null);
              }}
              onCancel={() => setPickerAnchor(null)}
            />
          </Popover>
        )
      }
    >
      {({ close, closeAnd }) => (
        <ModalDialog
          variant="multi-choice"
          title="Reschedule Order"
          cancelLabel="Close"
          confirmLabel={n === 1 ? 'Reschedule Order' : `Reschedule ${n} Orders`}
          confirmDisabled={isNoOp}
          confirmIconLeft="Check"
          bodyHeight={hasDriverHeld ? 440 : 360}
          onCancel={close}
          onClose={close}
          onConfirm={() => !isNoOp && closeAnd(() => onConfirm(chosenValue))}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-24px)', width: '100%' }}>
            {/* Consequence warning — a selected order is driver-held (changelog §1). */}
            {hasDriverHeld && (
              <NotificationBanner
                type="warning"
                variant="filled"
                description="Please note that rescheduling will unassign orders from their current drivers."
              />
            )}

            {/* Manual entry — a Select field that opens the date/time picker. */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-8px)' }}>
              <span className="text-body-m-medium" style={{ color: 'var(--text-default-body)' }}>
                {n === 1 ? 'Manually reschedule this order' : <>Manually reschedule <strong style={{ fontWeight: 600 }}>{n}</strong> orders</>}
              </span>
              <div onClick={openPicker}>
                <Select
                  showLabel={false}
                  showHelper={false}
                  leadingFieldIcon="Calendar"
                  value={fmtDateTime(manualDate)}
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            {/* Suggested times — 2x2 grid of single-select cards. */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-8px)' }}>
              <span className="text-body-m-medium" style={{ color: 'var(--text-default-body)' }}>
                Or choose a suggested date &amp; time
              </span>
              <div
                role="radiogroup"
                style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-8px)' }}
              >
                {suggestions.map((s, i) => {
                  const active = selectedIdx === i;
                  return (
                    <OptionCard
                      key={i}
                      title={fmtDateTime(s.date)}
                      description={s.label}
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
                      onClick={() => setSelectedIdx(i)}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        </ModalDialog>
      )}
    </DialogOverlay>
  );
}

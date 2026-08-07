import * as React from 'react';
import { Icon } from '@leta-io/icons';
import { InputField } from '../InputField/InputField.js';
import { StepperInput } from '../StepperInput/StepperInput.js';
import { Stepper } from '../Stepper/Stepper.js';
import { TrailingInputFieldElement } from '../TrailingInputFieldElement/TrailingInputFieldElement.js';
import { Button } from '../Button/Button.js';

export type GroupedInputVariant = 'multi-field' | 'range-input' | 'time-input-stepper';

export interface GroupedInputProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children'> {
  /** Which Figma `Property 1` layout. Default `multi-field`. */
  variant?: GroupedInputVariant;
  /** Bottom helper text. */
  showHelperText?: boolean;
  helperText?: string;

  // multi-field
  /** The grouped fields (default: three `<InputField>`s). */
  children?: React.ReactNode;
  /** Show the trailing element after the fields (multi-field). Default true. */
  showTailComponent?: boolean;
  /** Trailing element (default: a Dropdown `<TrailingInputFieldElement>`). */
  tail?: React.ReactNode;

  // range-input
  /** Left field of the range (default `<InputField>`). */
  from?: React.ReactNode;
  /** Right field of the range (default `<InputField>`). */
  to?: React.ReactNode;

  // time-input-stepper
  /** Show the editable label above the steppers. Default true. */
  showEditableLabel?: boolean;
  /** Editable-label text (time-input-stepper). */
  editableLabel?: string;
}

const HelperSection = ({ text }: { text: string }) => (
  <span className="text-label-s-regular" style={{ color: 'var(--text-default-helper)' }}>{text}</span>
);

/**
 * Grouped Input — lays out several data-entry fields together as one unit
 * (Figma `5146:845211`). Three layouts:
 *
 * - **`multi-field`** — a row of input fields (the `children`) ending in an optional
 *   trailing element (`tail`, e.g. a unit dropdown).
 * - **`range-input`** — two fields joined by a "→" arrow, for a from→to range.
 * - **`time-input-stepper`** — an editable label above a row of Hours / Minutes /
 *   Seconds stepper inputs.
 *
 * Fields align at their input boxes (labels sit above), and an optional helper line
 * sits beneath the whole group.
 *
 * **When to use:** when several fields form one logical value (a date range, a
 * duration, an address row). **When NOT:** for a single field (use Input Field).
 */
export const GroupedInput = React.forwardRef<HTMLDivElement, GroupedInputProps>(function GroupedInput(
  {
    variant = 'multi-field',
    showHelperText = false,
    helperText = 'Helper text goes here',
    children,
    showTailComponent = true,
    tail,
    from,
    to,
    showEditableLabel = true,
    editableLabel = 'Label',
    style,
    ...rest
  },
  ref,
) {
  const rootCol: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--spacing-8px)',
    boxSizing: 'border-box',
    ...style,
  };
  const helper = showHelperText ? <HelperSection text={helperText} /> : null;

  if (variant === 'range-input') {
    return (
      <div ref={ref} style={rootCol} {...rest}>
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-end', gap: 'var(--spacing-8px)', width: '100%' }}>
          <div style={{ flex: 1, minWidth: 0 }}>{from ?? <InputField placeholder="dd/mm/yyyy" showLabel={false} showHelper={false} style={{ width: '100%' }} />}</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 40, flexShrink: 0 }}>
            <Icon name="Arrow-Right" size={18} color="var(--icons-neutral-default)" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>{to ?? <InputField placeholder="dd/mm/yyyy" showLabel={false} showHelper={false} style={{ width: '100%' }} />}</div>
        </div>
        {helper}
      </div>
    );
  }

  if (variant === 'time-input-stepper') {
    // Figma `5146:845211`: each unit is a Stepper Input with NO label (identified
    // only by the trailing Hr/Min/Sec suffix); its discrete stepper field fills
    // the unit width (FieldChrome's default 350 would blow the row out).
    const unit = (defaultValue: number, max: number, suffix: string) => (
      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 'var(--spacing-8px)', flex: 1, minWidth: 0 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <StepperInput
            showLabel={false}
            showHelper={false}
            stepper={<Stepper variant="discrete" defaultValue={defaultValue} min={0} max={max} style={{ width: '100%' }} />}
            style={{ width: '100%' }}
          />
        </div>
        <TrailingInputFieldElement variant="basic" label={suffix} />
      </div>
    );
    return (
      <div ref={ref} style={rootCol} {...rest}>
        {showEditableLabel && (
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <Button variant="plain" size="small" iconRight="Edit" iconOutlined showUnderline={false}>{editableLabel}</Button>
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 'var(--spacing-16px)', width: '100%' }}>
          {unit(0, 23, 'Hr')}
          {unit(0, 59, 'Min')}
          {unit(0, 59, 'Sec')}
        </div>
        {helper}
      </div>
    );
  }

  // multi-field
  return (
    <div ref={ref} style={rootCol} {...rest}>
      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-end', gap: 'var(--spacing-8px)', width: '100%' }}>
        {children ?? (
          <>
            <div style={{ flex: 1, minWidth: 0 }}><InputField label="Label" placeholder="Placeholder" showHelper={false} style={{ width: '100%' }} /></div>
            <div style={{ flex: 1, minWidth: 0 }}><InputField label="Label" placeholder="Placeholder" showHelper={false} style={{ width: '100%' }} /></div>
            <div style={{ flex: 1, minWidth: 0 }}><InputField label="Label" placeholder="Placeholder" showHelper={false} style={{ width: '100%' }} /></div>
          </>
        )}
        {showTailComponent && (tail ?? <TrailingInputFieldElement variant="dropdown" label="Unit" />)}
      </div>
      {helper}
    </div>
  );
});

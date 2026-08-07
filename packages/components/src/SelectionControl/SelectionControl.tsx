import * as React from 'react';
import { Icon, type IconName } from '@leta-io/icons';
import { Checkbox } from '../Checkbox/Checkbox.js';
import { RadioButton } from '../RadioButton/RadioButton.js';
import { Toggle } from '../Toggle/Toggle.js';

export type SelectionControlVariant = 'checkbox' | 'radio' | 'switch';

export interface SelectionControlProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> {
  /**
   * Which control to render. `checkbox` — multi-select / independent on-off
   * options (supports `indeterminate`). `radio` — single-select within a group.
   * `switch` — immediate on/off setting (label sits *before* the toggle).
   */
  variant: SelectionControlVariant;
  /** The visible label text shown beside the control. */
  label: React.ReactNode;
  /** Controlled checked state. */
  checked?: boolean;
  /** Uncontrolled initial checked state. */
  defaultChecked?: boolean;
  /** Checkbox only — partial / mixed-children state. Ignored for radio/switch. */
  indeterminate?: boolean;
  /** Dims the whole row and blocks interaction. */
  disabled?: boolean;
  /** Fired with the next checked value when the control toggles. */
  onChange?: (checked: boolean) => void;
  /**
   * Optional help/info icon shown after the label (Figma "Show Label Trailing
   * Icon"). Rendered outlined at 18px; the Figma default content is `Info`.
   */
  trailingIcon?: IconName;
  /**
   * Applied to the underlying control so the visible `<label>`'s `htmlFor`
   * targets it. Auto-generated when omitted.
   */
  id?: string;
  /** Forwarded to the underlying control. */
  name?: string;
  /** Forwarded to the underlying input for checkbox/radio (ignored for switch). */
  value?: string;
  /**
   * Stretch to the full width of the container with the label filling and the
   * control pushed flush to the trailing edge (Figma `szH: FILL` — e.g. a Switch
   * settings row, or the Popover's Configuration Control). Default false (the
   * row hugs its content).
   */
  fullWidth?: boolean;
}

/**
 * Selection Control — a labelled selection-input wrapper that renders a
 * Checkbox, Radio Button, or Switch with consistent label, spacing, and states.
 * Composes the existing {@link Checkbox} / {@link RadioButton} / {@link Toggle}
 * atoms.
 *
 * **When to use:** anywhere a labelled boolean/option control is needed in
 * forms, lists, and settings.
 *
 * **When NOT to use:** as a bare glyph — use the underlying atoms directly only
 * when you supply your own label.
 *
 * 3 variants × state (`37:362`): Checkbox (Idle / Active / Indeterminate /
 * Disabled), Radio Button + Switch (Idle / Active / Disabled — no
 * Indeterminate). Checkbox/Radio put the control first; **Switch puts the label
 * first, toggle trailing**. The label is wired to the control via `htmlFor` +
 * `aria-labelledby`, so clicking the text toggles it; Disabled dims the row.
 */
export const SelectionControl = React.forwardRef<HTMLDivElement, SelectionControlProps>(
  function SelectionControl(
    {
      variant,
      label,
      checked,
      defaultChecked,
      indeterminate,
      disabled = false,
      onChange,
      trailingIcon,
      id,
      name,
      value,
      fullWidth = false,
      className,
      style,
      ...rest
    },
    ref,
  ) {
    const reactId = React.useId();
    const controlId = id ?? `${reactId}-control`;
    const labelId = `${reactId}-label`;

    const commonProps = {
      id: controlId,
      checked,
      defaultChecked,
      disabled,
      onChange,
      name,
      'aria-labelledby': labelId,
    };

    let control: React.ReactNode;
    if (variant === 'checkbox') {
      control = <Checkbox {...commonProps} indeterminate={indeterminate} value={value} />;
    } else if (variant === 'radio') {
      control = <RadioButton {...commonProps} value={value} />;
    } else {
      control = <Toggle {...commonProps} />;
    }

    const labelContent = (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--spacing-8px)', ...(fullWidth ? { flex: 1, minWidth: 0 } : null) }}>
        <label
          htmlFor={controlId}
          id={labelId}
          className="text-label-m-regular"
          style={{
            color: 'var(--text-default-label)',
            cursor: disabled ? 'not-allowed' : 'pointer',
            userSelect: 'none',
            // When the row fills its container (e.g. a fixed-width dropdown), the label
            // takes the remaining width and truncates instead of wrapping.
            ...(fullWidth
              ? { flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }
              : null),
          }}
        >
          {label}
        </label>
        {trailingIcon && (
          <Icon
            name={trailingIcon}
            outlined
            size={18}
            color={disabled ? 'var(--icons-disabled-default)' : 'var(--icons-neutral-idle)'}
          />
        )}
      </span>
    );

    // Switch puts the label first (toggle trailing); checkbox/radio lead with
    // the control, label trailing — matches the Figma master layout.
    const labelLeading = variant === 'switch';

    return (
      <div
        ref={ref}
        className={className}
        style={{
          display: fullWidth ? 'flex' : 'inline-flex',
          width: fullWidth ? '100%' : undefined,
          alignItems: 'center',
          gap: 'var(--spacing-8px)',
          // Disabled dims the whole row. `--opacity-60` resolves to the buggy
          // `60px` in the token pipeline, so use the literal 0.6 (cf. WizardTab).
          opacity: disabled ? 0.6 : 1,
          cursor: disabled ? 'not-allowed' : undefined,
          boxSizing: 'border-box',
          ...style,
        }}
        {...rest}
      >
        {labelLeading ? (
          <>
            {labelContent}
            {control}
          </>
        ) : (
          <>
            {control}
            {labelContent}
          </>
        )}
      </div>
    );
  },
);

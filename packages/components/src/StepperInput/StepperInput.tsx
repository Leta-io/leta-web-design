import * as React from 'react';
import { type IconName } from '@leta-io/icons';
import { FieldChrome } from '../InputField/FieldChrome.js';
import { Stepper, type StepperVariant } from '../Stepper/Stepper.js';

/**
 * Stepper Input — a labelled numeric stepper field. The `Stepper Input` type of
 * Data Entry `38:42` (Variant=Basic): the label + helper chrome of a Data Entry
 * field, with a `<Stepper>` (its building block) in place of the text field box.
 * Renders an internal `<Stepper>` with the forwarded props, or accepts a
 * `stepper` slot to inject a fully-configured one.
 */
export interface StepperInputProps {
  /** Label text. */
  label?: string;
  /** Show the label section. Default true. */
  showLabel?: boolean;
  /** Show an Info marker after the label. */
  showLabelIcon?: boolean;
  /** The label marker icon. Default `Info` (outlined). */
  labelIcon?: IconName;
  /** Optional/Required tag after the label. Default `none`. */
  tag?: 'none' | 'optional' | 'required';
  /** Helper text below the field. */
  helperText?: string;
  /** Show the helper/message line. Default true. */
  showHelper?: boolean;
  /** Error message — shows an error icon + red text. */
  error?: string;
  /** Warning message — shows a warning icon + warning text. */
  warning?: string;
  /** Right-aligned control on the label row. */
  labelToggle?: React.ReactNode;
  /** Stepper visual variant. Default `discrete`. */
  stepperVariant?: StepperVariant;
  /** Controlled stepper value. */
  value?: number;
  /** Uncontrolled initial stepper value. */
  defaultValue?: number;
  /** Fired with the next clamped value. */
  onChange?: (value: number) => void;
  /** Lower bound (inclusive). Default 0. */
  min?: number;
  /** Upper bound (inclusive). */
  max?: number;
  /** Increment/decrement amount. Default 1. */
  step?: number;
  disabled?: boolean;
  /** Override the internal `<Stepper>` with a fully-configured one. */
  stepper?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function StepperInput({
  label = 'Label Text',
  showLabel = true,
  showLabelIcon = false,
  labelIcon = 'Info',
  tag = 'none',
  helperText = 'Helper text goes here',
  showHelper = true,
  error,
  warning,
  labelToggle,
  stepperVariant = 'discrete',
  value,
  defaultValue = 0,
  onChange,
  min = 0,
  max = 99,
  step = 1,
  disabled = false,
  stepper,
  className,
  style,
}: StepperInputProps) {
  return (
    <FieldChrome
      label={label}
      showLabel={showLabel}
      showLabelIcon={showLabelIcon}
      labelIcon={labelIcon}
      tag={tag}
      labelToggle={labelToggle}
      helperText={helperText}
      showHelper={showHelper}
      error={error}
      warning={warning}
      disabled={disabled}
      className={className}
      style={style}
    >
      {stepper ?? (
        <Stepper
          variant={stepperVariant}
          value={value}
          defaultValue={defaultValue}
          onChange={onChange}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
        />
      )}
    </FieldChrome>
  );
}

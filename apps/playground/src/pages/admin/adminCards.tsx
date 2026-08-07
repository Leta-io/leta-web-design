import * as React from 'react';
import {
  Button,
  Checkbox,
  ConfigurationCard,
  ConfigurationCardRow,
  Stepper,
} from '@leta-io/components';

/**
 * The card shapes the Admin module is built from (IA §6) — thin presets over the
 * design-system `ConfigurationCard` / `ConfigurationCardRow`, so every setting
 * reads identically and no card chrome is ever hand-rolled.
 *
 * - {@link SettingCard} — the toggle card, optionally revealing a nested section.
 * - {@link ControlCard} — the same card minus the switch, for settings that
 *   aren't on/off (the two SLA duration cards).
 * - {@link ReadOnlyCard} — a control card whose "control" is a static value
 *   (fleet type, the derived expected fulfilment time).
 * - {@link LinkOutCard} / {@link LinkOutRow} — where a capability is enabled here
 *   but configured elsewhere, the setting is acknowledged with a link out rather
 *   than duplicating the other module's controls.
 * - {@link CheckboxRow} / {@link DurationRow} — the nested-row controls.
 */

/* ── Cards ──────────────────────────────────────────────────────────────── */

export interface SettingCardProps {
  title: string;
  description: string;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  /** Nested disclosure — revealed inside this card when the setting is on. */
  children?: React.ReactNode;
}

/** The template default: a switch, and whatever it reveals inside the same card. */
export function SettingCard({ title, description, enabled, onToggle, children }: SettingCardProps): React.ReactElement {
  return (
    <ConfigurationCard
      title={title}
      description={description}
      enabled={enabled}
      onToggle={onToggle}
      showFooter={false}
    >
      {children}
    </ConfigurationCard>
  );
}

/** A setting that isn't on/off — its inputs live in the body rows. */
export function ControlCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <ConfigurationCard variant="control" title={title} description={description} showFooter={false}>
      {children}
    </ConfigurationCard>
  );
}

/** A value the client can see but not set — derived here, or provisioned by LETA. */
export function ReadOnlyCard({
  title,
  description,
  value,
}: {
  title: string;
  description: string;
  /** Rendered right-aligned in the header, where a toggle would otherwise sit. */
  value: React.ReactNode;
}): React.ReactElement {
  return (
    <ConfigurationCard
      variant="control"
      title={title}
      description={description}
      showFooter={false}
      control={
        typeof value === 'string' ? (
          <span className="text-label-l-semibold" style={{ color: 'var(--text-default-heading)', whiteSpace: 'nowrap' }}>
            {value}
          </span>
        ) : (
          value
        )
      }
    />
  );
}

/** A setting acknowledged here but configured in another module. */
export function LinkOutCard({
  title,
  description,
  label,
  onClick,
}: {
  title: string;
  description: string;
  label: string;
  onClick: () => void;
}): React.ReactElement {
  return (
    <ConfigurationCard
      variant="control"
      title={title}
      description={description}
      showFooter={false}
      control={<LinkOut label={label} onClick={onClick} />}
    />
  );
}

/* ── Nested rows ────────────────────────────────────────────────────────── */

/** The link-out affordance itself — a Plain button with the trailing `Open` glyph. */
export function LinkOut({ label, onClick }: { label: string; onClick: () => void }): React.ReactElement {
  return (
    <Button variant="plain" size="medium" iconRight="Open" showUnderline={false} onClick={onClick}>
      {label}
    </Button>
  );
}

/** A nested row whose control is a checkbox (POD requirements, auto-reinstatement). */
export function CheckboxRow({
  title,
  description,
  checked,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}): React.ReactElement {
  return (
    <ConfigurationCardRow
      title={title}
      description={description}
      trailing={<Checkbox checked={checked} onChange={onChange} aria-label={title} />}
    />
  );
}

/** A nested row whose control is a `[− n +]` stepper with a unit suffix. */
export function StepperRow({
  title,
  description,
  value,
  onChange,
  unit,
  min = 1,
  max = 99,
}: {
  title: string;
  description: string;
  value: number;
  onChange: (value: number) => void;
  /** Unit shown after the stepper — "min", "orders", "days". */
  unit: string;
  min?: number;
  max?: number;
}): React.ReactElement {
  return (
    <ConfigurationCardRow
      title={title}
      description={description}
      trailing={
        <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-8px)' }}>
          <Stepper variant="segmented" value={value} onChange={onChange} min={min} max={max} aria-label={title} />
          <span
            className="text-label-m-regular"
            style={{ color: 'var(--text-default-label-idle)', whiteSpace: 'nowrap' }}
          >
            {unit}
          </span>
        </span>
      }
    />
  );
}

/** A nested row that explains a downstream setting and links to where it lives. */
export function LinkOutRow({
  title,
  description,
  label,
  onClick,
}: {
  title: string;
  description: string;
  label: string;
  onClick: () => void;
}): React.ReactElement {
  return (
    <ConfigurationCardRow
      title={title}
      description={description}
      trailing={<LinkOut label={label} onClick={onClick} />}
    />
  );
}

/** A nested row that only states a fixed platform behaviour — no control. */
export function NoteRow({ title, description }: { title: string; description: string }): React.ReactElement {
  return <ConfigurationCardRow title={title} description={description} />;
}

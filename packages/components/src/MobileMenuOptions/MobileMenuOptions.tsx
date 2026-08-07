import * as React from 'react';
import { Icon, type IconName } from '@leta-io/icons';
import { SelectionControl } from '../SelectionControl/SelectionControl.js';

export type MobileMenuOptionType =
  | 'combobox'
  | 'mobile-day-cell'
  | 'checkbox-selection'
  | 'radio-selection';

export interface MobileMenuOptionsProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title' | 'onSelect'> {
  /** Which of the 4 Figma Types (`8338:35033`). Default `combobox`. */
  type?: MobileMenuOptionType;
  /** Row label / day number. */
  label?: string;
  /** Optional leading icon (combobox). */
  leadingIcon?: IconName;
  showLeadingIcon?: boolean;
  /** Caller-controlled active (selected value / current date). */
  active?: boolean;
  /** Caller-controlled selected (checkbox/radio rows). */
  selected?: boolean;
  disabled?: boolean;
  onSelect?: (next: boolean) => void;
}

const STYLE_ID = 'leta-mmo-styles';
const STYLES = `
  .leta-mmo { cursor: pointer; }
  .leta-mmo[aria-disabled="true"] { cursor: not-allowed; }
  .leta-mmo:focus-visible { outline: var(--stroke-sm) solid var(--border-secondary-component-focus); outline-offset: 2px; }
`;
function ensureStyles(): void {
  if (typeof document === 'undefined') return;
  if (document.getElementById(STYLE_ID)) return;
  const el = document.createElement('style');
  el.id = STYLE_ID;
  el.textContent = STYLES;
  document.head.appendChild(el);
}

function surfaceVar(type: MobileMenuOptionType, press: boolean, active: boolean, disabled: boolean): string {
  if (disabled) return '--surface-disabled-bg';
  switch (type) {
    case 'combobox':
      if (press) return '--surface-neutral-combobox-pressed';
      if (active) return '--surface-neutral-combobox-active';
      return '--surface-neutral-combobox-idle';
    case 'mobile-day-cell':
      if (active) return '--surface-secondary-mobile-day-cell-active';
      if (press) return '--surface-neutral-mobile-day-cell-pressed';
      return '--surface-neutral-mobile-day-cell-idle';
    case 'checkbox-selection':
    case 'radio-selection':
      if (press) return '--surface-neutral-selection-pressed';
      return '--surface-neutral-selection-idle'; // row bg unchanged when selected (mobile)
  }
}

/**
 * Mobile Menu Options — the touch version of a single menu / list row for phones.
 * It's like Desktop Menu Options but simpler: bigger tap target and no hover state
 * (just Idle, Pressed, Active, and Disabled). You stack several inside a
 * **Mobile Dropdown** to build the full menu.
 *
 * Types: `combobox` (a selectable option; the chosen one shows a trailing checkmark),
 * `mobile-day-cell` (a calendar day), and `checkbox-selection` / `radio-selection`
 * (rows with a built-in checkbox or radio button).
 *
 * **When to use:** for the items of a mobile menu, select, filter list, or calendar.
 * **When not to use:** on desktop (use Desktop Menu Options) or as a standalone button.
 */
export const MobileMenuOptions = React.forwardRef<HTMLDivElement, MobileMenuOptionsProps>(function MobileMenuOptions(
  { type = 'combobox', label = 'Insert Text', leadingIcon, showLeadingIcon = false, active = false, selected = false, disabled = false, onSelect, className, style, role, ...rest },
  ref,
) {
  ensureStyles();
  const [press, setPress] = React.useState(false);
  const isCell = type === 'mobile-day-cell';
  const isSel = type === 'checkbox-selection' || type === 'radio-selection';
  const bg = surfaceVar(type, press && !disabled, active, disabled);
  const textColor = disabled
    ? 'var(--text-disabled-label)'
    : isCell && active
      ? 'var(--text-on-color-label)'
      : 'var(--text-default-label)';
  const fire = () => { if (!disabled) onSelect?.(isSel ? !selected : true); };

  let inner: React.ReactNode;
  if (isSel) {
    inner = (
      <SelectionControl
        variant={type === 'checkbox-selection' ? 'checkbox' : 'radio'}
        label={label}
        checked={selected}
        disabled={disabled}
        onChange={(c) => onSelect?.(c)}
      />
    );
  } else if (isCell) {
    inner = <span className="text-label-m-regular" style={{ color: textColor }}>{label}</span>;
  } else {
    // Combobox row: label (+ optional leading icon); a trailing checkmark marks
    // the selected (active) option — same indicator as the desktop combobox.
    inner = (
      <>
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 'var(--spacing-8px)', flex: 1, minWidth: 0 }}>
          {showLeadingIcon && (
            <span style={{ flexShrink: 0, display: 'flex', color: 'var(--icons-neutral-default)' }}>
              <Icon name={leadingIcon ?? 'Question'} outlined size={16} />
            </span>
          )}
          <span className="text-label-m-regular" style={{ color: textColor, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {label}
          </span>
        </div>
        {active && !disabled && (
          <span style={{ flexShrink: 0, display: 'flex', color: 'var(--icons-neutral-default)' }}>
            <Icon name="Check" size={16} />
          </span>
        )}
      </>
    );
  }

  return (
    <div
      ref={ref}
      className={['leta-mmo', className].filter(Boolean).join(' ')}
      role={role ?? (isSel ? (type === 'checkbox-selection' ? 'menuitemcheckbox' : 'menuitemradio') : isCell ? 'gridcell' : 'menuitem')}
      aria-disabled={disabled || undefined}
      aria-selected={active || (selected && !isSel) || undefined}
      tabIndex={disabled || isSel ? undefined : 0}
      onClick={isSel ? undefined : fire}
      onKeyDown={isSel ? undefined : (e) => { if (!disabled && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); fire(); } }}
      onPointerDown={() => setPress(true)}
      onPointerUp={() => setPress(false)}
      onPointerLeave={() => setPress(false)}
      style={{
        boxSizing: 'border-box',
        flexShrink: 0, // never compress below natural height inside a scroll/flex column
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: isCell ? 'center' : 'flex-start',
        gap: 'var(--spacing-8px)',
        ...(isCell ? { width: 32, height: 32 } : { width: '100%', minHeight: 40 }),
        padding: isCell ? 0 : isSel ? '0 var(--padding-8px)' : '0 var(--padding-10px)',
        borderRadius: 'var(--rounding-lg)',
        backgroundColor: `var(${bg})`,
        ...style,
      }}
      {...rest}
    >
      {inner}
    </div>
  );
});

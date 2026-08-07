import * as React from 'react';
import { Icon, type IconName } from '@leta-io/icons';

export interface SearchFieldProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /** Field surface, as a CSS value e.g. `var(--surface-neutral-search-field)`. */
  surfaceVar: string;
  /** Corner radius, as a CSS value e.g. `var(--rounding-lg)` or `var(--rounding-round)`. */
  radiusVar: string;
  /** Leading icon. Default `Search`. */
  icon?: IconName;
  /**
   * Notified when the trailing clear (×) is clicked. Optional — the field already
   * clears itself; this is just a hook for the consumer (e.g. to reset results).
   * The × appears automatically as soon as the field has text (see `showClear`).
   */
  onClear?: () => void;
  /** Force the clear button visible even when the field is empty (e.g. an open map field). */
  showClear?: boolean;
  /** Suppress the field's own border (e.g. when nested inside a bordered dropdown card). */
  noBorder?: boolean;
  /** Error state — paints the field border `--border-error-default` (unless focused). */
  error?: boolean;
  disabled?: boolean;
}

const STYLE_ID = 'leta-search-field-styles';
const STYLES = `
  .leta-search-field__input {
    border: 0; outline: none; background: transparent; padding: 0; margin: 0;
    width: 100%; min-width: 0; flex: 1;
    /* A selected result (e.g. a full geocoded address) can be much longer than
       the field — truncate with an ellipsis instead of letting the browser
       hard-clip/scroll the text, which read as the value colliding with the
       trailing clear (×) button. */
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .leta-search-field__input::placeholder { color: var(--text-default-placeholder); opacity: 1; }
  .leta-search-field__input::-webkit-search-cancel-button { -webkit-appearance: none; appearance: none; display: none; }
  .leta-search-field__input:disabled { cursor: not-allowed; }
  .leta-search-field__input:disabled::placeholder { color: var(--text-disabled-placeholder-disabled); }
`;
function ensureStyles(): void {
  if (typeof document === 'undefined') return;
  if (document.getElementById(STYLE_ID)) return;
  const el = document.createElement('style');
  el.id = STYLE_ID;
  el.textContent = STYLES;
  document.head.appendChild(el);
}

/**
 * Shared 40px search field row — leading Search icon + input + a trailing clear (×).
 * The visual base for all four Search Input components (Data Entry `38:42`); the
 * surface + radius differ per variant and are passed in. Internal — not exported
 * from the package root.
 *
 * **Clear (×) behaviour:** the × appears the moment the field contains text (and
 * stays hidden while it's empty), regardless of whether `onClear` is supplied.
 * Clicking it empties the field, returns focus to the input, and calls `onClear?`.
 * Works for both uncontrolled use (the field tracks its own value) and controlled
 * use (pass `value` + `onChange`; `onClear` resets it on your side). `showClear`
 * forces the × visible even when empty (used by the open map fields).
 */
export const SearchField = React.forwardRef<HTMLInputElement, SearchFieldProps>(function SearchField(
  {
    surfaceVar,
    radiusVar,
    icon = 'Search',
    onClear,
    showClear = false,
    noBorder = false,
    error = false,
    disabled = false,
    placeholder = 'Search here...',
    value,
    defaultValue,
    onChange,
    className,
    style,
    ...inputProps
  },
  ref,
) {
  ensureStyles();
  const [focused, setFocused] = React.useState(false);
  const isControlled = value !== undefined;
  const [internalValue, setInternalValue] = React.useState(String(defaultValue ?? ''));
  const currentValue = isControlled ? value : internalValue;
  const hasValue = String(currentValue ?? '').length > 0;
  const clearVisible = !disabled && (hasValue || showClear);

  // Merge the forwarded ref with an internal one so the × can refocus the input.
  const innerRef = React.useRef<HTMLInputElement>(null);
  const setRef = React.useCallback((node: HTMLInputElement | null) => {
    innerRef.current = node;
    if (typeof ref === 'function') ref(node);
    else if (ref) (ref as React.MutableRefObject<HTMLInputElement | null>).current = node;
  }, [ref]);

  const handleClear = () => {
    if (!isControlled) setInternalValue('');
    onClear?.();
    innerRef.current?.focus();
  };

  const borderColor = disabled
    ? 'var(--border-disabled-default)'
    : focused
      ? 'var(--border-secondary-component-focus)'
      : error
        ? 'var(--border-error-default)'
        : 'var(--border-neutral-default)';

  return (
    <div
      className={className}
      style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 'var(--spacing-8px)',
        width: '100%',
        boxSizing: 'border-box',
        height: 40,
        padding: '0 var(--padding-12px)',
        borderRadius: radiusVar,
        backgroundColor: disabled ? 'var(--surface-disabled-input-field)' : surfaceVar,
        boxShadow: noBorder ? undefined : `inset 0 0 0 var(--stroke-xs) ${borderColor}`,
        ...style,
      }}
    >
      <span style={{ flexShrink: 0, display: 'flex', color: 'var(--icons-neutral-idle)' }}>
        <Icon name={icon} size={16} />
      </span>
      <input
        ref={setRef}
        type="text"
        className="leta-search-field__input text-label-m-regular"
        placeholder={placeholder}
        disabled={disabled}
        value={currentValue}
        onChange={(e) => { if (!isControlled) setInternalValue(e.target.value); onChange?.(e); }}
        onFocus={(e) => { setFocused(true); inputProps.onFocus?.(e); }}
        onBlur={(e) => { setFocused(false); inputProps.onBlur?.(e); }}
        style={{ color: disabled ? 'var(--text-disabled-placeholder-disabled)' : 'var(--text-default-label)' }}
        {...inputProps}
      />
      {clearVisible && (
        <button
          type="button"
          onClick={handleClear}
          aria-label="Clear search"
          style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 0, background: 'transparent', padding: 0, cursor: 'pointer', color: 'var(--icons-neutral-default)' }}
        >
          <Icon name="Cancel" size={16} />
        </button>
      )}
    </div>
  );
});

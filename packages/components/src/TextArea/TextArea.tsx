import * as React from 'react';
import { Icon, type IconName } from '@leta/icons';
import { Button } from '../Button/Button.js';
import { ToggleButton } from '../ToggleButton/ToggleButton.js';
import { sanitizeRichText, htmlToPlainText } from './sanitizeRichText.js';
import {
  type RichTextFormat,
  ZWSP,
  replaceContent,
  getSelectionIn,
  getFormatsAt,
  isRangeFullyFormatted,
  applyFormatToSelection,
  insertLineBreak,
  insertPlainText,
  insertSanitizedFragment,
  insertStickyMarker,
  removeStickyMarker,
  cleanStickyMarker,
} from './richTextEditing.js';

export type TextAreaVariant = 'basic' | 'rich';

interface TextAreaShared {
  /** `basic` plain multi-line field, or `rich` with a formatting-toolbar footer. Default `basic`. */
  variant?: TextAreaVariant;
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
  /** Right-aligned control on the label row (e.g. a `<SelectionControl variant="switch">`). */
  labelToggle?: React.ReactNode;
  /** Helper text below the field. */
  helperText?: string;
  /** Show the helper/message line. Default true. */
  showHelper?: boolean;
  /** Error message — turns the border red + shows an error icon. */
  error?: string;
  /** Warning message — shows a warning icon (border unchanged). */
  warning?: string;
  /** Show the in-field character counter ("n/max"). Default true. */
  showCounter?: boolean;
  /** Visible text rows (drives min height, basic variant only). Default ~4 (≈120px box). */
  rows?: number;
  disabled?: boolean;
  placeholder?: string;
  maxLength?: number;
  className?: string;
  style?: React.CSSProperties;
}

export interface TextAreaBasicProps
  extends TextAreaShared,
    Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'rows' | 'value' | 'defaultValue' | 'onChange' | 'placeholder' | 'disabled' | 'maxLength' | 'className' | 'style'> {
  variant?: 'basic';
  value?: string;
  defaultValue?: string;
  onChange?: React.ChangeEventHandler<HTMLTextAreaElement>;
}

export interface TextAreaRichProps extends TextAreaShared {
  variant: 'rich';
  /**
   * Sanitized HTML — the only markup that ever survives is `<strong>/<em>/<u>/<br>`
   * (see `sanitizeRichText`). Controlled; omit for an uncontrolled field.
   */
  value?: string;
  /** Uncontrolled initial HTML value. */
  defaultValue?: string;
  /** Fired with the new sanitized HTML after every edit (typing, formatting, paste). */
  onChange?: (html: string) => void;
  /**
   * Fired when the user toggles Bold/Italic/Underline — `active` is the format's
   * new state. Informational only: `TextArea` already applies the formatting to
   * the selection/caret itself:
   * - With text highlighted, the button bolds/italicizes/underlines the selection.
   * - With just a caret, the format becomes "sticky" — it applies to whatever is
   *   typed next, like Word/Docs — until toggled off or the caret moves away.
   */
  onBold?: (active: boolean) => void;
  onItalic?: (active: boolean) => void;
  onUnderline?: (active: boolean) => void;
  /**
   * Trailing footer slot (Figma `38:42` Text Area / Rich — `Trailing Buttons`
   * SLOT). Whatever ReactNode you pass renders here, right of the formatting
   * toggles. Omit for the DS default (a Secondary "Cancel" + Primary "Save",
   * wired to `onCancel`/`onSave`); pass `null` for no trailing region at all
   * (inline-edit variant, where Save/Cancel live in a separate card footer).
   */
  trailing?: React.ReactNode;
  /** Wired to the default trailing Save button. Ignored when `trailing` is set. */
  onSave?: () => void;
  /** Wired to the default trailing Cancel button. Ignored when `trailing` is set. */
  onCancel?: () => void;
  /**
   * Disable the default trailing Save button. Default `false` — the Save button
   * ships as Idle per Figma and enables the enter/submit action even on an
   * empty draft unless the caller opts in.
   */
  saveDisabled?: boolean;
  /**
   * Focus the field on mount and place the caret at the end of any seeded
   * content. Use when the rich field appears in response to a user action (e.g.
   * expanding a collapsed comment composer, or entering inline-edit) so the user
   * can type immediately.
   */
  autoFocus?: boolean;
  onFocus?: React.FocusEventHandler<HTMLDivElement>;
  onBlur?: React.FocusEventHandler<HTMLDivElement>;
}

export type TextAreaProps = TextAreaBasicProps | TextAreaRichProps;

const STYLE_ID = 'leta-textarea-styles';
const STYLES = `
  .leta-textarea__input {
    border: 0;
    outline: none;
    background: transparent;
    padding: 0;
    margin: 0;
    width: 100%;
    min-width: 0;
    flex: 1;
    resize: none;
    /* font from .text-label-m-regular on the same node; no font:inherit (serif fallback). */
  }
  .leta-textarea__input::placeholder { color: var(--text-default-placeholder); opacity: 1; }
  .leta-textarea__input:disabled { cursor: not-allowed; }
  .leta-textarea__input:disabled::placeholder { color: var(--text-disabled-placeholder-disabled); }
  .leta-textarea__rich-input {
    border: 0;
    outline: none;
    background: transparent;
  }
  .leta-textarea__rich-input:empty::before { content: ''; }
`;

function ensureStyles(): void {
  if (typeof document === 'undefined') return;
  if (document.getElementById(STYLE_ID)) return;
  const el = document.createElement('style');
  el.id = STYLE_ID;
  el.textContent = STYLES;
  document.head.appendChild(el);
}

function LabelSection({
  label, showLabelIcon, labelIcon, tag, labelToggle,
}: Pick<TextAreaShared, 'label' | 'showLabelIcon' | 'labelIcon' | 'tag' | 'labelToggle'>): React.ReactElement {
  return (
    <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 'var(--spacing-4px)', minHeight: 20 }}>
      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 'var(--spacing-4px)', flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 'var(--spacing-8px)' }}>
          <span className="text-label-m-medium" style={{ color: 'var(--text-default-label-idle)' }}>{label}</span>
          {showLabelIcon && (
            <span style={{ display: 'flex', color: 'var(--icons-neutral-idle)', flexShrink: 0 }}>
              <Icon name={labelIcon ?? 'Info'} outlined size={18} />
            </span>
          )}
        </div>
        {tag !== 'none' && (
          <span className="text-label-m-regular" style={{ color: 'var(--text-default-label-idle)' }}>
            {tag === 'optional' ? '(Optional)' : '(Required)'}
          </span>
        )}
      </div>
      {labelToggle && <div style={{ flexShrink: 0 }}>{labelToggle}</div>}
    </div>
  );
}

function Message({
  error, warning, disabled, helperText, showHelper,
}: Pick<TextAreaShared, 'error' | 'warning' | 'disabled' | 'helperText' | 'showHelper'>): React.ReactElement | null {
  const message = error ?? warning ?? (showHelper ? helperText : undefined);
  if (!message) return null;
  const messageColor = error
    ? 'var(--text-error-label)'
    : warning
      ? 'var(--text-warning-label)'
      : disabled
        ? 'var(--text-disabled-helper-disabled)'
        : 'var(--text-default-helper)';
  const messageIcon: IconName | null = error ? 'Error' : warning ? 'Warning' : null;
  return (
    <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 'var(--spacing-4px)', minHeight: 16 }}>
      {messageIcon && (
        <span style={{ display: 'flex', flexShrink: 0, color: error ? 'var(--icons-error-default)' : 'var(--icons-warning-default)' }}>
          <Icon name={messageIcon} outlined={false} size={16} />
        </span>
      )}
      <span className="text-label-s-regular" style={{ color: messageColor }}>{message}</span>
    </div>
  );
}

function borderColorFor(disabled: boolean | undefined, error: string | undefined, focused: boolean): string {
  return disabled
    ? 'var(--border-disabled-default)'
    : error
      ? 'var(--border-error-default)'
      : focused
        ? 'var(--border-secondary-component-focus)'
        : 'var(--border-neutral-default)';
}

/* ============================================================================
 * Basic field — a plain native <textarea>.
 * ========================================================================== */

const BasicField = React.forwardRef<HTMLTextAreaElement, {
  props: TextAreaBasicProps;
  borderColor: string;
  onFocusChange: (focused: boolean) => void;
}>(function BasicField({ props, borderColor, onFocusChange }, ref) {
  const {
    rows = 4, placeholder = 'Some descriptive text here would be very nice to see', disabled = false,
    maxLength, value, defaultValue, onChange, showCounter = true,
    onFocus, onBlur,
    // Chrome props belong to the wrapper (label row, message row, root box), NOT
    // to the <textarea>. They must be destructured away even though nothing here
    // reads them: whatever is left lands on the DOM node via `...textareaProps`,
    // where React warns about each unknown attribute ("React does not recognize
    // the `showHelper` prop on a DOM element"). `className`/`style` are excluded
    // for a second reason — they are already applied to the root by `TextArea`,
    // and spreading them here would overwrite the textarea's own class (dropping
    // the `text-label-m-regular` font) and inline styles.
    variant: _variant, label: _label, showLabel: _showLabel, showLabelIcon: _showLabelIcon,
    labelIcon: _labelIcon, tag: _tag, labelToggle: _labelToggle, helperText: _helperText,
    showHelper: _showHelper, error: _error, warning: _warning, className: _className, style: _style,
    ...textareaProps
  } = props;

  const [count, setCount] = React.useState(String(value ?? defaultValue ?? '').length);
  const len = value !== undefined ? String(value).length : count;

  return (
    <div
      style={{
        display: 'flex', flexDirection: 'column', gap: 'var(--spacing-8px)', boxSizing: 'border-box', width: '100%',
        minHeight: 120, padding: 'var(--padding-10px) var(--padding-12px)', borderRadius: 'var(--rounding-lg)',
        backgroundColor: disabled ? 'var(--surface-disabled-input-field)' : 'var(--surface-neutral-input-field)',
        boxShadow: `inset 0 0 0 var(--stroke-xs) ${borderColor}`,
      }}
    >
      <textarea
        ref={ref}
        className="leta-textarea__input text-label-m-regular"
        placeholder={placeholder}
        disabled={disabled}
        maxLength={maxLength}
        rows={rows}
        value={value}
        defaultValue={defaultValue}
        onChange={(e) => { setCount(e.target.value.length); onChange?.(e); }}
        onFocus={(e) => { onFocusChange(true); onFocus?.(e); }}
        onBlur={(e) => { onFocusChange(false); onBlur?.(e); }}
        style={{ color: disabled ? 'var(--text-disabled-placeholder-disabled)' : 'var(--text-default-label)' }}
        {...textareaProps}
      />
      {showCounter && (
        <span className="text-label-s-regular" style={{ color: 'var(--text-default-placeholder)', alignSelf: 'flex-end', flexShrink: 0 }}>
          {len}{maxLength != null ? `/${maxLength}` : ''}
        </span>
      )}
    </div>
  );
});

/* ============================================================================
 * Rich field — a contentEditable surface with real Bold/Italic/Underline.
 * ========================================================================== */

const ALL_FORMATS: RichTextFormat[] = ['bold', 'italic', 'underline'];

const RichField = React.forwardRef<HTMLDivElement, {
  props: TextAreaRichProps;
  borderColor: string;
  onFocusChange: (focused: boolean) => void;
}>(function RichField({ props, borderColor, onFocusChange }, ref) {
  const {
    placeholder = 'Some descriptive text here would be very nice to see', disabled = false,
    maxLength, value, defaultValue, onChange, showCounter = true,
    onBold, onItalic, onUnderline, trailing, onSave, onCancel, saveDisabled = false, autoFocus = false, onFocus, onBlur,
  } = props;

  const editableRef = React.useRef<HTMLDivElement>(null);
  React.useImperativeHandle(ref, () => editableRef.current as HTMLDivElement, []);

  const stickyMarkerRef = React.useRef<HTMLElement | null>(null);
  const pendingFormatsRef = React.useRef<Set<RichTextFormat>>(new Set());
  const lastEmittedRef = React.useRef<string | undefined>(undefined);

  const [activeFormats, setActiveFormats] = React.useState<Set<RichTextFormat>>(new Set());
  const [hasContent, setHasContent] = React.useState(() => htmlToPlainText(value ?? defaultValue ?? '').length > 0);
  const [plainLength, setPlainLength] = React.useState(() => htmlToPlainText(value ?? defaultValue ?? '').length);

  // Seed initial content once.
  React.useEffect(() => {
    const el = editableRef.current;
    if (!el) return;
    const initial = sanitizeRichText(value ?? defaultValue ?? '');
    replaceContent(el, initial);
    lastEmittedRef.current = initial;
    if (autoFocus) {
      el.focus();
      // Place the caret at the very end of the seeded content.
      const range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(false);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync controlled `value` changes that didn't originate from this component
  // (e.g. the host clearing the field after Send) — never while the user is
  // actively producing the same value (guarded via lastEmittedRef) to avoid
  // clobbering the caret mid-edit.
  React.useEffect(() => {
    if (value === undefined) return;
    const el = editableRef.current;
    if (!el || value === lastEmittedRef.current) return;
    const clean = sanitizeRichText(value);
    replaceContent(el, clean);
    lastEmittedRef.current = clean;
    const plain = htmlToPlainText(clean);
    setHasContent(plain.length > 0);
    setPlainLength(plain.length);
    // `replaceContent` wipes the DOM the format state was derived from, so any
    // sticky-format marker is gone and the toolbar's pressed state is now stale.
    // Reset it — otherwise clearing the field after Send leaves e.g. Bold lit up
    // over an empty field, and the next keystroke wouldn't actually be bold.
    stickyMarkerRef.current = null;
    pendingFormatsRef.current = new Set();
    setActiveFormats(new Set());
  }, [value]);

  const notifyChange = React.useCallback(() => {
    const el = editableRef.current;
    if (!el) return;
    const clean = sanitizeRichText(el.innerHTML);
    lastEmittedRef.current = clean;
    onChange?.(clean);
    const plain = htmlToPlainText(clean);
    setHasContent(plain.length > 0);
    setPlainLength(plain.length);
  }, [onChange]);

  const recomputeActiveFormats = React.useCallback(() => {
    const el = editableRef.current;
    if (!el) return;
    const sel = getSelectionIn(el);
    if (!sel) return;
    const range = sel.getRangeAt(0);
    const next = range.collapsed
      ? (stickyMarkerRef.current ? new Set(pendingFormatsRef.current) : getFormatsAt(sel.anchorNode, el))
      : new Set(ALL_FORMATS.filter((f) => isRangeFullyFormatted(range, el, f)));
    setActiveFormats(next);
  }, []);

  // Live-sync the toolbar's pressed state with the caret/selection, like Docs.
  React.useEffect(() => {
    function handleSelectionChange() {
      const el = editableRef.current;
      if (!el) return;
      const sel = typeof window !== 'undefined' ? window.getSelection() : null;
      if (!sel || !el.contains(sel.anchorNode)) {
        const marker = stickyMarkerRef.current;
        if (marker) {
          if (marker.textContent === ZWSP) removeStickyMarker(el, marker);
          stickyMarkerRef.current = null;
          pendingFormatsRef.current = new Set();
        }
        return;
      }
      recomputeActiveFormats();
    }
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, [recomputeActiveFormats]);

  const handleToggleFormat = React.useCallback((format: RichTextFormat) => {
    const el = editableRef.current;
    if (!el || disabled) return;

    if (!getSelectionIn(el)) {
      // Never focused (or selection lives elsewhere) — focus it and place the
      // caret at the end before engaging the format.
      el.focus();
      const range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(false);
      const s = window.getSelection();
      s?.removeAllRanges();
      s?.addRange(range);
    }

    const liveSel = getSelectionIn(el);
    if (!liveSel) return;
    const range = liveSel.getRangeAt(0);

    let nextActive: boolean;
    if (!range.collapsed) {
      const wasActive = isRangeFullyFormatted(range, el, format);
      applyFormatToSelection(el, format);
      nextActive = !wasActive;
    } else {
      const marker = stickyMarkerRef.current;
      const pending = new Set(pendingFormatsRef.current);
      if (marker) {
        removeStickyMarker(el, marker);
        stickyMarkerRef.current = null;
      } else {
        getFormatsAt(liveSel.anchorNode, el).forEach((f) => pending.add(f));
      }
      if (pending.has(format)) pending.delete(format); else pending.add(format);
      pendingFormatsRef.current = pending;
      nextActive = pending.has(format);
      stickyMarkerRef.current = pending.size > 0 ? insertStickyMarker(el, pending) : null;
    }

    recomputeActiveFormats();
    notifyChange();
    el.focus();
    if (format === 'bold') onBold?.(nextActive);
    if (format === 'italic') onItalic?.(nextActive);
    if (format === 'underline') onUnderline?.(nextActive);
  }, [disabled, onBold, onItalic, onUnderline, recomputeActiveFormats, notifyChange]);

  const handleInput = React.useCallback(() => {
    const marker = stickyMarkerRef.current;
    if (marker && marker.textContent && marker.textContent !== ZWSP) {
      cleanStickyMarker(marker);
      stickyMarkerRef.current = null;
      pendingFormatsRef.current = new Set();
    }
    notifyChange();
    recomputeActiveFormats();
  }, [notifyChange, recomputeActiveFormats]);

  const handleBeforeInput = React.useCallback((e: React.FormEvent<HTMLDivElement>) => {
    if (maxLength == null) return;
    const native = e.nativeEvent as InputEvent;
    const insertingTypes = new Set(['insertText', 'insertCompositionText', 'insertFromPaste', 'insertLineBreak']);
    if (!native.inputType || !insertingTypes.has(native.inputType)) return; // deletions always allowed
    const el = editableRef.current;
    if (!el) return;
    const currentLen = htmlToPlainText(el.innerHTML).length;
    const insertLen = native.data?.length ?? 1;
    if (currentLen + insertLen > maxLength) e.preventDefault();
  }, [maxLength]);

  const handleKeyDown = React.useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Enter') return;
    // Match <textarea>: Enter always inserts a line break (Send is a separate,
    // explicit action) — but as one <br> we control, not a browser-inserted
    // <div>/<p> per line that our sanitizer would otherwise unwrap and merge.
    e.preventDefault();
    const el = editableRef.current;
    if (!el) return;
    insertLineBreak(el);
    notifyChange();
  }, [notifyChange]);

  const handlePaste = React.useCallback((e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const el = editableRef.current;
    if (!el) return;
    const html = e.clipboardData.getData('text/html');
    const text = e.clipboardData.getData('text/plain');
    if (html) insertSanitizedFragment(el, sanitizeRichText(html));
    else if (text) insertPlainText(el, text);
    notifyChange();
  }, [notifyChange]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', boxSizing: 'border-box' }}>
      <div
        style={{
          display: 'flex', flexDirection: 'column', gap: 'var(--spacing-8px)', boxSizing: 'border-box', width: '100%',
          minHeight: 120, padding: 'var(--padding-10px) var(--padding-12px)',
          backgroundColor: disabled ? 'var(--surface-disabled-input-field)' : 'var(--surface-neutral-input-field)',
          // Figma: Field has border on top/right/left only (no bottom — the footer's
          // top border is the divider) + top corners rounded.
          borderTop: `var(--stroke-xs) solid ${borderColor}`,
          borderRight: `var(--stroke-xs) solid ${borderColor}`,
          borderLeft: `var(--stroke-xs) solid ${borderColor}`,
          borderTopLeftRadius: 'var(--rounding-lg)',
          borderTopRightRadius: 'var(--rounding-lg)',
        }}
      >
        <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div
            ref={editableRef}
            contentEditable={!disabled}
            suppressContentEditableWarning
            role="textbox"
            aria-multiline="true"
            aria-placeholder={placeholder}
            className="leta-textarea__rich-input text-label-m-regular"
            style={{
              flex: 1, minHeight: 0, overflowY: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              color: disabled ? 'var(--text-disabled-placeholder-disabled)' : 'var(--text-default-label)',
              cursor: disabled ? 'not-allowed' : 'text',
            }}
            onInput={handleInput}
            onKeyDown={handleKeyDown}
            onBeforeInput={handleBeforeInput}
            onPaste={handlePaste}
            onFocus={(e) => { onFocusChange(true); onFocus?.(e); }}
            onBlur={(e) => { onFocusChange(false); onBlur?.(e); }}
          />
          {!hasContent && (
            <span
              aria-hidden
              className="text-label-m-regular"
              style={{ position: 'absolute', top: 0, left: 0, right: 0, color: 'var(--text-default-placeholder)', pointerEvents: 'none' }}
            >
              {placeholder}
            </span>
          )}
        </div>
        {showCounter && (
          <span className="text-label-s-regular" style={{ color: 'var(--text-default-placeholder)', alignSelf: 'flex-end', flexShrink: 0 }}>
            {plainLength}{maxLength != null ? `/${maxLength}` : ''}
          </span>
        )}
      </div>
      {/* Footer toolbar — full border + bottom corners rounded (Figma) */}
      <div
        style={{
          display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          gap: 'var(--spacing-8px)', padding: 'var(--padding-8px) var(--padding-12px)',
          boxSizing: 'border-box',
          border: `var(--stroke-xs) solid ${borderColor}`,
          borderBottomLeftRadius: 'var(--rounding-lg)',
          borderBottomRightRadius: 'var(--rounding-lg)',
          backgroundColor: 'var(--surface-neutral-bg-default)',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 'var(--spacing-8px)' }}>
          {/* Formatting toggles — apply Bold/Italic/Underline to the selection (or
              become "sticky" for the next typed text at a bare caret). Their pressed
              state is fully controlled, driven by the real DOM formatting under the
              caret/selection — never self-managed. onMouseDown/preventDefault keeps
              the text selection alive through the click (a button click would
              otherwise blur the field and collapse it first). */}
          <ToggleButton
            icon="Format-Bold"
            aria-label="Bold"
            pressed={activeFormats.has('bold')}
            onPressedChange={() => handleToggleFormat('bold')}
            onMouseDown={(e) => e.preventDefault()}
            disabled={disabled}
          />
          <ToggleButton
            icon="Format-Italics"
            aria-label="Italic"
            pressed={activeFormats.has('italic')}
            onPressedChange={() => handleToggleFormat('italic')}
            onMouseDown={(e) => e.preventDefault()}
            disabled={disabled}
          />
          <ToggleButton
            icon="Format-Underline"
            aria-label="Underline"
            pressed={activeFormats.has('underline')}
            onPressedChange={() => handleToggleFormat('underline')}
            onMouseDown={(e) => e.preventDefault()}
            disabled={disabled}
          />
        </div>
        {/* Trailing section — SLOT (Figma `38:42` Text Area / Rich): whatever the
            caller passes via `trailing` renders here. The DS default is a Secondary
            "Cancel" + Primary "Save" (Small, always Idle per Figma) wired to the
            `onCancel`/`onSave` callbacks; pass `trailing={null}` to render nothing
            (inline-edit variant, where Save/Cancel live in a separate card footer). */}
        {trailing !== null && (
          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 'var(--spacing-8px)' }}>
            {trailing ?? (
              <>
                <Button variant="secondary" size="small" onClick={onCancel} disabled={disabled}>Cancel</Button>
                <Button variant="primary" size="small" onClick={onSave} disabled={disabled || saveDisabled}>Save</Button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
});

/* ============================================================================
 * TextArea — shared chrome (label + message), dispatches to Basic/Rich field.
 * ========================================================================== */

export const TextArea = React.forwardRef<HTMLTextAreaElement | HTMLDivElement, TextAreaProps>(function TextArea(props, ref) {
  ensureStyles();
  const [focused, setFocused] = React.useState(false);
  const borderColor = borderColorFor(props.disabled, props.error, focused);

  return (
    <div
      className={props.className}
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 'var(--spacing-8px)', width: 350, boxSizing: 'border-box', ...props.style }}
    >
      {(props.showLabel ?? true) && (
        <LabelSection label={props.label ?? 'Label Text'} showLabelIcon={props.showLabelIcon} labelIcon={props.labelIcon} tag={props.tag ?? 'none'} labelToggle={props.labelToggle} />
      )}

      {props.variant === 'rich'
        ? <RichField ref={ref as React.Ref<HTMLDivElement>} props={props} borderColor={borderColor} onFocusChange={setFocused} />
        : <BasicField ref={ref as React.Ref<HTMLTextAreaElement>} props={props} borderColor={borderColor} onFocusChange={setFocused} />}

      <Message error={props.error} warning={props.warning} disabled={props.disabled} helperText={props.helperText ?? 'Helper text goes here'} showHelper={props.showHelper ?? true} />
    </div>
  );
});

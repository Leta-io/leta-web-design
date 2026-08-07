import * as React from 'react';
import { Icon, type IconName, type IconSize } from '@leta-io/icons';

/* ============================================================================
 * Axes
 * ========================================================================== */

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'ghost'
  | 'ghost-error'
  | 'dashed'
  | 'destructive'
  | 'plain'
  | 'success';

export type ButtonSize = 'extra-small' | 'small' | 'medium' | 'large' | 'fab';
export type ButtonPlatform = 'desktop' | 'mobile';

/**
 * Derived from prop combinations — mirrors Figma's Type variant axis.
 * Not exposed directly in the public API; consumers compose via iconLeft /
 * iconRight / iconOnly / prominent and we resolve the Type internally.
 */
type ButtonType =
  | 'no-icon'
  | 'leading-icon'
  | 'trailing-icon'
  | 'split-button'
  | 'icon-only'
  | 'prominent-icon-only';

export interface ButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'type'> {
  /** Visual variant. Default: 'primary'. Mobile-only: 'success'. FAB-only: 'primary' / 'secondary'. */
  variant?: ButtonVariant;
  /** Size. Default: 'medium'. FAB has no Disabled state. */
  size?: ButtonSize;
  /** Platform token set. Default: 'desktop'. */
  platform?: ButtonPlatform;
  /** Leading icon (`IconName` from @leta-io/icons). With both iconLeft and iconRight + label, renders as Split Button. */
  iconLeft?: IconName;
  /** Trailing icon. */
  iconRight?: IconName;
  /** When set, button renders icon-only — `children` is ignored. `aria-label` is required. */
  iconOnly?: IconName;
  /** Desktop-only "Prominent Icon Only" treatment (medium size only). Larger icon, tighter padding. */
  prominent?: boolean;
  /** Render the button's icon(s) using their outlined glyph variant (Figma `Icon/*-Outline`). Default false. */
  iconOutlined?: boolean;
  /** For Plain variant: render the link underline. Default: true. */
  showUnderline?: boolean;
  /** Standard HTML button type attribute. */
  type?: 'button' | 'submit' | 'reset';
  /**
   * When set, clicking cross-fades the button's icon to this icon for
   * `copiedDuration` ms — the "copy → check" contextual animation.
   * Works with `iconOnly`, `iconLeft`, and `iconRight`.
   */
  copyIcon?: IconName;
  /** When provided and `copyIcon` is set, the label text swaps to this string while copied. */
  copiedLabel?: string;
  /** How long (ms) to show the copied state before resetting. Default 2000. */
  copiedDuration?: number;
}

/* ============================================================================
 * Token lookup — (variant, platform, state) → { surface, border, text }
 * `null` means "bare" (no surface/border at this cell).
 * ========================================================================== */

type StateName = 'idle' | 'hover' | 'pressed' | 'focus' | 'disabled';
type VariantTokens = {
  surface: string | null;
  border: string | null;
  text: string;
};

const T = (surface: string | null, border: string | null, text: string): VariantTokens => ({
  surface,
  border,
  text,
});

/**
 * Maps a variant/state's resolved *text* token to the *icon* token Figma binds
 * the inner `<Icon>` to for that same cell. Both resolve to identical colours
 * in light and dark themes, so this is a semantic alignment with no visual
 * change — it sources icon colour from the `Icons/*` family Figma actually
 * uses on Button instances rather than letting it inherit the text token.
 * Any text token not listed falls through unchanged.
 */
const TEXT_TO_ICON: Record<string, string> = {
  '--text-default-label': '--icons-neutral-button',
  '--text-on-color-label': '--icons-on-color-button',
  '--text-disabled-label': '--icons-disabled-default',
  '--text-error-label': '--icons-error-default',
  '--text-secondary-plain-button-idle': '--icons-secondary-plain-button-idle',
  '--text-secondary-plain-button-hover': '--icons-secondary-plain-button-hover',
  '--text-secondary-plain-button-pressed': '--icons-secondary-plain-button-pressed',
};
const iconFor = (text: string): string => TEXT_TO_ICON[text] ?? text;

const DESKTOP_DISABLED = T(
  '--surface-disabled-filled-button',
  '--border-disabled-button',
  '--text-disabled-label',
);
const DESKTOP_DISABLED_SECONDARY = T(
  '--surface-disabled-secondary-button',
  '--border-disabled-button',
  '--text-disabled-label',
);
const MOBILE_DISABLED = T(
  '--surface-disabled-filled-button',
  '--border-disabled-default',
  '--text-disabled-label',
);
const MOBILE_DISABLED_SECONDARY = T(
  '--surface-disabled-secondary-button',
  '--border-disabled-button',
  '--text-disabled-label',
);
const BARE_DISABLED = T(null, null, '--text-disabled-label');

const DESKTOP_TOKENS: Record<ButtonVariant, Record<StateName, VariantTokens | null>> = {
  primary: {
    idle: T('--surface-secondary-primary-button-idle', '--border-secondary-primary-button', '--text-on-color-label'),
    hover: T('--surface-secondary-primary-button-hover', '--border-secondary-primary-button-hover', '--text-on-color-label'),
    pressed: T('--surface-secondary-primary-button-pressed', '--border-secondary-primary-button-pressed', '--text-on-color-label'),
    focus: T('--surface-secondary-primary-button-idle', '--border-secondary-primary-button', '--text-on-color-label'),
    disabled: DESKTOP_DISABLED,
  },
  secondary: {
    idle: T('--surface-neutral-secondary-button-idle', '--border-neutral-secondary-button-idle', '--text-default-label'),
    hover: T('--surface-neutral-secondary-button-hover', '--border-neutral-secondary-button-hover', '--text-default-label'),
    pressed: T('--surface-neutral-secondary-button-pressed', '--border-neutral-secondary-button-pressed', '--text-default-label'),
    focus: T('--surface-neutral-secondary-button-idle', '--border-neutral-secondary-button-idle', '--text-default-label'),
    disabled: DESKTOP_DISABLED_SECONDARY,
  },
  ghost: {
    // Idle/Focus are bare (transparent surface + no border) to match Figma — the
    // ghost-idle surface/border tokens resolve to opaque white, which showed as a
    // white box on non-white surfaces (e.g. the File Upload card). Hover/Pressed keep
    // their fills.
    idle: T(null, null, '--text-default-label'),
    hover: T('--surface-neutral-ghost-button-hover', '--border-neutral-ghost-button-hover', '--text-default-label'),
    pressed: T('--surface-neutral-ghost-button-pressed', '--border-neutral-ghost-button-pressed', '--text-default-label'),
    focus: T(null, null, '--text-default-label'),
    disabled: BARE_DISABLED,
  },
  'ghost-error': {
    idle: T(null, null, '--text-error-label'),
    hover: T('--surface-error-ghost-button-hover', '--border-error-ghost-button-hover', '--text-error-label'),
    pressed: T('--surface-error-ghost-button-pressed', '--border-error-ghost-button-pressed', '--text-error-label'),
    focus: T(null, null, '--text-error-label'),
    disabled: BARE_DISABLED,
  },
  dashed: {
    idle: T('--surface-neutral-secondary-button-idle', '--border-neutral-secondary-button-idle', '--text-default-label'),
    hover: T('--surface-neutral-secondary-button-hover', '--border-neutral-secondary-button-hover', '--text-default-label'),
    pressed: T('--surface-neutral-secondary-button-pressed', '--border-neutral-secondary-button-pressed', '--text-default-label'),
    focus: T('--surface-neutral-secondary-button-idle', '--border-neutral-secondary-button-idle', '--text-default-label'),
    disabled: DESKTOP_DISABLED_SECONDARY,
  },
  destructive: {
    idle: T('--surface-error-destructive-button-idle', '--border-error-destructive-button-idle', '--text-on-color-label'),
    hover: T('--surface-error-destructive-button-hover', '--border-error-destructive-button-hover', '--text-on-color-label'),
    pressed: T('--surface-error-destructive-button-pressed', '--border-error-destructive-button-pressed', '--text-on-color-label'),
    focus: T('--surface-error-destructive-button-idle', '--border-error-destructive-button-idle', '--text-on-color-label'),
    disabled: DESKTOP_DISABLED,
  },
  plain: {
    idle: T(null, null, '--text-secondary-plain-button-idle'),
    hover: T(null, null, '--text-secondary-plain-button-hover'),
    pressed: T(null, null, '--text-secondary-plain-button-pressed'),
    focus: T(null, null, '--text-secondary-plain-button-idle'),
    disabled: BARE_DISABLED,
  },
  success: { idle: null, hover: null, pressed: null, focus: null, disabled: null },
};

const MOBILE_TOKENS: Record<ButtonVariant, Record<StateName, VariantTokens | null>> = {
  primary: {
    idle: T('--surface-secondary-mobile-primary-button-idle', '--border-secondary-mobile-primary-button', '--text-on-color-label'),
    hover: null,
    pressed: T('--surface-secondary-mobile-primary-button-pressed', '--border-secondary-mobile-primary-button-pressed', '--text-on-color-label'),
    focus: null,
    disabled: MOBILE_DISABLED,
  },
  secondary: {
    idle: T('--surface-neutral-mobile-secondary-button-idle', '--border-neutral-mobile-secondary-button-idle', '--text-default-label'),
    hover: null,
    pressed: T('--surface-neutral-mobile-secondary-button-pressed', '--border-neutral-mobile-secondary-button-pressed', '--text-default-label'),
    focus: null,
    disabled: MOBILE_DISABLED_SECONDARY,
  },
  ghost: {
    // Bare idle (transparent) — see desktop ghost note.
    idle: T(null, null, '--text-default-label'),
    hover: null,
    pressed: T('--surface-neutral-mobile-ghost-button-pressed', '--border-neutral-mobile-ghost-button-pressed', '--text-default-label'),
    focus: null,
    disabled: MOBILE_DISABLED,
  },
  'ghost-error': {
    idle: T('--surface-error-mobile-ghost-button-idle', '--border-error-mobile-ghost-button-idle', '--text-error-label'),
    hover: null,
    pressed: T('--surface-error-mobile-ghost-button-pressed', '--border-error-mobile-ghost-button-pressed', '--text-error-label'),
    focus: null,
    disabled: BARE_DISABLED,
  },
  dashed: {
    idle: T('--surface-neutral-mobile-secondary-button-idle', '--border-neutral-mobile-secondary-button-idle', '--text-default-label'),
    hover: null,
    pressed: T('--surface-neutral-mobile-secondary-button-pressed', '--border-neutral-mobile-secondary-button-pressed', '--text-default-label'),
    focus: null,
    disabled: MOBILE_DISABLED_SECONDARY,
  },
  success: {
    idle: T('--surface-success-mobile-button-idle', '--border-success-mobile-button', '--text-on-color-label'),
    hover: null,
    pressed: T('--surface-success-mobile-button-pressed', '--border-success-mobile-button-pressed', '--text-on-color-label'),
    focus: null,
    disabled: MOBILE_DISABLED,
  },
  destructive: {
    idle: T('--surface-error-mobile-destructive-button-idle', '--border-error-mobile-destructive-button-idle', '--text-on-color-label'),
    hover: null,
    pressed: T('--surface-error-mobile-destructive-button-pressed', '--border-error-mobile-destructive-button-pressed', '--text-on-color-label'),
    focus: null,
    disabled: MOBILE_DISABLED,
  },
  plain: {
    idle: T(null, null, '--text-secondary-plain-button-idle'),
    hover: null,
    pressed: T(null, null, '--text-secondary-plain-button-pressed'),
    focus: null,
    disabled: BARE_DISABLED,
  },
};

/* ============================================================================
 * Layout — per-(Size, Type) padding + icon-size + dimensions.
 * Padding values come straight from Figma. Same table works for desktop
 * and mobile; only `height` and `cornerRadius` differ at Large.
 *
 * Padding tuple is [top, right, bottom, left] — matching Figma's spacing block.
 * ========================================================================== */

interface LayoutSpec {
  /** Outer dimension — for Icon Only / Prominent Icon Only this is the square; otherwise undefined (button hugs content). */
  side?: number;
  /** Outer height for label-bearing buttons. */
  height: number;
  paddingTop: number;
  paddingRight: number;
  paddingBottom: number;
  paddingLeft: number;
  /** Border radius — desktop varies by size; mobile is always pill. */
  desktopRadius: number;
  /** Border width on the visible edge. */
  borderWidth: number;
  /** Inner gap between icon(s) and label. */
  gap: number;
  /** LETA `IconSize` for the icon(s). */
  iconSize: IconSize;
  /** Tailwind text-style class for the label. */
  textClass: string;
}

const PILL = 9999;

/** Padding & icon-size table indexed by (size, type). */
const LAYOUT: Record<ButtonSize, Record<ButtonType, LayoutSpec>> = {
  // Extra Small is defined in Figma ONLY for Secondary / Icon Only across all 5 States
  // (24×24, padding 4, cornerRadius 4, borderWidth 1 [was 1.5 — standardized to 1px 2026-06-17], single Icon/Cancel leaf at 16×16).
  // Non-icon-only entries below are extrapolations to keep the type system honest;
  // the runtime guard warns when consumers use them. See spec at `28:38245`.
  'extra-small': {
    'no-icon':       { height: 24, paddingTop: 2, paddingRight: 8, paddingBottom: 2, paddingLeft: 8, desktopRadius: 4, borderWidth: 1, gap: 6, iconSize: 'small', textClass: 'text-label-s-semibold' },
    'leading-icon':  { height: 24, paddingTop: 2, paddingRight: 8, paddingBottom: 2, paddingLeft: 4, desktopRadius: 4, borderWidth: 1, gap: 6, iconSize: 'small', textClass: 'text-label-s-semibold' },
    'trailing-icon': { height: 24, paddingTop: 2, paddingRight: 4, paddingBottom: 2, paddingLeft: 8, desktopRadius: 4, borderWidth: 1, gap: 6, iconSize: 'small', textClass: 'text-label-s-semibold' },
    'split-button':  { height: 24, paddingTop: 2, paddingRight: 8, paddingBottom: 2, paddingLeft: 8, desktopRadius: 4, borderWidth: 1, gap: 6, iconSize: 'small', textClass: 'text-label-s-semibold' },
    'icon-only':            { side: 24, height: 24, paddingTop: 4, paddingRight: 4, paddingBottom: 4, paddingLeft: 4, desktopRadius: 4, borderWidth: 1, gap: 8, iconSize: 'small', textClass: 'text-label-s-semibold' },
    'prominent-icon-only':  { side: 24, height: 24, paddingTop: 4, paddingRight: 4, paddingBottom: 4, paddingLeft: 4, desktopRadius: 4, borderWidth: 1, gap: 8, iconSize: 'small', textClass: 'text-label-s-semibold' },
  },
  small: {
    'no-icon':       { height: 32, paddingTop: 8, paddingRight: 12, paddingBottom: 8, paddingLeft: 12, desktopRadius: 8, borderWidth: 1,   gap: 8, iconSize: 'small', textClass: 'text-label-s-semibold' },
    'leading-icon':  { height: 32, paddingTop: 8, paddingRight: 12, paddingBottom: 8, paddingLeft: 8,  desktopRadius: 8, borderWidth: 1,   gap: 8, iconSize: 'small', textClass: 'text-label-s-semibold' },
    'trailing-icon': { height: 32, paddingTop: 8, paddingRight: 8,  paddingBottom: 8, paddingLeft: 12, desktopRadius: 8, borderWidth: 1,   gap: 8, iconSize: 'small', textClass: 'text-label-s-semibold' },
    'split-button':  { height: 32, paddingTop: 8, paddingRight: 12, paddingBottom: 8, paddingLeft: 12, desktopRadius: 8, borderWidth: 1,   gap: 8, iconSize: 'small', textClass: 'text-label-s-semibold' },
    'icon-only':            { side: 32, height: 32, paddingTop: 8, paddingRight: 8,  paddingBottom: 8, paddingLeft: 8,  desktopRadius: 8, borderWidth: 1, gap: 8, iconSize: 'small', textClass: 'text-label-s-semibold' },
    'prominent-icon-only':  { side: 32, height: 32, paddingTop: 8, paddingRight: 8,  paddingBottom: 8, paddingLeft: 8,  desktopRadius: 8, borderWidth: 1, gap: 8, iconSize: 'small', textClass: 'text-label-s-semibold' },
  },
  medium: {
    'no-icon':       { height: 40, paddingTop: 10, paddingRight: 12, paddingBottom: 10, paddingLeft: 12, desktopRadius: 8, borderWidth: 1, gap: 8, iconSize: 'small', textClass: 'text-label-m-semibold' },
    'leading-icon':  { height: 40, paddingTop: 10, paddingRight: 12, paddingBottom: 10, paddingLeft: 8,  desktopRadius: 8, borderWidth: 1, gap: 8, iconSize: 'small', textClass: 'text-label-m-semibold' },
    'trailing-icon': { height: 40, paddingTop: 10, paddingRight: 8,  paddingBottom: 10, paddingLeft: 12, desktopRadius: 8, borderWidth: 1, gap: 8, iconSize: 'small', textClass: 'text-label-m-semibold' },
    'split-button':  { height: 40, paddingTop: 10, paddingRight: 12, paddingBottom: 10, paddingLeft: 12, desktopRadius: 8, borderWidth: 1, gap: 8, iconSize: 'small', textClass: 'text-label-m-semibold' },
    'icon-only':            { side: 40, height: 40, paddingTop: 12, paddingRight: 12, paddingBottom: 12, paddingLeft: 12, desktopRadius: 8, borderWidth: 1, gap: 8, iconSize: 'small', textClass: 'text-label-m-semibold' },
    'prominent-icon-only':  { side: 40, height: 40, paddingTop: 10, paddingRight: 10, paddingBottom: 10, paddingLeft: 10, desktopRadius: 8, borderWidth: 1, gap: 8, iconSize: 'large', textClass: 'text-label-m-semibold' },
  },
  large: {
    'no-icon':       { height: 48, paddingTop: 12, paddingRight: 16, paddingBottom: 12, paddingLeft: 16, desktopRadius: 12, borderWidth: 1, gap: 8, iconSize: 'large', textClass: 'text-label-l-semibold' },
    'leading-icon':  { height: 48, paddingTop: 12, paddingRight: 16, paddingBottom: 12, paddingLeft: 12, desktopRadius: 12, borderWidth: 1, gap: 8, iconSize: 'large', textClass: 'text-label-l-semibold' },
    'trailing-icon': { height: 48, paddingTop: 12, paddingRight: 12, paddingBottom: 12, paddingLeft: 16, desktopRadius: 12, borderWidth: 1, gap: 8, iconSize: 'large', textClass: 'text-label-l-semibold' },
    'split-button':  { height: 48, paddingTop: 12, paddingRight: 16, paddingBottom: 12, paddingLeft: 16, desktopRadius: 12, borderWidth: 1, gap: 8, iconSize: 'large', textClass: 'text-label-l-semibold' },
    'icon-only':            { side: 44, height: 44, paddingTop: 12, paddingRight: 12, paddingBottom: 12, paddingLeft: 12, desktopRadius: 12, borderWidth: 1, gap: 8, iconSize: 'large', textClass: 'text-label-l-semibold' },
    'prominent-icon-only':  { side: 44, height: 44, paddingTop: 12, paddingRight: 12, paddingBottom: 12, paddingLeft: 12, desktopRadius: 12, borderWidth: 1, gap: 8, iconSize: 'large', textClass: 'text-label-l-semibold' },
  },
  fab: {
    'no-icon':       { height: 56, paddingTop: 16, paddingRight: 20, paddingBottom: 16, paddingLeft: 20, desktopRadius: PILL, borderWidth: 1, gap: 8, iconSize: 'xl', textClass: 'text-label-l-semibold' },
    'leading-icon':  { height: 56, paddingTop: 16, paddingRight: 20, paddingBottom: 16, paddingLeft: 16, desktopRadius: PILL, borderWidth: 1, gap: 8, iconSize: 'xl', textClass: 'text-label-l-semibold' },
    'trailing-icon': { height: 56, paddingTop: 16, paddingRight: 16, paddingBottom: 16, paddingLeft: 20, desktopRadius: PILL, borderWidth: 1, gap: 8, iconSize: 'xl', textClass: 'text-label-l-semibold' },
    'split-button':  { height: 56, paddingTop: 16, paddingRight: 20, paddingBottom: 16, paddingLeft: 20, desktopRadius: PILL, borderWidth: 1, gap: 8, iconSize: 'xl', textClass: 'text-label-l-semibold' },
    'icon-only':            { side: 56, height: 56, paddingTop: 16, paddingRight: 16, paddingBottom: 16, paddingLeft: 16, desktopRadius: PILL, borderWidth: 1, gap: 8, iconSize: 'xl', textClass: 'text-label-l-semibold' },
    'prominent-icon-only':  { side: 56, height: 56, paddingTop: 16, paddingRight: 16, paddingBottom: 16, paddingLeft: 16, desktopRadius: PILL, borderWidth: 1, gap: 8, iconSize: 'xl', textClass: 'text-label-l-semibold' },
  },
};

// Mobile Large is 44 tall (vs Desktop 48) and uses label-m-semibold for the label.
const MOBILE_LARGE_OVERRIDES: Partial<Record<ButtonType, Partial<LayoutSpec>>> = {
  'no-icon':       { height: 44, textClass: 'text-label-m-semibold', iconSize: 'small' },
  'leading-icon':  { height: 44, textClass: 'text-label-m-semibold', iconSize: 'small' },
  'trailing-icon': { height: 44, textClass: 'text-label-m-semibold', iconSize: 'small' },
  'split-button':  { height: 44, textClass: 'text-label-m-semibold', iconSize: 'small' },
  'icon-only':           { side: 44, height: 44, iconSize: 'large' },
  'prominent-icon-only': { side: 44, height: 44, iconSize: 'large' },
};

function getLayout(size: ButtonSize, type: ButtonType, platform: ButtonPlatform): LayoutSpec {
  const base = LAYOUT[size][type];
  if (platform === 'mobile' && size === 'large') {
    return { ...base, ...MOBILE_LARGE_OVERRIDES[type] };
  }
  return base;
}

function deriveType(props: {
  iconLeft?: IconName;
  iconRight?: IconName;
  iconOnly?: IconName;
  prominent?: boolean;
}): ButtonType {
  if (props.iconOnly) return props.prominent ? 'prominent-icon-only' : 'icon-only';
  if (props.iconLeft && props.iconRight) return 'split-button';
  if (props.iconLeft) return 'leading-icon';
  if (props.iconRight) return 'trailing-icon';
  return 'no-icon';
}

/* ============================================================================
 * Pseudo-class style block (injected once per page)
 * ========================================================================== */

const STYLE_ID = 'leta-button-styles';
/* Solid-edge variants paint their border via `box-shadow: inset` so the
 * border doesn't consume content area (flex children would otherwise shrink
 * to fit). The Dashed variant keeps a real CSS border because box-shadow
 * doesn't support dashed strokes — its 1px shrink is a known minor
 * trade-off for that single variant. The visible "edge" is composed of:
 *   --leta-btn-edge-w   (border-width in px, 0 disables the edge)
 *   --leta-btn-edge     (color, falls back to transparent)
 *   --leta-btn-shadow   (drop shadow for FAB; combined into the same
 *                        `box-shadow` declaration)
 */
const BUTTON_STYLES = `
  .leta-btn {
    appearance: none;
    cursor: pointer;
    user-select: none;
    border: 0;
    /* Buttons are always single-line in the DS — without this, a hyphenated
       label ("TRP-107") wraps at the hyphen in a tight cell and a hugging
       Plain button doubles in height. */
    white-space: nowrap;
    transition:
      background-color 150ms ease-out,
      color 150ms ease-out,
      box-shadow 150ms ease-out,
      transform 150ms ease-out;
    background-color: var(--leta-btn-surface, transparent);
    color: var(--leta-btn-text);
    box-shadow:
      inset 0 0 0 var(--leta-btn-edge-w, 0) var(--leta-btn-edge, transparent),
      var(--leta-btn-drop, 0 0 0 0 transparent);
  }
  .leta-btn:hover:not(:disabled) {
    background-color: var(--leta-btn-surface-hover, var(--leta-btn-surface, transparent));
    color: var(--leta-btn-text-hover, var(--leta-btn-text));
    box-shadow:
      inset 0 0 0 var(--leta-btn-edge-w, 0) var(--leta-btn-edge-hover, var(--leta-btn-edge, transparent)),
      var(--leta-btn-drop, 0 0 0 0 transparent);
  }
  .leta-btn:active:not(:disabled) {
    background-color: var(--leta-btn-surface-pressed, var(--leta-btn-surface, transparent));
    color: var(--leta-btn-text-pressed, var(--leta-btn-text));
    box-shadow:
      inset 0 0 0 var(--leta-btn-edge-w, 0) var(--leta-btn-edge-pressed, var(--leta-btn-edge, transparent)),
      var(--leta-btn-drop, 0 0 0 0 transparent);
    transform: scale(0.96);
  }
  /* Icon colour is sourced from the Icons/* token family Figma binds, not the
     text token. Icon renders <svg fill="currentColor">, so we set color on the
     svg only — the label <span> keeps --leta-btn-text. */
  .leta-btn svg {
    color: var(--leta-btn-icon, var(--leta-btn-text));
    transition: color 150ms ease-out;
  }
  .leta-btn:hover:not(:disabled) svg {
    color: var(--leta-btn-icon-hover, var(--leta-btn-icon, var(--leta-btn-text-hover, var(--leta-btn-text))));
  }
  .leta-btn:active:not(:disabled) svg {
    color: var(--leta-btn-icon-pressed, var(--leta-btn-icon, var(--leta-btn-text-pressed, var(--leta-btn-text))));
  }
  .leta-btn:focus-visible:not(:disabled) {
    outline: var(--stroke-sm) solid var(--border-secondary-component-focus);
    outline-offset: 4px;
  }
  .leta-btn:disabled {
    cursor: not-allowed;
  }
  /* Dashed variant: traditional CSS border (box-shadow can't render dashed). */
  .leta-btn--dashed {
    border: var(--leta-btn-edge-w, 0) dashed var(--leta-btn-edge, transparent);
    box-shadow: var(--leta-btn-drop, 0 0 0 0 transparent);
  }
  .leta-btn--dashed:hover:not(:disabled) {
    border-color: var(--leta-btn-edge-hover, var(--leta-btn-edge, transparent));
    box-shadow: var(--leta-btn-drop, 0 0 0 0 transparent);
  }
  .leta-btn--dashed:active:not(:disabled) {
    border-color: var(--leta-btn-edge-pressed, var(--leta-btn-edge, transparent));
    box-shadow: var(--leta-btn-drop, 0 0 0 0 transparent);
  }
  /* Plain underline spans the whole content row (icons + label), not just the
     text run — text-decoration:underline only underlines inline text, leaving
     the flex-item icons un-underlined. A bottom border on the flex container
     draws one continuous line under the leading icon, label, gap, and trailing
     icon, matching Figma. currentColor tracks --leta-btn-text across states. */
  .leta-btn--plain.leta-btn--underline {
    border-bottom: 1px solid currentColor;
  }
`;

function ensureStylesInjected(): void {
  if (typeof document === 'undefined') return;
  if (document.getElementById(STYLE_ID)) return;
  const el = document.createElement('style');
  el.id = STYLE_ID;
  el.textContent = BUTTON_STYLES;
  document.head.appendChild(el);
}

/* ============================================================================
 * Component
 * ========================================================================== */

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'medium',
    platform = 'desktop',
    iconLeft,
    iconRight,
    iconOnly,
    prominent = false,
    iconOutlined = false,
    showUnderline = true,
    type = 'button',
    disabled,
    className,
    style,
    children,
    copyIcon,
    copiedLabel,
    copiedDuration = 2000,
    onClick,
    ...rest
  },
  ref,
) {
  React.useEffect(ensureStylesInjected, []);

  // Copy-animation state — tracks whether the button is in the "copied" state.
  const [isCopied, setIsCopied] = React.useState(false);
  const copyTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleClick = React.useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      if (copyIcon) {
        if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
        setIsCopied(true);
        copyTimerRef.current = setTimeout(() => setIsCopied(false), copiedDuration);
      }
      onClick?.(e);
    },
    [copyIcon, copiedDuration, onClick],
  );

  React.useEffect(() => () => { if (copyTimerRef.current) clearTimeout(copyTimerRef.current); }, []);

  // Two-layer blur/scale cross-fade when `copyIcon` is set.
  const animIcon = (name: IconName, size: IconSize) =>
    copyIcon ? (
      <span style={{ position: 'relative', width: size, height: size, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <span style={{
          transition: 'opacity 300ms ease-in-out, filter 300ms ease-in-out, transform 300ms ease-in-out',
          willChange: 'opacity, filter, transform',
          opacity: isCopied ? 0 : 1,
          filter: isCopied ? 'blur(4px)' : 'blur(0px)',
          transform: isCopied ? 'scale(0.25)' : 'scale(1)',
          display: 'flex',
        }}>
          <Icon name={name} size={size} outlined={iconOutlined} />
        </span>
        <span style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'opacity 300ms ease-in-out, filter 300ms ease-in-out, transform 300ms ease-in-out',
          willChange: 'opacity, filter, transform',
          opacity: isCopied ? 1 : 0,
          filter: isCopied ? 'blur(0px)' : 'blur(4px)',
          transform: isCopied ? 'scale(1)' : 'scale(0.25)',
        }}>
          <Icon name={copyIcon} size={size} outlined={iconOutlined} />
        </span>
      </span>
    ) : (
      <Icon name={name} size={size} outlined={iconOutlined} />
    );

  const buttonType = deriveType({ iconLeft, iconRight, iconOnly, prominent });

  if (process.env.NODE_ENV !== 'production') {
    if (variant === 'success' && platform !== 'mobile') {
      // eslint-disable-next-line no-console
      console.warn('[Button] variant="success" is only supported on platform="mobile"');
    }
    if (size === 'fab' && variant !== 'primary' && variant !== 'secondary') {
      // eslint-disable-next-line no-console
      console.warn(
        `[Button] FAB size only supports "primary" or "secondary" variants (got "${variant}")`,
      );
    }
    if (size === 'fab' && disabled) {
      // eslint-disable-next-line no-console
      console.warn('[Button] FAB size has no Disabled state in Figma');
    }
    if (size === 'extra-small' && variant !== 'secondary') {
      // eslint-disable-next-line no-console
      console.warn(
        `[Button] Extra Small size only supports "secondary" variant in Figma (got "${variant}") — rendering with extrapolated tokens`,
      );
    }
    if (size === 'extra-small' && buttonType !== 'icon-only') {
      // eslint-disable-next-line no-console
      console.warn(
        `[Button] Extra Small size is only defined in Figma for Icon Only (got Type="${buttonType}") — rendering with extrapolated paddings`,
      );
    }
    if (prominent && (size !== 'medium' || platform !== 'desktop')) {
      // eslint-disable-next-line no-console
      console.warn('[Button] prominent is only valid for desktop / size="medium" (matches Figma)');
    }
    if (iconOnly && !rest['aria-label']) {
      // eslint-disable-next-line no-console
      console.warn('[Button] iconOnly buttons require aria-label for accessibility');
    }
  }

  const tokenMap = platform === 'mobile' ? MOBILE_TOKENS : DESKTOP_TOKENS;
  const layout = getLayout(size, buttonType, platform);

  const idle = tokenMap[variant].idle ?? BARE_DISABLED;
  const hover = tokenMap[variant].hover ?? idle;
  const pressed = tokenMap[variant].pressed ?? idle;
  const disabledTokens = tokenMap[variant].disabled ?? BARE_DISABLED;

  const activeIdle = disabled ? disabledTokens : idle;
  const activeHover = disabled ? disabledTokens : hover;
  const activePressed = disabled ? disabledTokens : pressed;

  const isFab = size === 'fab';
  const isPlain = variant === 'plain';
  const isIconOnly = buttonType === 'icon-only' || buttonType === 'prominent-icon-only';

  // Plain is a compact link style in Figma: no surface/border, 0 padding,
  // gap 4, Medium-weight label, and height that hugs the text (= line-height)
  // rather than the standard 32/40/48 button box. The per-(size,type) LAYOUT
  // table is for filled buttons, so override those fields for Plain.
  const plainTextClass =
    size === 'large' || size === 'fab'
      ? 'text-label-l-medium'
      : size === 'medium'
        ? 'text-label-m-medium'
        : 'text-label-s-medium';
  const effLayout: LayoutSpec = isPlain
    ? {
        ...layout,
        paddingTop: 0,
        paddingRight: 0,
        paddingBottom: 0,
        paddingLeft: 0,
        gap: 4,
        textClass: plainTextClass,
      }
    : layout;

  const cssVars: Record<string, string> = {};
  const setVar = (k: string, v: string | null) => {
    if (v) cssVars[k] = `var(${v})`;
  };
  setVar('--leta-btn-surface', activeIdle.surface);
  setVar('--leta-btn-edge', activeIdle.border);
  setVar('--leta-btn-text', activeIdle.text);
  setVar('--leta-btn-surface-hover', activeHover.surface);
  setVar('--leta-btn-edge-hover', activeHover.border);
  setVar('--leta-btn-text-hover', activeHover.text);
  setVar('--leta-btn-surface-pressed', activePressed.surface);
  setVar('--leta-btn-edge-pressed', activePressed.border);
  setVar('--leta-btn-text-pressed', activePressed.text);
  setVar('--leta-btn-icon', iconFor(activeIdle.text));
  setVar('--leta-btn-icon-hover', iconFor(activeHover.text));
  setVar('--leta-btn-icon-pressed', iconFor(activePressed.text));
  cssVars['--leta-btn-edge-w'] = isPlain ? '0' : `${layout.borderWidth}px`;
  if (isFab) cssVars['--leta-btn-drop'] = 'var(--shadow-neutral-3)';

  // Plain is a squared-off link style — Figma removed its corner radius (all Plain
  // variants are cornerRadius 0), so the full-width underline draws straight, un-rounded
  // ends. Mobile is always pill; other desktop buttons use the per-size layout radius.
  const radius = isPlain ? 0 : platform === 'mobile' ? PILL : layout.desktopRadius;

  // Dashed keeps a real CSS border (so it shrinks content area by ~1px on
  // each side). For all other variants, the visible edge is painted via the
  // `box-shadow: inset` rule in BUTTON_STYLES — it doesn't consume content
  // area, so icons render at their full Figma size.
  const containerStyle: React.CSSProperties = {
    boxSizing: 'border-box',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: effLayout.gap,
    // Plain hugs its content vertically (height = line-height); filled buttons
    // use the fixed box height from the layout table.
    height: isPlain ? undefined : effLayout.height,
    width: effLayout.side,
    paddingTop: effLayout.paddingTop,
    paddingRight: effLayout.paddingRight,
    paddingBottom: effLayout.paddingBottom,
    paddingLeft: effLayout.paddingLeft,
    borderRadius: radius,
    ...cssVars,
    ...style,
  };

  const classes = [
    'leta-btn',
    `leta-btn--${variant}`,
    isPlain && showUnderline && !isIconOnly ? 'leta-btn--underline' : null,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  if (isIconOnly && iconOnly) {
    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled}
        className={classes}
        style={containerStyle}
        onClick={handleClick}
        {...rest}
      >
        {animIcon(iconOnly, effLayout.iconSize)}
      </button>
    );
  }

  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled}
      className={classes}
      style={containerStyle}
      onClick={handleClick}
      {...rest}
    >
      {iconLeft && animIcon(iconLeft, effLayout.iconSize)}
      {children && <span className={effLayout.textClass}>{copiedLabel && isCopied ? copiedLabel : children}</span>}
      {iconRight && animIcon(iconRight, effLayout.iconSize)}
    </button>
  );
});

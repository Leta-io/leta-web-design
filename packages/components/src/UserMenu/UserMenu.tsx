import * as React from 'react';
import { Icon } from '@leta-io/icons';
import { Avatar, type AvatarTone } from '../Avatar/Avatar.js';

export type UserMenuState = 'idle' | 'hover' | 'pressed';

export interface UserMenuProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'type'> {
  /** The user's name — drives the avatar initials and the accessible name. */
  name: string;
  /** Avatar photo URL (falls back to initials). */
  avatarSrc?: string;
  /** Avatar tone. Default `teal`. */
  tone?: AvatarTone;
  /** Force a visual state (catalogs) — overrides hover/press. */
  state?: UserMenuState;
}

const STYLE_ID = 'leta-user-menu-styles';
const STYLES = `
.leta-user-menu:focus-visible {
  outline: var(--stroke-sm) solid var(--border-secondary-component-focus);
  outline-offset: 4px;
}
`;
function ensureStyles(): void {
  if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return;
  const el = document.createElement('style');
  el.id = STYLE_ID;
  el.textContent = STYLES;
  document.head.appendChild(el);
}

const SURFACE: Record<UserMenuState, string> = {
  idle: 'var(--surface-neutral-user-menu-idle)',
  hover: 'var(--surface-neutral-user-menu-hover)',
  pressed: 'var(--surface-neutral-user-menu-pressed)',
};
const BORDER: Record<UserMenuState, string> = {
  idle: 'var(--border-neutral-user-menu-idle)',
  hover: 'var(--border-neutral-user-menu-hover)',
  pressed: 'var(--border-neutral-user-menu-pressed)',
};

/**
 * User-Menu — the account trigger in the Top Bar: a pill holding the user's
 * Avatar and a chevron, opening the user menu dropdown on click. Hover/pressed
 * are runtime; `state` forces a visual state for catalogs.
 *
 * **When to use:** the account control in the application Top Bar.
 * **When not to use:** the menu panel it opens (Desktop Dropdowns `user-menu`);
 * a plain avatar (Avatar).
 */
export const UserMenu = React.forwardRef<HTMLButtonElement, UserMenuProps>(function UserMenu(
  { name, avatarSrc, tone = 'teal', state, className, style, onMouseEnter, onMouseLeave, onMouseDown, onMouseUp, ...rest },
  ref,
) {
  ensureStyles();
  const [hover, setHover] = React.useState(false);
  const [press, setPress] = React.useState(false);
  const eff: UserMenuState = state ?? (press ? 'pressed' : hover ? 'hover' : 'idle');

  return (
    <button
      ref={ref}
      type="button"
      aria-haspopup="menu"
      aria-label={name}
      className={['leta-user-menu', className].filter(Boolean).join(' ')}
      style={{
        boxSizing: 'border-box',
        display: 'inline-flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 'var(--spacing-8px)',
        padding: 'var(--padding-4px)',
        borderRadius: 'var(--rounding-round)',
        border: 'none',
        cursor: 'pointer',
        backgroundColor: SURFACE[eff],
        boxShadow: `inset 0 0 0 var(--stroke-xs) ${BORDER[eff]}`,
        ...style,
      }}
      onMouseEnter={(e) => { setHover(true); onMouseEnter?.(e); }}
      onMouseLeave={(e) => { setHover(false); setPress(false); onMouseLeave?.(e); }}
      onMouseDown={(e) => { setPress(true); onMouseDown?.(e); }}
      onMouseUp={(e) => { setPress(false); onMouseUp?.(e); }}
      {...rest}
    >
      <Avatar name={name} src={avatarSrc} size="small" tone={tone} decorative />
      <span style={{ display: 'flex', color: 'var(--icons-neutral-default)' }}>
        <Icon name="Chevron-Down" size={20} />
      </span>
    </button>
  );
});

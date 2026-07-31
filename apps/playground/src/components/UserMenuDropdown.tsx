import * as React from 'react';
import { DesktopDropdowns } from '@leta/components';
import { useStore } from '../store/useStore.js';
import { CURRENT_USER } from '../store/currentUser.js';
import { Popover } from './Popover.js';

interface UserMenuDropdownProps {
  /** Trigger rect (the TopBar avatar). Null = closed. */
  anchorRect: DOMRect | null;
  onClose: () => void;
}

/**
 * UserMenuDropdown — the account menu opened from the TopBar avatar. Renders the
 * design-system `DesktopDropdowns variant="user-menu"` (avatar + name + email, then
 * the canonical grouped links ending in Logout) inside a portal `Popover`, anchored
 * to the avatar's bottom-right.
 *
 * `DesktopDropdowns` is presentational, so a thin click shim detects the Logout row
 * (by label) to fire a toast; any other row just closes the menu (the underlying
 * actions are deferred per the playground spec).
 */
export function UserMenuDropdown({ anchorRect, onClose }: UserMenuDropdownProps): React.ReactElement | null {
  const pushToast = useStore((s) => s.pushToast);

  if (!anchorRect) return null;

  const handleRowClick = (e: React.MouseEvent) => {
    const row = (e.target as HTMLElement).closest('[role="menuitem"], button, [data-row]');
    const label = (row?.textContent ?? '').trim();
    if (/log\s*out/i.test(label)) {
      pushToast({ type: 'success', title: 'Logged out', subtitle: `See you next time, ${CURRENT_USER.name.split(' ')[0]}!` });
    } else if (label) {
      pushToast({ type: 'success', title: label, subtitle: 'This feature is in progress.' });
    }
    onClose();
  };

  return (
    <Popover anchorRect={anchorRect} onClose={onClose} placement="bottom-end">
      <div onClick={handleRowClick}>
        <DesktopDropdowns
          variant="user-menu"
          userName={CURRENT_USER.name}
          userEmail={CURRENT_USER.email}
          userTone={CURRENT_USER.tone}
          userAvatarSrc={CURRENT_USER.avatarSrc}
        />
      </div>
    </Popover>
  );
}

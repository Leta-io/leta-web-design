import * as React from 'react';
import { DesktopMenuOptions } from '@leta-io/components';
import { useStore } from '../store/useStore.js';
import { Popover, MenuPanel } from './Popover.js';

interface ClientSwitcherDropdownProps {
  /** Trigger rect (the TopBar breadcrumb client chip). Null = closed. */
  anchorRect: DOMRect | null;
  onClose: () => void;
}

/**
 * ClientSwitcherDropdown — the account switcher opened from the breadcrumb client
 * chip. Lists every client tenant as a single-select `combobox` row (the active one
 * shows a trailing check); picking one calls `setClient`, which swaps the active
 * {@link import('../store/types.js').ClientConfig} that config-driven UI (the Add
 * Order drawer, etc.) reads. Rendered in a portal `Popover`, anchored bottom-start.
 */
export function ClientSwitcherDropdown({ anchorRect, onClose }: ClientSwitcherDropdownProps): React.ReactElement | null {
  const clients = useStore((s) => s.clients);
  const activeId = useStore((s) => s.client.id);
  const setClient = useStore((s) => s.setClient);

  if (!anchorRect) return null;

  return (
    <Popover anchorRect={anchorRect} onClose={onClose} placement="bottom-start">
      <MenuPanel width={240}>
        {clients.map((c) => (
          <DesktopMenuOptions
            key={c.id}
            type="combobox"
            label={c.name}
            leadingIcon="Company"
            active={c.id === activeId}
            onClick={() => {
              setClient(c.id);
              onClose();
            }}
          />
        ))}
      </MenuPanel>
    </Popover>
  );
}

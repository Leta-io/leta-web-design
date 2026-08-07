import * as React from 'react';
import { Icon, type IconName } from '@leta-io/icons';
import { LetaLogo } from '../LetaLogo/LetaLogo.js';
import { CollapsedSidebarLogo } from '../CollapsedSidebarLogo/CollapsedSidebarLogo.js';
import { SearchInput } from '../SearchInput/SearchInput.js';
import { Button } from '../Button/Button.js';
import { DesktopMenuOptions } from '../DesktopMenuOptions/DesktopMenuOptions.js';

/** `expanded` (240px, labelled nav) or `collapsed` (72px, icon-only nav). */
export type SideBarVariant = 'expanded' | 'collapsed';

/** One navigation destination. */
export interface SideBarItem {
  /** Item label (shown when expanded). Default "Module 1". */
  label?: string;
  /** Leading nav icon. Default the placeholder Question glyph (as in Figma). */
  leadingIcon?: IconName;
  /** The user's current location. */
  active?: boolean;
  /** Optional trailing content when expanded (e.g. an external-link icon or badge). */
  trailing?: React.ReactNode;
}

/** A group of nav items, optionally headed by a section label. Groups are divider-separated. */
export interface SideBarGroup {
  /** Section header label (e.g. "Management"). Omit for an unlabelled group. */
  label?: string;
  items: SideBarItem[];
}

export interface SideBarProps extends Omit<React.HTMLAttributes<HTMLElement>, 'children'> {
  /** Expanded (240px) or collapsed (72px). Default `expanded`. */
  variant?: SideBarVariant;
  /** Main nav groups (divider-separated). */
  groups?: SideBarGroup[];
  /** Footer nav items (Help Center, etc.). */
  footerItems?: SideBarItem[];
  /** Footer version string. Default "Leta Technologies v.3.1.5". */
  version?: string;
  /** Show the Global Search field (expanded) / search icon (collapsed). Default true. */
  showSearch?: boolean;
  /** Search placeholder. Default "Global Search". */
  searchPlaceholder?: string;
  /** Fired by the header collapse toggle (expanded) / the Collapsed Sidebar Logo (collapsed). */
  onToggleCollapse?: () => void;
  /** Fired when a nav item is clicked: (groupIndex, itemIndex). Footer items use groupIndex -1. */
  onItemClick?: (groupIndex: number, itemIndex: number) => void;
}

const DEFAULT_GROUPS: SideBarGroup[] = [
  { items: [{ label: 'Module 1', active: true }, { label: 'Module 1' }, { label: 'Module 1' }, { label: 'Module 1' }, { label: 'Module 1' }] },
  { label: 'Management', items: [{ label: 'Module 1' }, { label: 'Module 1' }, { label: 'Module 1' }] },
];
const DEFAULT_FOOTER: SideBarItem[] = [
  { label: 'Help Center', leadingIcon: 'Support' },
  { label: 'Get the Dispatch App', leadingIcon: 'Widget', trailing: <Icon name="Open" size={16} /> },
];

const Divider = () => (
  <div aria-hidden style={{ alignSelf: 'stretch', height: 0, borderTop: 'var(--stroke-xs) solid var(--border-neutral-default)' }} />
);

/**
 * Side Bar — the product's primary navigation: persistent access to top-level
 * destinations, in an expanded (labelled, 240px) or collapsed (icon-only, 72px)
 * column. Header (logo + collapse toggle), Global Search, divider-separated nav
 * groups, and a footer (utility links + version). Composes Leta Logo / Collapsed
 * Sidebar Logo, Search Input, Button, and the sidebar Desktop Menu Options.
 *
 * **When to use:** top-level navigation across the application.
 * **When not to use:** in-module section nav (Sidetab); page tabs (Page Tabs Control).
 */
export const SideBar = React.forwardRef<HTMLElement, SideBarProps>(function SideBar(
  {
    variant = 'expanded',
    groups = DEFAULT_GROUPS,
    footerItems = DEFAULT_FOOTER,
    version = 'Leta Technologies v.3.1.5',
    showSearch = true,
    searchPlaceholder = 'Global Search',
    onToggleCollapse,
    onItemClick,
    className,
    style,
    ...rest
  },
  ref,
) {
  // Collapse + active are managed internally (uncontrolled), seeded from props:
  // clicking the toggle flips the variant; clicking a nav item makes it active.
  const [collapsed, setCollapsed] = React.useState(variant === 'collapsed');
  // Track whether expanded labels are visible (for the fade animation).
  // On collapse: labels fade out immediately. On expand: labels fade in after
  // a 120ms delay so the width starts opening before text appears.
  const [labelsVisible, setLabelsVisible] = React.useState(!collapsed);
  const labelTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const seedActive = React.useMemo(() => {
    for (let gi = 0; gi < groups.length; gi++) {
      const ii = groups[gi]!.items.findIndex((it) => it.active);
      if (ii !== -1) return `${gi}:${ii}`;
    }
    return '0:0';
  }, [groups]);
  const [activeKey, setActiveKey] = React.useState(seedActive);

  const width = collapsed ? 72 : 240;
  const toggle = () => {
    setCollapsed((c) => {
      const next = !c;
      if (labelTimerRef.current) clearTimeout(labelTimerRef.current);
      if (next) {
        // Collapsing: hide labels immediately
        setLabelsVisible(false);
      } else {
        // Expanding: show labels after width starts opening
        labelTimerRef.current = setTimeout(() => setLabelsVisible(true), 120);
      }
      return next;
    });
    onToggleCollapse?.();
  };
  React.useEffect(() => () => { if (labelTimerRef.current) clearTimeout(labelTimerRef.current); }, []);
  const clickItem = (gi: number, ii: number) => { setActiveKey(`${gi}:${ii}`); onItemClick?.(gi, ii); };

  const navItem = (item: SideBarItem, gi: number, ii: number) => {
    const active = activeKey === `${gi}:${ii}`;
    return collapsed ? (
      <DesktopMenuOptions
        key={ii}
        type="sidebar-main-icon"
        leadingIcon={item.leadingIcon}
        active={active}
        onClick={() => clickItem(gi, ii)}
      />
    ) : (
      <DesktopMenuOptions
        key={ii}
        type="sidebar-main"
        label={item.label}
        leadingIcon={item.leadingIcon}
        showLeadingIcon
        active={active}
        badge={item.trailing}
        onClick={() => clickItem(gi, ii)}
      />
    );
  };

  const group = (g: SideBarGroup, gi: number) => (
    <div key={gi} style={{ display: 'flex', flexDirection: 'column', alignItems: collapsed ? 'center' : 'stretch', gap: 'var(--spacing-4px)' }}>
      {!collapsed && g.label && (
        <span
          className="text-label-s-medium"
          style={{ color: 'var(--text-default-label-idle)', padding: 'var(--padding-8px) var(--padding-12px) var(--padding-4px)' }}
        >
          {g.label}
        </span>
      )}
      {g.items.map((item, ii) => navItem(item, gi, ii))}
    </div>
  );

  return (
    <nav
      ref={ref}
      aria-label="Primary"
      className={['leta-sidebar', className].filter(Boolean).join(' ')}
      style={{
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--spacing-16px)',
        width,
        // Smoothly animate the expand/collapse width change (72 ↔ 240).
        transition: 'width 240ms cubic-bezier(0.16, 1, 0.3, 1)',
        height: '100%',
        paddingBottom: 'var(--padding-24px)',
        backgroundColor: 'var(--surface-neutral-bg-default)',
        // Figma: both variants carry a 1px right stroke (INSIDE) — the demarcator
        // between the rail and the page content. box-sizing: border-box keeps it
        // within the 72/240 width.
        borderRight: 'var(--stroke-xs) solid var(--border-neutral-default)',
        ...style,
      }}
      {...rest}
    >
      {/* Header — fixed 64px (Figma Sidebar Header) with a full-width 1px bottom
          demarcator that lines up with the Top Bar's bottom border. box-sizing
          border-box keeps the border inside the 64px so it sits at y=64, exactly
          where the Top Bar's border is (otherwise the two lines are 1px apart). */}
      <div
        style={{
          boxSizing: 'border-box',
          height: 64,
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          padding: 'var(--padding-12px)',
          borderBottom: 'var(--stroke-xs) solid var(--border-neutral-default)',
        }}
      >
        {collapsed ? (
          <CollapsedSidebarLogo aria-label="Expand sidebar" onClick={toggle} />
        ) : (
          <>
            <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-8px)' }}>
              <LetaLogo type="symbol" />
              <LetaLogo type="wordmark" />
            </span>
            <Button variant="ghost" size="medium" prominent iconOnly="Sidebar" aria-label="Collapse sidebar" onClick={toggle} />
          </>
        )}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', overscrollBehavior: 'contain', display: 'flex', flexDirection: 'column', alignItems: collapsed ? 'center' : 'stretch', gap: 'var(--spacing-20px)', padding: '0 var(--padding-12px)' }}>
        {showSearch &&
          (collapsed ? (
            <DesktopMenuOptions type="sidebar-main-icon" leadingIcon="Search" aria-label="Search" />
          ) : (
            <div style={{ opacity: labelsVisible ? 1 : 0, transition: 'opacity 150ms ease-out' }}>
              <SearchInput placeholder={searchPlaceholder} style={{ width: '100%' }} />
            </div>
          ))}
        {groups.map((g, gi) => (
          <React.Fragment key={gi}>
            {gi > 0 && <Divider />}
            {collapsed ? group(g, gi) : (
              <div style={{ opacity: labelsVisible ? 1 : 0, transition: 'opacity 150ms ease-out' }}>
                {group(g, gi)}
              </div>
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: collapsed ? 'center' : 'stretch', gap: 'var(--spacing-20px)', padding: '0 var(--padding-12px)', flexShrink: 0 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: collapsed ? 'center' : 'stretch', gap: 'var(--spacing-4px)' }}>
          {collapsed ? footerItems.map((item, ii) => navItem(item, -1, ii)) : (
            <div style={{ opacity: labelsVisible ? 1 : 0, transition: 'opacity 150ms ease-out' }}>
              {footerItems.map((item, ii) => navItem(item, -1, ii))}
            </div>
          )}
        </div>
        {!collapsed && version && (
          <span className="text-label-s-regular" style={{ color: 'var(--text-default-label-idle)', padding: '0 var(--padding-12px)', opacity: labelsVisible ? 1 : 0, transition: 'opacity 150ms ease-out' }}>
            {version}
          </span>
        )}
      </div>
    </nav>
  );
});

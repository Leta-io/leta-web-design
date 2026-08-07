import * as React from 'react';
import { Icon } from '@leta-io/icons';
import { Button } from '../Button/Button.js';

export type BreadcrumbsType = 'nested' | 'global-client' | 'global-admin';

/** A single ancestor (link) crumb in the trail. */
export interface BreadcrumbCrumb {
  /** Visible label. */
  label: string;
  /** Fired when the crumb is activated (navigate up the tree). */
  onClick?: () => void;
}

export interface BreadcrumbsProps extends React.HTMLAttributes<HTMLElement> {
  /** Which trail style to render. Default `nested`. */
  type?: BreadcrumbsType;
  /** Ancestor link crumbs, root → leaf, excluding the current page. */
  items?: BreadcrumbCrumb[];
  /** The current page label — rendered non-interactive with `aria-current`. Ignored when `children` is provided. */
  current?: string;
  /**
   * Trail-content slot (Figma `Nested Content` / `Global Client Content` /
   * `Global Admin Content` SLOT — one per `type`). When provided, the injected
   * nodes replace the auto-built trail, laid out in the component's owned
   * horizontal `--spacing-8px` row. Omit to render the data-driven default
   * (`items` + `current`, root chip for the global variants).
   */
  children?: React.ReactNode;
  /** Company / client name shown at the root of the global variants. */
  client?: string;
  /**
   * Root-chip activation. For `global-admin` this opens the client-switcher
   * dropdown (the overlay itself is a separate component); for `global-client`
   * it optionally navigates to the client home. When omitted, the
   * `global-client` root renders as a non-interactive label (matching Figma).
   */
  onClientClick?: () => void;
}

const STYLE_ID = 'leta-breadcrumbs-styles';
const STYLES = `
  .leta-breadcrumbs { display: inline-flex; }
  .leta-breadcrumbs ol {
    display: inline-flex;
    align-items: center;
    gap: var(--spacing-8px);
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .leta-breadcrumbs li { display: inline-flex; align-items: center; }
  .leta-breadcrumb-root {
    display: inline-flex;
    align-items: center;
    gap: var(--spacing-8px);
    background: none;
    border: 0;
    padding: 0;
    margin: 0;
    border-radius: var(--rounding-sm);
    color: var(--text-default-label);
    cursor: default;
  }
  button.leta-breadcrumb-root { cursor: pointer; }
  button.leta-breadcrumb-root:focus-visible {
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

/**
 * Breadcrumbs — a horizontal trail showing the user's location in a hierarchy,
 * with each ancestor a link back up the tree, ending in the current page.
 *
 * **When to use:** pages nested ≥2 levels deep, so users can orient and
 * navigate up.
 *
 * **When NOT to use:** flat hierarchies, or as primary navigation.
 *
 * Three variants (Figma `9108:33624`):
 * - **nested** — in-section hierarchy; Small link crumbs.
 * - **global-client** — client-app wayfinding rooted at a company chip
 *   (`Icon/Company` + name); Medium link crumbs.
 * - **global-admin** — admin wayfinding whose root is a Plain split button
 *   (`Icon/Company` + name + `Icon/Stepper`) that opens a client-switcher
 *   dropdown via `onClientClick`; Medium link crumbs.
 *
 * Data-driven: pass `items` (ancestor links) + `current`. Crumbs are separated
 * by a `/` slash; the current page is muted + semibold and non-interactive
 * (`aria-current="page"`). Renders semantic `<nav aria-label><ol><li>`.
 */
export const Breadcrumbs = React.forwardRef<HTMLElement, BreadcrumbsProps>(
  function Breadcrumbs(
    {
      type = 'nested',
      items = [],
      current,
      client = 'Acme Corp',
      onClientClick,
      children,
      className,
      ...rest
    },
    ref,
  ) {
    ensureStyles();

    // Trail-content SLOT: caller-injected crumbs replace the data-driven trail,
    // laid out in the component's owned horizontal gap-8 row.
    if (children != null) {
      return (
        <nav
          ref={ref}
          aria-label="Breadcrumb"
          className={['leta-breadcrumbs', className].filter(Boolean).join(' ')}
          {...rest}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--spacing-8px)' }}>
            {children}
          </span>
        </nav>
      );
    }

    const linkSize = type === 'nested' ? 'small' : 'medium';
    const currentClass = type === 'nested' ? 'text-label-s-semibold' : 'text-label-m-semibold';

    // Build the ordered list of crumb nodes (root chip → links → current),
    // then interleave slash separators.
    const crumbs: React.ReactNode[] = [];

    if (type === 'global-client') {
      const inner = (
        <>
          <Icon name="Company" size={16} color="var(--icons-neutral-default)" aria-hidden />
          <span className="text-label-m-medium">{client}</span>
        </>
      );
      crumbs.push(
        onClientClick ? (
          <button type="button" className="leta-breadcrumb-root" onClick={onClientClick}>
            {inner}
          </button>
        ) : (
          <span className="leta-breadcrumb-root">{inner}</span>
        ),
      );
    } else if (type === 'global-admin') {
      crumbs.push(
        <Button
          variant="plain"
          size="medium"
          iconLeft="Company"
          iconRight="Stepper"
          showUnderline={false}
          onClick={onClientClick}
          aria-label={`${client} — switch client`}
        >
          {client}
        </Button>,
      );
    }

    items.forEach((it) => {
      crumbs.push(
        <Button variant="plain" size={linkSize} showUnderline={false} onClick={it.onClick}>
          {it.label}
        </Button>,
      );
    });

    if (current != null) {
      crumbs.push(
        <span
          className={currentClass}
          aria-current="page"
          style={{ color: 'var(--text-default-label-idle)' }}
        >
          {current}
        </span>,
      );
    }

    return (
      <nav
        ref={ref}
        aria-label="Breadcrumb"
        className={['leta-breadcrumbs', className].filter(Boolean).join(' ')}
        {...rest}
      >
        <ol>
          {crumbs.map((node, i) => (
            <React.Fragment key={i}>
              <li>{node}</li>
              {i < crumbs.length - 1 && (
                <li
                  aria-hidden="true"
                  className="text-label-m-regular"
                  style={{ color: 'var(--text-default-label-idle)' }}
                >
                  /
                </li>
              )}
            </React.Fragment>
          ))}
        </ol>
      </nav>
    );
  },
);

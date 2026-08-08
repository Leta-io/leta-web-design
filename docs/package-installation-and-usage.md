# Installing and Using the Published Packages

This repository publishes the public LETA design-system packages to GitHub Packages under the `@leta-io` scope.

## Published Packages

| Package                  | Purpose                                                                             | Current version |
| ------------------------ | ----------------------------------------------------------------------------------- | --------------- |
| `@leta-io/design-tokens` | Generated CSS variables, text utilities, fonts, Tailwind preset, and theme provider | `0.0.1`         |
| `@leta-io/icons`         | LETA SVG icon React component and icon registry                                     | `0.0.1`         |
| `@leta-io/components`    | LETA React component library                                                        | `0.0.1`         |

`@leta/cli` is private and is not installed by product applications. It is used inside this repository to generate tokens from Figma snapshots.

## Requirements

- Node `>=20`
- React `^18.0.0` or `^19.0.0`
- React DOM `^18.0.0` or `^19.0.0` when using `@leta-io/components`
- A GitHub token with package read access for `npm.pkg.github.com`

## Configure GitHub Packages

Create or update `.npmrc` in the consuming app:

```ini
@leta-io:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
```

Set `NODE_AUTH_TOKEN` before installing:

```bash
export NODE_AUTH_TOKEN=github_pat_or_classic_token
```

In CI, store the token as a secret and expose it as `NODE_AUTH_TOKEN` only for install steps.

## Install

Install all three public packages for a normal React app:

```bash
pnpm add @leta-io/design-tokens @leta-io/icons @leta-io/components
```

Equivalent commands:

```bash
npm install @leta-io/design-tokens @leta-io/icons @leta-io/components
yarn add @leta-io/design-tokens @leta-io/icons @leta-io/components
bun add @leta-io/design-tokens @leta-io/icons @leta-io/components
```

Install React peer dependencies if the app does not already have them:

```bash
pnpm add react react-dom
```

## App Root Setup

Import the token CSS once at the app root, then wrap the app with `LetaThemeProvider`.

```tsx
import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { LetaThemeProvider } from '@leta-io/design-tokens';

import '@leta-io/design-tokens/css';
import '@leta-io/design-tokens/text-styles.css';
import '@leta-io/design-tokens/scroll-utilities.css';
import '@leta-io/design-tokens/fonts';

import { App } from './App';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <LetaThemeProvider>
      <App />
    </LetaThemeProvider>
  </React.StrictMode>,
);
```

The provider sets `data-theme` on `<html>` by default. Token CSS reads that attribute to resolve light and dark theme values.

## Theme Switching

Use `useLetaTheme` inside a component wrapped by `LetaThemeProvider`.

```tsx
import { useLetaTheme } from '@leta-io/design-tokens';

export function ThemeToggle() {
  const { theme, toggleTheme } = useLetaTheme();

  return (
    <button type="button" onClick={toggleTheme}>
      Switch to {theme === 'dark' ? 'light' : 'dark'}
    </button>
  );
}
```

For controlled theme state:

```tsx
<LetaThemeProvider theme={theme} onThemeChange={setTheme}>
  <App />
</LetaThemeProvider>
```

For side-by-side themed previews, set the theme on a wrapping container instead of the document root:

```tsx
<LetaThemeProvider target="container" defaultTheme="dark">
  <Preview />
</LetaThemeProvider>
```

## Using Components

Import components from `@leta-io/components`.

```tsx
import { Badge, Button, EmptyState, InputField } from '@leta-io/components';

export function OrderActions() {
  return (
    <section>
      <Badge label="Broadcasted" color="information" leadingIcon="Broadcast" />
      <InputField label="Customer name" placeholder="Enter customer name" />
      <Button variant="primary" iconLeft="Add">
        Create order
      </Button>
      <EmptyState type="no-orders" heading="No orders yet" />
    </section>
  );
}
```

Components rely on the token CSS imports from the app root. Without `@leta-io/design-tokens/css` and `@leta-io/design-tokens/text-styles.css`, visual styling will be incomplete.

## Using Icons

Import `Icon` from `@leta-io/icons`.

```tsx
import { Icon, type IconName } from '@leta-io/icons';

export function NavItem({ icon, label }: { icon: IconName; label: string }) {
  return (
    <span style={{ color: 'var(--icons-neutral-button)' }}>
      <Icon name={icon} size="medium" title={label} />
      {label}
    </span>
  );
}
```

Icon defaults:

- `outlined` defaults to `true`
- `size` defaults to `medium`
- `color` defaults to `currentColor`
- Icons are decorative unless `title` is provided

Use the filled glyph variant when needed:

```tsx
<Icon name="Check-Circle" outlined={false} color="var(--icons-success-default)" />
```

## Using Design Tokens

### CSS Variables

After importing `@leta-io/design-tokens/css`, use CSS variables directly:

```tsx
export function Surface({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        background: 'var(--surface-neutral-page-primary)',
        color: 'var(--text-default-label)',
        padding: 'var(--spacing-16px)',
        borderRadius: 'var(--rounding-md)',
      }}
    >
      {children}
    </div>
  );
}
```

### TypeScript Token Map

Use the generated `tokens` map when code needs a typed token name.

```tsx
import { tokens } from '@leta-io/design-tokens';

const cardStyle = {
  background: `var(${tokens.surfaceNeutralCardIdle})`,
  color: `var(${tokens.textDefaultLabel})`,
};
```

### Text Utility Classes

After importing `@leta-io/design-tokens/text-styles.css`, use generated text classes:

```tsx
<h1 className="text-heading-l-bold">Orders</h1>
<p className="text-body-m-regular">Track order status and dispatch activity.</p>
<span className="text-label-s-medium">In progress</span>
```

Class names are generated from Figma text style names as `text-{category}-{size}-{weight}`.

### Scroll Utilities

After importing `@leta-io/design-tokens/scroll-utilities.css`, use:

```tsx
<div className="scroll-isolated" style={{ overflowY: 'auto', maxHeight: 320 }}>
  {items}
</div>

<div className="scroll-rigid" style={{ overflow: 'auto', maxHeight: 600 }}>
  <table>{rows}</table>
</div>
```

Use `scroll-isolated` for nested panels and lists. Use `scroll-rigid` for table bodies and precision snap-scroll surfaces.

## Tailwind Integration

The design-token package exposes a Tailwind preset:

```ts
import letaPreset from '@leta-io/design-tokens/tailwind';

export default {
  presets: [letaPreset],
  content: ['./src/**/*.{ts,tsx,js,jsx}'],
};
```

Keep importing the token CSS at the app root even when using the Tailwind preset. The preset maps Tailwind theme values to the same CSS variables, and the CSS file provides the runtime values.

## Package Exports

`@leta-io/design-tokens` exports:

- `LetaThemeProvider`
- `useLetaTheme`
- `tokens`
- `@leta-io/design-tokens/css`
- `@leta-io/design-tokens/fonts`
- `@leta-io/design-tokens/text-styles.css`
- `@leta-io/design-tokens/scroll-utilities.css`
- `@leta-io/design-tokens/tailwind`

`@leta-io/icons` exports:

- `Icon`
- `REGISTRY`
- `IconName`
- `IconProps`
- `IconSize`

`@leta-io/components` exports the public React components and their prop types from the package root:

```tsx
import { Button, type ButtonProps } from '@leta-io/components';
```

## Troubleshooting

If install returns `401 Unauthorized` or `403 Forbidden`, verify `.npmrc`, `NODE_AUTH_TOKEN`, and package read permissions for the `Leta-io` GitHub organization.

If components render without correct color, spacing, or type styles, verify these imports run once before rendering the app:

```ts
import '@leta-io/design-tokens/css';
import '@leta-io/design-tokens/text-styles.css';
import '@leta-io/design-tokens/scroll-utilities.css';
import '@leta-io/design-tokens/fonts';
```

If `useLetaTheme` throws, the component is outside `<LetaThemeProvider>`.

If TypeScript cannot resolve package subpaths such as `@leta-io/design-tokens/css`, use `moduleResolution: "Bundler"` or a modern Node-compatible module resolution mode.

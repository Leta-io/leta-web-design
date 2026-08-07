import type { Meta, StoryObj } from '@storybook/react-vite';
import * as React from 'react';
import { tokens } from '@leta-io/design-tokens';

/**
 * Live swatch grid — reads every token name from the generated `tokens` map
 * and renders a chip whose background is `var(<token>)`. This means the page
 * automatically picks up new colors as Figma tokens are added or renamed,
 * without anyone updating this file.
 */

interface SwatchGroup {
  /** Heading shown above the group. */
  title: string;
  /** Predicate against the kebab-cased token name (without leading `--`). */
  match: (kebab: string) => boolean;
}

const GROUPS: SwatchGroup[] = [
  { title: 'Brand — Primitive Colors', match: (k) => k.startsWith('primitive-colors-') },
  { title: 'Alias — Semantic Colors', match: (k) => k.startsWith('colors-') },
  { title: 'Mapped — Surface', match: (k) => k.startsWith('surface-') },
  { title: 'Mapped — Text', match: (k) => k.startsWith('text-') && !k.startsWith('text-styles-') },
  { title: 'Mapped — Icons', match: (k) => k.startsWith('icons-') && !k.startsWith('icons-size-') },
  { title: 'Mapped — Border', match: (k) => k.startsWith('border-') },
];

interface Swatch {
  cssVar: string; // "--surface-primary-bg"
  kebab: string; // "surface-primary-bg"
}

function buildSwatches(): Swatch[] {
  // tokens is `{ camelKey: cssVar }` — flip + filter to those that look like colors.
  // We can't introspect resolved type from the bundled map, but every entry is a valid CSS var.
  return Object.values(tokens).map((cssVar) => ({
    cssVar,
    kebab: cssVar.replace(/^--/, ''),
  }));
}

function ColorTable({ group, swatches }: { group: SwatchGroup; swatches: Swatch[] }) {
  const matched = swatches.filter((s) => group.match(s.kebab));
  if (matched.length === 0) return null;
  return (
    <section style={{ marginBottom: 32 }}>
      <h3 style={{ font: 'var(--heading-s-bold-size)/1.2 var(--inter-family)', margin: '0 0 12px' }}>
        {group.title} <span style={{ color: 'var(--text-default-helper)', fontWeight: 400 }}>({matched.length})</span>
      </h3>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: 8,
        }}
      >
        {matched.map((s) => (
          <div
            key={s.cssVar}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: 8,
              borderRadius: 8,
              background: 'var(--surface-neutral-bg-subtle, var(--surface-neutral-bg-default))',
              border: '1px solid var(--border-default-subtle, transparent)',
            }}
          >
            <span
              aria-hidden
              style={{
                width: 32,
                height: 32,
                borderRadius: 6,
                background: `var(${s.cssVar})`,
                border: '1px solid rgba(0,0,0,0.08)',
                flex: '0 0 auto',
              }}
            />
            <code style={{ fontSize: 11, lineHeight: 1.3, wordBreak: 'break-all' }}>{s.cssVar}</code>
          </div>
        ))}
      </div>
    </section>
  );
}

const ColorsView: React.FC = () => {
  const swatches = buildSwatches();
  return (
    <div>
      <p style={{ color: 'var(--text-default-helper)', maxWidth: 640 }}>
        Every color token registered in <code>tokens.css</code>. Switch the toolbar theme to see Mapped Colors swap to dark mode. Brand and Alias values don't change between themes (they're the source primitives).
      </p>
      {GROUPS.map((g) => (
        <ColorTable key={g.title} group={g} swatches={swatches} />
      ))}
    </div>
  );
};

const meta: Meta<typeof ColorsView> = {
  title: 'Foundations/Tokens/Colors',
  component: ColorsView,
};

export default meta;
type Story = StoryObj<typeof ColorsView>;

export const All: Story = {};

// Public entrypoint for @leta-io/design-tokens.
//
// Components import from this module to access:
//   - <LetaThemeProvider> for runtime theme switching
//   - useLetaTheme()      for reading/writing the current theme
//   - tokens              (CSS-var name map; generated from Figma)
//
// Token CSS files are imported directly via:
//   import '@leta-io/design-tokens/css';
//   import '@leta-io/design-tokens/text-styles.css';
//
// Tailwind preset is consumed via:
//   import letaPreset from '@leta-io/design-tokens/tailwind';

export { LetaThemeProvider, useLetaTheme } from './theme-provider.js';
export type { LetaTheme, LetaThemeContextValue, LetaThemeProviderProps } from './theme-provider.js';
export { tokens } from './generated/tokens.js';
export type { TokenKey } from './generated/tokens.js';

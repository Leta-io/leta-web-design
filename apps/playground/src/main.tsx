import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { LetaThemeProvider } from '@leta-io/design-tokens';

// Design-token cascade — mirrors Storybook's preview.tsx so components render
// with the full token + typography + font setup.
import '@leta-io/design-tokens/css';
import '@leta-io/design-tokens/text-styles.css';
import '@leta-io/design-tokens/scroll-utilities.css';
import '@leta-io/design-tokens/fonts';

import { App } from './App.js';

// Ensure the light theme attribute is set even if index.html is served stale.
document.documentElement.setAttribute('data-theme', 'light');

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Root element #root not found');

createRoot(rootEl).render(
  <React.StrictMode>
    <LetaThemeProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </LetaThemeProvider>
  </React.StrictMode>,
);

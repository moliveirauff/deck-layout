import { defineConfig, devices } from '@playwright/test'

/**
 * DeckLayout — Playwright E2E config.
 * Tests run against the live GitHub Pages deployment.
 * Set PLAYWRIGHT_BASE_URL to override (e.g. local preview server).
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,       // sequential — tests share state via Supabase
  retries: 1,                 // retry once on flake
  timeout: 60_000,            // 60s per test (AI chat can be slow)
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],

  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'https://moliveirauff.github.io/deck-layout',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    headless: true,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})

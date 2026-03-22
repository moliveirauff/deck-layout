import { type Page, expect } from '@playwright/test'

/** Base URL — from env or default GitHub Pages. */
export const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'https://moliveirauff.github.io/deck-layout'

/**
 * Navigate to a hash route and wait for network to settle.
 */
export async function goto(page: Page, hash: string) {
  await page.goto(`${BASE_URL}/#${hash}`)
  // networkidle can hang on pages with multiple concurrent Supabase calls;
  // fall back gracefully after 15s so the test can still assert the UI state.
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {
    // page did not reach networkidle within 15s — continue anyway
  })
}

/**
 * Assert no ErrorBoundary is visible (no "Something went wrong" text).
 */
export async function expectNoErrorBoundary(page: Page) {
  // Wait up to 15s for the page to settle, then assert no error boundary
  await page.waitForTimeout(500)
  await expect(page.getByText('Something went wrong')).not.toBeVisible({ timeout: 8_000 })
}

/**
 * Assert no blank/white full-page overlay (indicates React crash).
 */
export async function expectPageLoaded(page: Page, keyword: string) {
  await expect(page.getByText(keyword)).toBeVisible({ timeout: 15_000 })
}

/**
 * Get the first project ID from the projects list page.
 * Returns null if no projects exist.
 */
export async function getFirstProjectId(page: Page): Promise<string | null> {
  // If explicitly provided via env, use it directly (fastest)
  if (process.env.TEST_PROJECT_ID) return process.env.TEST_PROJECT_ID

  await goto(page, '/projects')
  // Wait for Supabase data to load
  await page.waitForTimeout(3000)

  // HashRouter renders links as href="#/projects/UUID"
  const allLinks = await page.locator('a').all()
  for (const link of allLinks) {
    const href = await link.getAttribute('href').catch(() => null)
    if (!href) continue
    // Match UUID pattern after /projects/
    const match = href.match(/\/projects\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/)
    if (match?.[1]) return match[1]
  }
  return null
}

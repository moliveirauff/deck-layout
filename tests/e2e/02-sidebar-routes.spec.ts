import { test, expect } from '@playwright/test'
import { goto, expectNoErrorBoundary } from './helpers'

/**
 * FLUXO 3 — Todos os 11 links do sidebar devem carregar sem ErrorBoundary.
 * Set TEST_PROJECT_ID env var to the project UUID.
 */
const PROJECT_ID = process.env.TEST_PROJECT_ID ?? ''

const SIDEBAR_ROUTES = [
  { path: '', label: 'Overview' },
  { path: '/deck', label: 'Deck Layout' },
  { path: '/rigging', label: 'Rigging' },
  { path: '/seafastening', label: 'Sea-Fastening' },
  { path: '/stability', label: 'Stability' },
  { path: '/rao', label: 'RAO' },
  { path: '/analysis', label: 'Analysis' },
  { path: '/lowering', label: 'Lowering' },
  { path: '/weather', label: 'Weather Window' },
  { path: '/3d', label: '3D View' },
  { path: '/report', label: 'Report' },
]

test.describe('Sidebar routes', () => {
  for (const { path, label } of SIDEBAR_ROUTES) {
    test(`${label} page loads without error`, async ({ page }) => {
      if (!PROJECT_ID) {
        console.log('Skipping — set TEST_PROJECT_ID env var')
        return
      }
      await goto(page, `/projects/${PROJECT_ID}${path}`)
      await expectNoErrorBoundary(page)
      await expect(page.locator('nav, aside').first()).toBeVisible({ timeout: 10_000 })
    })
  }
})

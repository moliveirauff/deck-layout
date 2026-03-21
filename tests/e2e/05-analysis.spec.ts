import { test, expect } from '@playwright/test'
import { goto, expectNoErrorBoundary } from './helpers'

const PROJECT_ID = process.env.TEST_PROJECT_ID ?? ''

test.describe('Analysis Page', () => {
  test('analysis page loads without error', async ({ page }) => {
    if (!PROJECT_ID) { console.log('Skipping — set TEST_PROJECT_ID'); return }
    await goto(page, `/projects/${PROJECT_ID}/analysis`)
    await expectNoErrorBoundary(page)
    await expect(page.getByText('Analysis').first()).toBeVisible({ timeout: 10_000 })
  })

  test('sea state grid section is visible', async ({ page }) => {
    if (!PROJECT_ID) { console.log('Skipping — set TEST_PROJECT_ID'); return }
    await goto(page, `/projects/${PROJECT_ID}/analysis`)
    await expectNoErrorBoundary(page)
    await expect(page.getByText('Sea State').first()).toBeVisible({ timeout: 10_000 })
  })

  test('run analysis or run all equipment button is present', async ({ page }) => {
    if (!PROJECT_ID) { console.log('Skipping — set TEST_PROJECT_ID'); return }
    await goto(page, `/projects/${PROJECT_ID}/analysis`)
    await expectNoErrorBoundary(page)
    // Button text is either "Run Analysis" (per-item) or "Run All Equipment"
    const runBtn = page.getByRole('button', { name: /run analysis|run all equipment/i }).first()
    await expect(runBtn).toBeVisible({ timeout: 10_000 })
  })
})

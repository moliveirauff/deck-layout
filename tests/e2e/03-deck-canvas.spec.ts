import { test, expect } from '@playwright/test'
import { goto, expectNoErrorBoundary } from './helpers'

const PROJECT_ID = process.env.TEST_PROJECT_ID ?? ''

test.describe('Deck Layout Canvas', () => {
  test('deck canvas renders with positive dimensions', async ({ page }) => {
    if (!PROJECT_ID) { console.log('Skipping — set TEST_PROJECT_ID'); return }
    await goto(page, `/projects/${PROJECT_ID}/deck`)
    await expectNoErrorBoundary(page)
    const canvas = page.locator('canvas').first()
    await expect(canvas).toBeVisible({ timeout: 15_000 })
    const box = await canvas.boundingBox()
    expect(box).toBeTruthy()
    expect(box!.width).toBeGreaterThan(0)
    expect(box!.height).toBeGreaterThan(0)
  })

  test('vessel crane panel appears', async ({ page }) => {
    if (!PROJECT_ID) { console.log('Skipping — set TEST_PROJECT_ID'); return }
    await goto(page, `/projects/${PROJECT_ID}/deck`)
    await expectNoErrorBoundary(page)
    await expect(page.getByText('Crane').first()).toBeVisible({ timeout: 10_000 })
  })
})

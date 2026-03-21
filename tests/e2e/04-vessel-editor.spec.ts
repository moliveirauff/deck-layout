import { test, expect } from '@playwright/test'
import { goto, expectNoErrorBoundary } from './helpers'

/**
 * FLUXO 7 — Vessel Editor: editar posição do guindaste não pode resultar em tela preta.
 * Verifica que ao digitar no campo Pedestal X, o canvas de preview não trava.
 */
test.describe('Vessel Editor', () => {
  test('vessel list loads without error', async ({ page }) => {
    await goto(page, '/vessels')
    await expectNoErrorBoundary(page)
    // Use heading role to avoid strict mode violation (multiple elements with text 'Vessels')
    await expect(page.getByRole('heading', { name: /Vessel/i }).or(
      page.getByRole('link', { name: 'Vessels', exact: true })
    ).first()).toBeVisible({ timeout: 10_000 })
  })

  test('new vessel page loads', async ({ page }) => {
    await goto(page, '/vessels/new')
    await expectNoErrorBoundary(page)
    await expect(page.getByText('New Vessel')).toBeVisible({ timeout: 10_000 })
  })

  test('editing crane pedestal X does not cause black screen', async ({ page }) => {
    // Navigate to vessels list and click the first vessel
    await goto(page, '/vessels')
    const firstVesselLink = page.locator('a[href*="/vessels/"]').first()
    const exists = await firstVesselLink.isVisible().catch(() => false)
    if (!exists) {
      test.skip() // No vessels yet
      return
    }
    await firstVesselLink.click()
    await page.waitForLoadState('networkidle')
    await expectNoErrorBoundary(page)

    // Navigate to Crane tab
    const craneTab = page.getByRole('tab', { name: 'Crane' })
    await craneTab.click()

    // Edit Pedestal X field — clear and type a new value
    const pedestalXInput = page.getByLabel('Pedestal X (m)').or(
      page.locator('input[placeholder="e.g. 10"]').first()
    )
    if (await pedestalXInput.isVisible().catch(() => false)) {
      await pedestalXInput.clear()
      await pedestalXInput.fill('75')
      await page.keyboard.press('Tab')
      await page.waitForTimeout(500)
    }

    // The canvas preview should NOT show an error boundary
    await expectNoErrorBoundary(page)

    // The deck preview canvas should still be visible and have dimensions
    const canvas = page.locator('canvas').first()
    if (await canvas.isVisible().catch(() => false)) {
      const box = await canvas.boundingBox()
      expect(box?.width ?? 0).toBeGreaterThan(0)
      expect(box?.height ?? 0).toBeGreaterThan(0)
    }
  })
})

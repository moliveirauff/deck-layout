import { test, expect } from '@playwright/test'
import { goto, expectNoErrorBoundary } from './helpers'

const PROJECT_ID = process.env.TEST_PROJECT_ID ?? ''

test.describe('Report Page', () => {
  test('report page loads without error', async ({ page }) => {
    if (!PROJECT_ID) { console.log('Skipping — set TEST_PROJECT_ID'); return }
    await goto(page, `/projects/${PROJECT_ID}/report`)
    await expectNoErrorBoundary(page)
    await expect(page.getByText('Report').first()).toBeVisible({ timeout: 15_000 })
  })

  test('generate report button is present', async ({ page }) => {
    if (!PROJECT_ID) { console.log('Skipping — set TEST_PROJECT_ID'); return }
    await goto(page, `/projects/${PROJECT_ID}/report`)
    await expectNoErrorBoundary(page)
    const generateBtn = page.getByRole('button', { name: /generate/i })
    await expect(generateBtn).toBeVisible({ timeout: 15_000 })
  })

  test('generate report does not crash', async ({ page }) => {
    test.setTimeout(90_000)
    if (!PROJECT_ID) { console.log('Skipping — set TEST_PROJECT_ID'); return }
    await goto(page, `/projects/${PROJECT_ID}/report`)
    await expectNoErrorBoundary(page)
    const generateBtn = page.getByRole('button', { name: /generate/i })
    const isDisabled = await generateBtn.isDisabled().catch(() => true)
    if (isDisabled) return
    const errors: string[] = []
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text())
    })
    await generateBtn.click()
    await page.waitForTimeout(15_000)
    await expectNoErrorBoundary(page)
    const criticalErrors = errors.filter(e =>
      e.includes('Cannot read') || e.includes('undefined is not') || e.includes('null is not')
    )
    expect(criticalErrors).toHaveLength(0)
  })
})

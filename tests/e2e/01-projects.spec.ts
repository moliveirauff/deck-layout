import { test, expect } from '@playwright/test'
import { goto, expectNoErrorBoundary, expectPageLoaded } from './helpers'

/**
 * FLUXO 1 — Projects list page
 * Verifica que a página de projetos carrega e exibe projetos ou o botão de demo data.
 */
test.describe('Projects List', () => {
  test('loads without error boundary', async ({ page }) => {
    await goto(page, '/projects')
    await expectNoErrorBoundary(page)
  })

  test('shows project list or "Load Demo Data" button', async ({ page }) => {
    await goto(page, '/projects')
    await expectNoErrorBoundary(page)
    // Accept any of: project cards, project links, or the Load Demo Data button
    const hasProjects = await page.locator('[href*="/projects/"], h2, h3').filter({ hasText: /Campaign|Project|Búzios/i }).first().isVisible().catch(() => false)
    const hasDemoBtn = await page.getByText('Load Demo Data').isVisible().catch(() => false)
    const hasHeading = await page.getByText('Projects').first().isVisible().catch(() => false)
    expect(hasProjects || hasDemoBtn || hasHeading, 'Projects page should have content').toBe(true)
  })

  test('navigates to new project page', async ({ page }) => {
    await goto(page, '/projects/new')
    await expectNoErrorBoundary(page)
    await expectPageLoaded(page, 'New Project')
  })
})

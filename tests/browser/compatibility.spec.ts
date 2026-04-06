import { test, expect } from '@playwright/test'

test('landing page renders on supported browser', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('body')).toContainText(/EWTCS|Login|Emergency Ward/i)
})

test('unsupported browser warning is shown for legacy user agent', async ({ browser }) => {
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 Firefox/88.0',
  })
  const page = await context.newPage()

  await page.goto('/')
  await expect(page.getByTestId('browser-compatibility-banner')).toBeVisible()

  await context.close()
})

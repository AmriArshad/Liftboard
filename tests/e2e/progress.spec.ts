import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Try the demo' }).click()
  await page.getByRole('link', { name: 'Progress' }).click()
})

test('lists stalled lifts and links to them', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Stalled' })).toBeVisible()
  // The demo's overhead press stops progressing partway through.
  await page.getByRole('link', { name: 'Overhead Press (Barbell)' }).first().click()
  await expect(page.getByRole('heading', { name: 'Overhead Press (Barbell)' })).toBeVisible()
})

test('keeps the page within the screen width', async ({ page }) => {
  const width = await page.evaluate(() => document.documentElement.scrollWidth)
  expect(width).toBeLessThanOrEqual(page.viewportSize()!.width)
})

test('shows the latest records, then all of them', async ({ page }) => {
  const rows = page.getByRole('row')
  await expect(rows).toHaveCount(20)

  await page.getByRole('button', { name: /^Show all \d+$/ }).click()
  expect(await rows.count()).toBeGreaterThan(20)
})

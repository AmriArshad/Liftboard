import { expect, test } from '@playwright/test'

test('keeps the data across reloads until it is cleared', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Try the demo' }).click()
  const total = page.getByRole('heading', { level: 1, name: '62 workouts' })
  await expect(total).toBeVisible()

  await page.reload()
  await expect(total).toBeVisible()

  await page.getByRole('button', { name: 'Clear my data' }).click()
  await expect(page.getByRole('button', { name: 'Try the demo' })).toBeVisible()

  await page.reload()
  await expect(page.getByRole('button', { name: 'Try the demo' })).toBeVisible()
})

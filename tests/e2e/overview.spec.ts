import { expect, test } from '@playwright/test'

test('shows the overview for the demo', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Try the demo' }).click()

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('62 workouts')
  for (const name of ['Workouts per week', 'Weekly volume', 'Weekly sets']) {
    await expect(page.getByRole('heading', { name })).toBeVisible()
  }

  // Each chart renders an SVG inside its labelled container.
  await expect(
    page.getByRole('img', { name: '62 workouts over 22 weeks' }).locator('svg'),
  ).toBeVisible()
  await expect(page.getByRole('img', { name: 'Weekly volume in kg' }).locator('svg')).toBeVisible()
  await expect(page.getByRole('img', { name: 'Weekly working sets' }).locator('svg')).toBeVisible()
})

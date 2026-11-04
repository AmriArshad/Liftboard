import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Try the demo' }).click()
})

test('shows the all-time total and the last 12 weeks by default', async ({ page }) => {
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('62 workouts')
  await expect(page.getByRole('radio', { name: '12 weeks' })).toBeChecked()

  for (const name of ['Training days', 'Lifts', 'Weekly volume', 'Split', 'Weekdays']) {
    await expect(page.getByRole('heading', { name })).toBeVisible()
  }
  await expect(
    // 12 weeks back from the last workout starts mid-week, so 13 calendar weeks show.
    page.getByRole('img', { name: /workouts over 1[23] weeks/ }).locator('svg'),
  ).toBeVisible()
  await expect(page.getByRole('img', { name: 'Weekly volume in kg' }).locator('svg')).toBeVisible()
})

test('compares the period with the one before it', async ({ page }) => {
  const stats = page.getByRole('region', { name: 'Totals for the period' })
  await expect(stats.getByText('Workouts per week')).toBeVisible()
  // The demo's weights climb, so volume is up on the previous 12 weeks.
  await expect(stats.getByText(/^\+\d+%$/).first()).toBeVisible()
})

test('flags the stalled lift and links lifts to the explorer', async ({ page }) => {
  const press = page.getByRole('listitem').filter({ hasText: 'Overhead Press (Barbell)' })
  await expect(press).toContainText('Stalled')

  await press.getByRole('link', { name: 'Overhead Press (Barbell)' }).click()
  await expect(page.getByRole('heading', { name: 'Overhead Press (Barbell)' })).toBeVisible()
})

test('switches period', async ({ page }) => {
  await page.getByText('All', { exact: true }).click()

  await expect(page.getByRole('img', { name: '62 workouts over 22 weeks' })).toBeVisible()
  // "All" has nothing before it to compare against.
  await expect(page.getByText(/vs previous/)).toHaveCount(0)
})

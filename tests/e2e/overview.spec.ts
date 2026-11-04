import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Try the demo' }).click()
})

test('shows the all-time total and the last 12 weeks by default', async ({ page }) => {
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('62 workouts')
  await expect(page.getByRole('radio', { name: '12 weeks' })).toBeChecked()

  for (const name of [
    'Consistency',
    'Volume',
    'Lifts',
    'This period',
    'Weekly volume by workout',
    'Weekdays',
    'Training days',
    'Recent records',
  ]) {
    await expect(page.getByRole('heading', { name, exact: true })).toBeVisible()
  }
  // Whole calendar weeks, so "12 weeks" is exactly 12 columns.
  await expect(
    page.getByRole('img', { name: /workouts over 12 weeks/ }).locator('svg'),
  ).toBeVisible()
  await expect(
    page.getByRole('img', { name: 'Weekly volume in kg', exact: true }).locator('svg'),
  ).toBeVisible()
})

test('compares the period with the one before it', async ({ page }) => {
  const stats = page.getByRole('region', { name: 'Totals for the period' })
  await expect(stats.getByText('Workouts per week')).toBeVisible()
  // The demo's weights climb, so the period is up on the previous 12 weeks.
  await expect(stats).toContainText(/Up\s*\d+%/)
  await expect(page.getByText(/vs previous 12 weeks/).first()).toBeVisible()
})

test('explains what is working and flags the stalled lift', async ({ page }) => {
  await expect(page.getByText(/leading your progress/)).toBeVisible()

  const press = page.getByRole('listitem').filter({ hasText: 'Overhead Press' })
  await expect(press).toContainText('Stalled')

  await press.getByRole('link', { name: 'Overhead Press', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Overhead Press (Barbell)' })).toBeVisible()
})

test('switches period', async ({ page }) => {
  await page.getByText('All', { exact: true }).click()

  await expect(page.getByRole('radio', { name: 'All time' })).toBeChecked()
  await expect(page.getByRole('img', { name: '62 workouts over 22 weeks' })).toBeVisible()
  // "All" has nothing before it to compare against.
  await expect(page.getByText(/vs previous/)).toHaveCount(0)
})

import { expect, test, type Page } from '@playwright/test'

async function loadDemo(page: Page, path = '/') {
  await page.goto(path)
  await page.getByRole('button', { name: 'Try the demo' }).click()
}

test('finds an exercise and shows its history', async ({ page }) => {
  await loadDemo(page)
  await page.getByRole('link', { name: 'Exercises' }).click()

  await page.getByRole('searchbox', { name: 'Search exercises' }).fill('bench')
  await expect(page.getByRole('list', { name: 'Exercises' }).getByRole('listitem')).toHaveCount(1)
  await page.getByRole('link', { name: 'Bench Press (Barbell)' }).click()

  await expect(page).toHaveURL(/#\/exercises\/Bench%20Press%20\(Barbell\)$/)
  await expect(page.getByRole('heading', { name: 'Bench Press (Barbell)' })).toBeVisible()
  await expect(
    page.getByRole('img', { name: 'Bench Press (Barbell) over 21 sessions' }).locator('svg'),
  ).toBeVisible()
  await expect(page.getByText('Best e1RM')).toBeVisible()

  // The progressive demo never beats a later set at fewer reps, so one rep max is left.
  const [repMaxes, history] = [page.getByRole('table').first(), page.getByRole('table').last()]
  await expect(repMaxes.getByRole('columnheader')).toHaveText(['Reps', 'Weight', 'Date'])
  await expect(history.getByRole('columnheader')).toHaveText(['Date', 'Top set', 'e1RM', 'Sets'])
  // One row per session, plus the header.
  await expect(history.getByRole('row')).toHaveCount(22)
  // Every set of the latest session.
  await expect(history.getByRole('row').nth(1)).toContainText('95 × 6, 95 × 4, 95 × 4')

  // The date opens that workout.
  await history.getByRole('link').first().click()
  await expect(page).toHaveURL(/#\/workouts\/2026-10-28-\d{4}$/)
})

test('shows reps for bodyweight exercises', async ({ page }) => {
  await loadDemo(page)
  await page.getByRole('link', { name: 'Exercises' }).click()
  await page.getByRole('link', { name: 'Pull Up', exact: true }).click()

  await expect(page.getByRole('columnheader')).toHaveText(['Date', 'Best', 'Sets'])
})

test('switches between one and two columns as the window resizes', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 700 })
  await loadDemo(page, '/#/exercises')
  const detail = page.getByRole('heading', { level: 1 })

  // Wide: the most recent exercise is shown next to the list.
  await expect(detail).toBeVisible()

  // Narrow with nothing chosen: just the list.
  await page.setViewportSize({ width: 375, height: 700 })
  await expect(detail).toBeHidden()
  await expect(page.getByRole('list', { name: 'Exercises' })).toBeVisible()

  await page.setViewportSize({ width: 1024, height: 700 })
  await expect(detail).toBeVisible()
})

test('opens an exercise straight from its link', async ({ page }) => {
  await loadDemo(page, '/#/exercises/Walking')

  await expect(page.getByRole('heading', { name: 'Walking' })).toBeVisible()
  await expect(page.getByRole('columnheader')).toHaveText(['Date', 'Distance', 'Time'])
})

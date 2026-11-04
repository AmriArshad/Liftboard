import { expect, test, type Page } from '@playwright/test'

async function loadDemo(page: Page, path = '/') {
  await page.goto(path)
  await page.getByRole('button', { name: 'Try the demo' }).click()
}

test('lists every workout and shows one in full', async ({ page }) => {
  await loadDemo(page)
  await page.getByRole('link', { name: 'Workouts' }).click()

  const list = page.getByRole('navigation', { name: 'Workouts' })
  await expect(list.getByRole('link')).toHaveCount(62)
  await expect(list.getByRole('heading', { name: 'October 2026' })).toBeVisible()

  // A Push day: notes on the bench, and the dips and raises done as a superset.
  await page.getByRole('searchbox', { name: 'Search workouts' }).fill('push')
  await list.getByRole('link').first().click()
  await expect(page).toHaveURL(/#\/workouts\/2026-10-\d{2}-\d{4}$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Push' })).toBeVisible()
  await expect(page.getByText('Pause the first rep, elbows tucked.')).toBeVisible()
  await expect(page.getByText('Superset A')).toHaveCount(2)

  const bench = page.getByRole('table').first()
  // Phones hide the e1RM column, so check the ones every screen shows.
  await expect(bench.getByRole('columnheader')).toContainText(['Set', 'Lifted', 'RPE', 'Records'])
  // A warmup, two working sets and one to failure.
  await expect(bench.getByRole('row')).toHaveCount(5)
  await expect(bench.getByRole('cell', { name: 'W', exact: true })).toBeVisible()
})

test('opens a workout from a record date', async ({ page }) => {
  await loadDemo(page, '/#/progress')
  const row = page.getByRole('row').first()
  const exercise = await row.getByRole('link').nth(1).textContent()
  await row.getByRole('link').first().click()

  await expect(page).toHaveURL(/#\/workouts\//)
  await expect(page.getByRole('link', { name: exercise!, exact: true }).last()).toBeVisible()
})

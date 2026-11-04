import { expect, test } from '@playwright/test'

test('switches between kg and lb and remembers the choice', async ({ page }) => {
  await page.goto('/#/exercises/Squat%20(Barbell)')
  await page.getByRole('button', { name: 'Try the demo' }).click()

  // The demo export is in kg, so that's the starting unit.
  // The latest session's top set, in the session list below the rep maxes.
  const topSet = page.getByRole('list', { name: 'Sessions' }).getByRole('listitem').first()
  await expect(topSet).toContainText(' kg × ')
  await expect(page.getByRole('radio', { name: 'kg' })).toBeChecked()

  await page.getByText('lb', { exact: true }).click()
  await expect(topSet).toContainText(' lb × ')

  await page.reload()
  await expect(page.getByRole('radio', { name: 'lb' })).toBeChecked()
  await expect(topSet).toContainText(' lb × ')
})

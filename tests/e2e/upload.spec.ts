import { expect, test } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const fixture = (name: string) => fileURLToPath(new URL(`../fixtures/${name}`, import.meta.url))

test.beforeEach(async ({ page }) => {
  await page.goto('/')
})

test('loads the demo', async ({ page }) => {
  await page.getByRole('button', { name: 'Try the demo' }).click()
  await expect(page.getByRole('heading', { level: 1, name: '62 workouts' })).toBeVisible()
})

test('loads a chosen file', async ({ page }) => {
  await page.locator('input[type=file]').setInputFiles(fixture('kg-export.csv'))
  await expect(page.getByRole('heading', { level: 1, name: '2 workouts' })).toBeVisible()
})

test('loads a file dropped anywhere on the page', async ({ page }) => {
  const csv = readFileSync(fixture('lb-export.csv'), 'utf8')
  const dataTransfer = await page.evaluateHandle((text) => {
    const transfer = new DataTransfer()
    transfer.items.add(new File([text], 'workouts.csv', { type: 'text/csv' }))
    return transfer
  }, csv)

  await page.dispatchEvent('main', 'dragover', { dataTransfer })
  await page.dispatchEvent('main', 'drop', { dataTransfer })
  await expect(page.getByRole('heading', { level: 1, name: '1 workout' })).toBeVisible()
})

test('rejects a file that is not a Hevy export', async ({ page }) => {
  await page.locator('input[type=file]').setInputFiles(fixture('invalid.csv'))
  await expect(page.getByRole('alert')).toHaveText("This doesn't look like a Hevy workout export.")
})

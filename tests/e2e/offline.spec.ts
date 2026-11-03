import { expect, test } from '@playwright/test'

test('works offline once it has loaded', async ({ page, context }) => {
  await page.goto('/')
  // Wait for the service worker to install and take control of the page.
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready
  })
  await page.reload()
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true)

  await context.setOffline(true)
  await page.reload()

  // The app shell, the dashboard chunk and the demo CSV all come from the cache.
  await page.getByRole('button', { name: 'Try the demo' }).click()
  await expect(page.getByRole('heading', { level: 1, name: '62 workouts' })).toBeVisible()
  await page.getByRole('link', { name: 'Exercises' }).click()
  await expect(page.getByRole('searchbox', { name: 'Search exercises' })).toBeVisible()
})

test('is installable', async ({ page }) => {
  await page.goto('/')
  const manifest = await page.evaluate(async () => {
    const link = document.querySelector<HTMLLinkElement>('link[rel="manifest"]')
    return link ? (await fetch(link.href)).json() : null
  })

  expect(manifest).toMatchObject({ name: 'liftboard', display: 'standalone', start_url: '/' })
  expect(manifest.icons.map((icon: { sizes: string }) => icon.sizes)).toContain('512x512')
})

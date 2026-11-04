import { expect, test } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

// `vite preview` doesn't apply Cloudflare's public/_headers, so read the policy from that file
// and add it to every page here. Anything the live site's CSP would block then fails CI.
const headersFile = readFileSync(
  fileURLToPath(new URL('../../public/_headers', import.meta.url)),
  'utf8',
)
const csp = headersFile.match(/^\s+Content-Security-Policy:\s*(.+)$/m)?.[1]

test.beforeEach(async ({ page }) => {
  expect(csp, 'public/_headers should set a Content-Security-Policy').toBeTruthy()
  await page.route('**/*', async (route) => {
    const response = await route.fetch()
    const isDocument = route.request().resourceType() === 'document'
    await route.fulfill({
      response,
      headers: isDocument
        ? { ...response.headers(), 'content-security-policy': csp! }
        : response.headers(),
    })
  })
})

test('every screen works under the Content-Security-Policy', async ({ page }) => {
  await page.goto('/')
  // Proof the policy is really in force here: an inline script must be refused.
  // (page.evaluate itself runs through DevTools, which CSP doesn't restrict.)
  const inlineScriptBlocked = await page.evaluate(
    () =>
      new Promise<boolean>((resolve) => {
        document.addEventListener('securitypolicyviolation', () => resolve(true), { once: true })
        const script = document.createElement('script')
        script.textContent = 'window.__inlineRan = true'
        document.head.append(script)
        setTimeout(() => resolve(!('__inlineRan' in window)), 500)
      }),
  )
  expect(inlineScriptBlocked).toBe(true)

  // From here on, anything the policy refuses is a bug in the app.
  const violations: string[] = []
  page.on('console', (message) => {
    if (/Content Security Policy|Refused to/i.test(message.text())) violations.push(message.text())
  })

  await page.getByRole('button', { name: 'Try the demo' }).click()
  await expect(page.getByRole('heading', { level: 1, name: '62 workouts' })).toBeVisible()
  await expect(page.getByRole('img', { name: /workouts over/ }).locator('svg')).toBeVisible()

  await page.getByRole('navigation').getByRole('link', { name: 'Exercises' }).click()
  await page
    .getByRole('list', { name: 'Exercises' })
    .getByRole('link', { name: 'Bench Press (Barbell)' })
    .click()
  await expect(page.getByRole('img', { name: /Bench Press/ }).locator('svg')).toBeVisible()

  await page.getByRole('link', { name: 'Progress' }).click()
  await expect(page.getByRole('heading', { name: 'Stalled' })).toBeVisible()

  expect(violations).toEqual([])
})

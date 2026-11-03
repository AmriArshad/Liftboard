// Renders the PNG app icons in public/icons/ from the brand mark. Run with
// `npm run generate:icons` after changing public/brand/; the PNGs are committed.
// Playwright's Chromium does the rasterising, so there's no image library to install.

import { chromium } from '@playwright/test'
import { mkdirSync, readFileSync } from 'node:fs'

const BACKGROUND = '#0E0F12'
const ACCENT = '#D4FF3F'

// The rising-line mark from public/brand/mark.svg, coloured in.
const mark = readFileSync('public/brand/mark.svg', 'utf8').replaceAll('currentColor', ACCENT)

// "any" icons are the rounded square from icon.svg. "maskable" icons fill the whole canvas,
// because Android crops them to its own shape, and keep the mark inside the central 80% safe zone.
const icons = [
  { file: 'icon-192.png', size: 192, maskable: false },
  { file: 'icon-512.png', size: 512, maskable: false },
  { file: 'apple-touch-icon.png', size: 180, maskable: true },
  { file: 'maskable-512.png', size: 512, maskable: true },
]

mkdirSync('public/icons', { recursive: true })
const browser = await chromium.launch()
const page = await browser.newPage()

for (const { file, size, maskable } of icons) {
  const art = maskable
    ? `<div style="width:${size}px;height:${size}px;background:${BACKGROUND};display:grid;place-items:center">
         <div style="width:${size * 0.7}px;height:${size * 0.7}px">${mark}</div>
       </div>`
    : `<div style="width:${size}px;height:${size}px">${readFileSync('public/brand/icon.svg', 'utf8')}</div>`

  await page.setViewportSize({ width: size, height: size })
  await page.setContent(
    `<style>html,body{margin:0;background:transparent}svg{width:100%;height:100%;display:block}</style>${art}`,
  )
  await page.screenshot({ path: `public/icons/${file}`, omitBackground: !maskable })
  console.log(`public/icons/${file}`)
}

await browser.close()

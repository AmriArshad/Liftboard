// Runs the parser off the main thread so a large export doesn't freeze the page.
// Started by ./load.ts; the file never leaves the browser.

import { HevyParseError, parseHevyCsv } from './hevy'
import type { ParseResult } from './load'

self.onmessage = async (event: MessageEvent<Blob>) => {
  let result: ParseResult
  try {
    result = { ok: true, dataset: parseHevyCsv(await event.data.text()) }
  } catch (error) {
    const message = error instanceof HevyParseError ? error.message : "Couldn't read this file."
    result = { ok: false, message }
  }
  self.postMessage(result)
}

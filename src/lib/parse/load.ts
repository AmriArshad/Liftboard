import type { Dataset } from './types'
// Vite's ?worker suffix bundles the file as a Web Worker and imports its constructor.
import ParseWorker from './worker?worker'

export type ParseResult = { ok: true; dataset: Dataset } | { ok: false; message: string }

/**
 * Parses a Hevy export in a Web Worker. Rejects with an Error whose message can be shown as is.
 * Papa Parse's own `worker: true` doesn't survive bundling, so this uses a worker of our own.
 */
export function parseFile(file: Blob): Promise<Dataset> {
  return new Promise((resolve, reject) => {
    const worker = new ParseWorker()

    worker.onmessage = (event: MessageEvent<ParseResult>) => {
      worker.terminate()
      if (event.data.ok) resolve(event.data.dataset)
      else reject(new Error(event.data.message))
    }
    worker.onerror = () => {
      worker.terminate()
      reject(new Error("Couldn't read this file."))
    }

    worker.postMessage(file)
  })
}

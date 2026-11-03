// Keeps the parsed dataset in IndexedDB, in this browser only, so a reload doesn't mean
// re-uploading the CSV. IndexedDB stores Dates and nested objects as they are (structured
// clone), so no serialising is needed.

import { del, get, set } from 'idb-keyval'
import type { Dataset } from './parse/types'

const KEY = 'dataset'

// Bump when the Dataset shape changes; older saves are then ignored and the user re-uploads.
const VERSION = 1

interface Saved {
  version: number
  dataset: Dataset
}

/** The saved dataset, or null if there isn't one, it's from an older version, or storage is unavailable. */
export async function loadDataset(): Promise<Dataset | null> {
  try {
    const saved = await get<Saved>(KEY)
    return saved?.version === VERSION ? saved.dataset : null
  } catch {
    return null
  }
}

// Failing to save (private browsing, storage full) only costs the user a re-upload next time,
// so these never throw.

export async function saveDataset(dataset: Dataset): Promise<void> {
  try {
    await set(KEY, { version: VERSION, dataset } satisfies Saved)
  } catch {
    // Nothing to do: the app keeps working from memory.
  }
}

export async function clearDataset(): Promise<void> {
  try {
    await del(KEY)
  } catch {
    // Nothing saved, or storage unavailable: either way there's nothing left to clear.
  }
}

// The loaded dataset, shared by every view, and kept in IndexedDB between visits.
// Runes like $state work in .svelte.ts modules too, which is how Svelte 5 shares state between
// components: no store library, no actions or reducers. Read `dataset.current` in a component
// and it re-renders when the value is replaced.

import { clearDataset, loadDataset, saveDataset } from '../persist'
import type { Dataset } from '../parse/types'

// $state.raw skips the deep proxy $state would wrap around thousands of sets. Nothing mutates
// the dataset in place; it's only ever replaced as a whole.
let current = $state.raw<Dataset | null>(null)
// True until the saved dataset (if any) has been read, so the upload screen doesn't flash up
// for returning visitors.
let restoring = $state(true)

loadDataset().then((saved) => {
  // A file loaded while IndexedDB was still being read wins.
  current ??= saved
  restoring = false
})

export const dataset = {
  get current() {
    return current
  },
  get restoring() {
    return restoring
  },
  load(value: Dataset) {
    current = value
    saveDataset(value)
  },
  clear() {
    current = null
    clearDataset()
  },
}

// The loaded dataset, shared by every view.
// Runes like $state work in .svelte.ts modules too, which is how Svelte 5 shares state between
// components: no store library, no actions or reducers. Read `dataset.current` in a component
// and it re-renders when the value is replaced.

import type { Dataset } from '../parse/types'

// $state.raw skips the deep proxy $state would wrap around thousands of sets. Nothing mutates
// the dataset in place; it's only ever replaced as a whole.
let current = $state.raw<Dataset | null>(null)

export const dataset = {
  get current() {
    return current
  },
  set(value: Dataset | null) {
    current = value
  },
}

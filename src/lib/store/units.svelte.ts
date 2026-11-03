// The unit weights are shown in. Null until the user picks one, which means "whatever the
// export used". Kept in localStorage: it's a small per-browser preference, not workout data.

import type { Unit } from '../parse/types'

const KEY = 'liftboard:unit'

function read(): Unit | null {
  try {
    const saved = localStorage.getItem(KEY)
    return saved === 'kg' || saved === 'lb' ? saved : null
  } catch {
    // Storage blocked (some private modes): fall back to the export's unit.
    return null
  }
}

let preferred = $state<Unit | null>(read())

export const unitPreference = {
  get current() {
    return preferred
  },
  set(value: Unit) {
    preferred = value
    try {
      localStorage.setItem(KEY, value)
    } catch {
      // Still applies for this visit; it just won't be remembered.
    }
  },
}

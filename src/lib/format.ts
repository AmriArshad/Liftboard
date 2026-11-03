// Display formatting. `undefined` as the locale means "the browser's", so dates and numbers
// look the way the user expects.

const date = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
const month = new Intl.DateTimeFormat(undefined, { month: 'short' })
const integer = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 })
const compact = new Intl.NumberFormat(undefined, { notation: 'compact' })

export const formatDate = (value: Date) => date.format(value)
export const formatDateRange = (from: Date, to: Date) => date.formatRange(from, to)
export const formatInteger = (value: number) => integer.format(value)
export const formatCompact = (value: number) => compact.format(value)

/** Axis labels for a run of weeks: the month name where a new month starts, blank elsewhere. */
export function monthLabels(weekStarts: Date[]): string[] {
  return weekStarts.map((start, i) => {
    const previous = weekStarts[i - 1]
    return !previous || previous.getMonth() !== start.getMonth() ? month.format(start) : ''
  })
}

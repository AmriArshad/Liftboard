import type { Unit } from './parse/types'

// Display formatting. `undefined` as the locale means "the browser's", so dates and numbers
// look the way the user expects.

const date = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
const month = new Intl.DateTimeFormat(undefined, { month: 'short' })
const year = new Intl.DateTimeFormat(undefined, { year: 'numeric' })
const monthDay = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' })
const integer = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 })
const compact = new Intl.NumberFormat(undefined, { notation: 'compact' })
const decimal = new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 })
// Lifted weights are shown as lifted: kg plate maths gives values like 46.25. Converted to lb
// those become 101.96, so lb gets one decimal, which still shows the 2.5 lb plates.
const weightKg = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 })
const weightLb = new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 })

export const formatDate = (value: Date) => date.format(value)
export const formatDateRange = (from: Date, to: Date) => date.formatRange(from, to)
export const formatInteger = (value: number) => integer.format(value)
export const formatCompact = (value: number) => compact.format(value)
export const formatDecimal = (value: number) => decimal.format(value)
export const formatWeight = (value: number, unit: Unit) =>
  (unit === 'lb' ? weightLb : weightKg).format(value)

/** 1500 → "25:00", 3725 → "1:02:05". */
export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.round(seconds % 60)
  const pad = (n: number) => String(n).padStart(2, '0')
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`
}

/** A time-axis tick: the year on 1 January, the month on the 1st, otherwise "Oct 17". */
export function formatTick(time: number): string {
  const d = new Date(time)
  if (d.getDate() !== 1) return monthDay.format(d)
  return d.getMonth() === 0 ? year.format(d) : month.format(d)
}

/** Axis labels for a run of weeks: the month name where a new month starts, blank elsewhere. */
export function monthLabels(weekStarts: Date[]): string[] {
  return weekStarts.map((start, i) => {
    const previous = weekStarts[i - 1]
    return !previous || previous.getMonth() !== start.getMonth() ? month.format(start) : ''
  })
}

import { describe, expect, it } from 'vitest'
import { formatTick, formatWeight } from '../../src/lib/format'

describe('formatWeight', () => {
  it('keeps kg plate maths to two decimals', () => {
    expect(formatWeight(46.25, 'kg')).toBe((46.25).toLocaleString())
  })

  it('rounds lb to one decimal', () => {
    expect(formatWeight(187.3914, 'lb')).toBe((187.4).toLocaleString())
  })
})

describe('formatTick', () => {
  it('labels the start of a month with its name and mid-month with the full date', () => {
    const month = new Intl.DateTimeFormat(undefined, { month: 'short' })
    const monthDay = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' })
    expect(formatTick(new Date(2026, 6, 1).getTime())).toBe(month.format(new Date(2026, 6, 1)))
    expect(formatTick(new Date(2026, 6, 17).getTime())).toBe(monthDay.format(new Date(2026, 6, 17)))
    expect(formatTick(new Date(2027, 0, 1).getTime())).toBe('2027')
  })
})

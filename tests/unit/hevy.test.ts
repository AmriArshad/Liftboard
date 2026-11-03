import { describe, expect, it } from 'vitest'
import { HevyParseError, parseHevyCsv, parseHevyDate } from '../../src/lib/parse/hevy'
// Vite's ?raw suffix imports a file's text, so tests don't need Node's fs.
import invalidCsv from '../fixtures/invalid.csv?raw'
import kgCsv from '../fixtures/kg-export.csv?raw'
import lbCsv from '../fixtures/lb-export.csv?raw'

const HEADER =
  '"title","start_time","end_time","description","exercise_title","superset_id","exercise_notes","set_index","set_type","weight_kg","reps","distance_km","duration_seconds","rpe"'

describe('parseHevyDate', () => {
  it.each([
    ['2 Nov 2026, 17:26', new Date(2026, 10, 2, 17, 26)],
    ['02 November 2026, 17:26', new Date(2026, 10, 2, 17, 26)],
    ['Nov 2, 2026, 5:26 PM', new Date(2026, 10, 2, 17, 26)],
    ['Nov 2, 2026, 12:05 am', new Date(2026, 10, 2, 0, 5)],
    ['2 Sept 2026 at 08:00', new Date(2026, 8, 2, 8, 0)],
    ['2026-11-02 17:26', new Date(2026, 10, 2, 17, 26)],
    ['2026-11-02T17:26:45', new Date(2026, 10, 2, 17, 26, 45)],
    ['02/11/2026 17:26', new Date(2026, 10, 2, 17, 26)],
    ['11/25/2026 17:26', new Date(2026, 10, 25, 17, 26)],
    ['  2 Nov 2026, 17:26  ', new Date(2026, 10, 2, 17, 26)],
  ])('reads %j', (text, expected) => {
    expect(parseHevyDate(text)).toEqual(expected)
  })

  it.each(['', 'yesterday', '2 Nov 2026', '31 Feb 2026, 10:00', '2 Nov 2026, 25:00', '13:00 PM'])(
    'rejects %j',
    (text) => {
      expect(parseHevyDate(text)).toBeNull()
    },
  )
})

describe('parseHevyCsv', () => {
  it('groups sets into workouts, oldest first', () => {
    const { workouts, sourceUnit } = parseHevyCsv(kgCsv)

    expect(sourceUnit).toBe('kg')
    expect(workouts.map((w) => w.title)).toEqual(['Push Day 💪', 'Pull Day'])
    expect(workouts.map((w) => w.sets.length)).toEqual([5, 3])
  })

  it('keeps commas and emoji in text fields', () => {
    const push = parseHevyCsv(kgCsv).workouts[0]!

    expect(push.description).toBe('Felt strong, slept well 😴')
    expect(push.start).toEqual(new Date(2026, 10, 2, 17, 26))
    expect(push.end).toEqual(new Date(2026, 10, 2, 18, 31))
    expect(push.sets[0]?.notes).toBe('Pause, then press')
  })

  it('reads set types, numbers and supersets', () => {
    const sets = parseHevyCsv(kgCsv).workouts[0]!.sets

    expect(sets.map((s) => s.type)).toEqual(['warmup', 'normal', 'failure', 'normal', 'dropset'])
    expect(sets[2]).toMatchObject({ weightKg: 82.5, reps: 3, rpe: 10, index: 2, supersetId: null })
    expect(sets[3]?.supersetId).toBe(0)
  })

  it('treats empty cells as null, not 0', () => {
    const [pullUp, weighted, walk] = parseHevyCsv(kgCsv).workouts[1]!.sets

    // Bodyweight: no weight, tracked by reps.
    expect(pullUp).toMatchObject({ exercise: 'Pull Up', weightKg: null, reps: 10, rpe: null })
    // Weighted variant: a separate exercise whose weight is the added load.
    expect(weighted).toMatchObject({ exercise: 'Pull Up (Weighted)', weightKg: 10, reps: 6 })
    // Cardio: distance and duration instead of weight and reps.
    expect(walk).toMatchObject({
      weightKg: null,
      reps: null,
      distanceKm: 2.4,
      durationSeconds: 1500,
    })
  })

  it('converts an imperial export to kg and km', () => {
    const { workouts, sourceUnit } = parseHevyCsv(lbCsv)
    const [squat, ride] = workouts[0]!.sets

    expect(sourceUnit).toBe('lb')
    expect(squat?.weightKg).toBeCloseTo(102.058, 3)
    expect(ride?.distanceKm).toBeCloseTo(16.093, 3)
  })

  it('handles a byte-order mark, Windows line endings and comma decimals', () => {
    const row = '"A","2 Nov 2026, 17:26","","","Squat","","","0","normal","62,5","5","","",""'
    const BOM = String.fromCharCode(0xfeff)
    const { workouts } = parseHevyCsv(`${BOM}${HEADER}\r\n${row}\r\n\r\n`)

    expect(workouts[0]?.sets[0]?.weightKg).toBe(62.5)
  })

  it('counts unknown set types as normal', () => {
    const row = '"A","2 Nov 2026, 17:26","","","Squat","","","0","superset","60","5","","",""'

    expect(parseHevyCsv(`${HEADER}\n${row}`).workouts[0]?.sets[0]?.type).toBe('normal')
  })

  it.each([
    ['an empty file', '', 'This file is empty.'],
    ['a different CSV', invalidCsv, "This doesn't look like a Hevy workout export."],
    ['a header with no rows', HEADER, 'This export has no workouts in it.'],
    [
      'no weight column',
      HEADER.replace('"weight_kg"', '"weight_stone"'),
      "Couldn't find a weight column in this export.",
    ],
    [
      'an unreadable date',
      `${HEADER}\n"A","someday","","","Squat","","","0","normal","60","5","","",""`,
      'Row 1: can\'t read the date "someday".',
    ],
  ])('rejects %s with a clear message', (_, text, message) => {
    expect(() => parseHevyCsv(text)).toThrow(new HevyParseError(message))
  })
})

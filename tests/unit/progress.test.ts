import { describe, expect, it } from 'vitest'
import { personalRecords, stalledLifts } from '../../src/lib/metrics/progress'
import type { Dataset, Workout, WorkoutSet } from '../../src/lib/parse/types'

function set(exercise: string, weightKg: number | null, reps: number | null): WorkoutSet {
  return {
    exercise,
    index: 0,
    type: 'normal',
    weightKg,
    reps,
    distanceKm: null,
    durationSeconds: null,
    rpe: null,
    supersetId: null,
    notes: null,
  }
}

const day = (n: number) => new Date(2026, 8, 1 + n, 18, 0)
const workout = (n: number, sets: WorkoutSet[]): Workout => ({
  title: 'Workout',
  start: day(n),
  end: null,
  description: null,
  sets,
})
const dataset = (workouts: Workout[]): Dataset => ({ workouts, sourceUnit: 'kg' })

describe('personalRecords', () => {
  it('treats the first session as the baseline', () => {
    expect(personalRecords(dataset([workout(0, [set('Squat', 100, 5)])]))).toEqual([])
  })

  it('finds new best e1RM, weight and reps-at-weight, newest first', () => {
    const records = personalRecords(
      dataset([
        workout(0, [set('Squat', 100, 5)]),
        workout(2, [set('Squat', 100, 6)]), // more reps at 100 → e1RM and reps
        workout(4, [set('Squat', 105, 1)]), // heavier, but a lower e1RM
        workout(6, [set('Squat', 100, 4)]), // nothing new
      ]),
    )

    expect(records).toEqual([
      { date: day(4), exercise: 'Squat', kinds: ['weight'], weightKg: 105, reps: 1 },
      { date: day(2), exercise: 'Squat', kinds: ['e1rm', 'reps'], weightKg: 100, reps: 6 },
    ])
  })

  it('needs a weight to have been lifted before for a reps record', () => {
    const records = personalRecords(
      dataset([workout(0, [set('Squat', 100, 5)]), workout(2, [set('Squat', 90, 8)])]),
    )

    expect(records.flatMap((r) => r.kinds)).not.toContain('reps')
  })

  it('counts more reps as a record for bodyweight exercises', () => {
    const records = personalRecords(
      dataset([
        workout(0, [set('Pull Up', null, 8)]),
        workout(2, [set('Pull Up', null, 8)]),
        workout(4, [set('Pull Up', null, 9)]),
      ]),
    )

    expect(records).toEqual([
      { date: day(4), exercise: 'Pull Up', kinds: ['reps'], weightKg: null, reps: 9 },
    ])
  })

  it('ignores warmups', () => {
    const warmup: WorkoutSet = { ...set('Squat', 200, 1), type: 'warmup' }
    const records = personalRecords(
      dataset([workout(0, [set('Squat', 100, 5)]), workout(2, [warmup, set('Squat', 100, 5)])]),
    )

    expect(records).toEqual([])
  })
})

describe('stalledLifts', () => {
  // Bench reaches 85 kg in week 3, then repeats it. The 6-week window ending on day 63
  // starts on day 21 (inclusive), so days 21–63 are "recent" and day 14 is the earlier best.
  const bench = [
    ...[0, 7, 14].map((n, i) => workout(n, [set('Bench', 80 + i * 2.5, 5)])),
    ...[21, 28, 35, 42, 49, 56, 63].map((n) => workout(n, [set('Bench', 85, 5)])),
  ]

  it('finds a lift whose recent best hasn’t beaten its earlier best', () => {
    expect(stalledLifts(dataset(bench))).toEqual([
      { exercise: 'Bench', sessions: 7, bestE1rmKg: 85 * (1 + 5 / 30), since: day(14) },
    ])
  })

  it('ignores a lift that is still progressing', () => {
    const progressing = [...bench.slice(0, 9), workout(63, [set('Bench', 90, 5)])]
    expect(stalledLifts(dataset(progressing))).toEqual([])
  })

  it('needs enough recent sessions and an earlier best to compare against', () => {
    expect(stalledLifts(dataset(bench), { minSessions: 8 })).toEqual([])
    // A 12-week window swallows the whole history, leaving nothing before it.
    expect(stalledLifts(dataset(bench), { weeks: 12 })).toEqual([])
  })

  it('leaves out bodyweight exercises', () => {
    const pullUps = [0, 7, 14, 21, 28, 35, 42, 49, 56].map((n) =>
      workout(n, [set('Pull Up', null, 8)]),
    )
    expect(stalledLifts(dataset(pullUps))).toEqual([])
  })
})

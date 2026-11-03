import { describe, expect, it } from 'vitest'
import { overview, weekStart } from '../../src/lib/metrics/overview'
import type { Dataset, Workout, WorkoutSet } from '../../src/lib/parse/types'

function set(fields: Partial<WorkoutSet>): WorkoutSet {
  return {
    exercise: 'Squat (Barbell)',
    index: 0,
    type: 'normal',
    weightKg: null,
    reps: null,
    distanceKm: null,
    durationSeconds: null,
    rpe: null,
    supersetId: null,
    notes: null,
    ...fields,
  }
}

function workout(start: Date, sets: WorkoutSet[] = []): Workout {
  return { title: 'Workout', start, end: null, description: null, sets }
}

const dataset = (workouts: Workout[]): Dataset => ({ workouts, sourceUnit: 'kg' })

describe('weekStart', () => {
  it.each([
    ['a Monday', new Date(2026, 10, 2, 17, 26), new Date(2026, 10, 2)],
    ['a Sunday', new Date(2026, 10, 8, 23, 59), new Date(2026, 10, 2)],
    ['a week spanning months', new Date(2026, 9, 1, 9, 0), new Date(2026, 8, 28)],
  ])('finds Monday for %s', (_, date, monday) => {
    expect(weekStart(date)).toEqual(monday)
  })
})

describe('overview', () => {
  it('counts workouts and the date range', () => {
    const first = new Date(2026, 10, 2, 17, 0)
    const last = new Date(2026, 10, 20, 18, 0)
    const result = overview(
      dataset([workout(first), workout(new Date(2026, 10, 4)), workout(last)]),
    )

    expect(result).toMatchObject({ workouts: 3, first, last })
  })

  it('includes empty weeks between workouts', () => {
    const result = overview(
      dataset([workout(new Date(2026, 10, 2, 17, 0)), workout(new Date(2026, 10, 20, 18, 0))]),
    )

    expect(result.weeks.map((w) => w.start)).toEqual([
      new Date(2026, 10, 2),
      new Date(2026, 10, 9),
      new Date(2026, 10, 16),
    ])
    expect(result.weeks.map((w) => w.workouts)).toEqual([1, 0, 1])
  })

  it('counts workouts per weekday, Monday first', () => {
    const result = overview(
      dataset([
        workout(new Date(2026, 10, 2, 7, 0)), // Monday
        workout(new Date(2026, 10, 2, 18, 0)), // Monday again
        workout(new Date(2026, 10, 8, 10, 0)), // Sunday
      ]),
    )

    expect(result.weeks[0]?.days).toEqual([2, 0, 0, 0, 0, 0, 1])
  })

  it('counts working sets and volume, leaving out warmups and cardio', () => {
    const result = overview(
      dataset([
        workout(new Date(2026, 10, 2, 17, 0), [
          set({ type: 'warmup', weightKg: 40, reps: 10 }),
          set({ weightKg: 100, reps: 5 }),
          set({ type: 'failure', weightKg: 100, reps: 3 }),
          set({ exercise: 'Pull Up', reps: 10 }),
          set({ exercise: 'Walking', distanceKm: 2.4, durationSeconds: 1500 }),
        ]),
      ]),
    )

    expect(result.weeks[0]).toMatchObject({ sets: 3, volumeKg: 800 })
  })

  it('keeps weeks on Monday midnight across a daylight-saving change', () => {
    // Weeks either side of late-October/early-November clock changes in most time zones.
    const result = overview(
      dataset([workout(new Date(2026, 9, 19, 12, 0)), workout(new Date(2026, 10, 9, 12, 0))]),
    )

    for (const week of result.weeks) {
      expect([week.start.getDay(), week.start.getHours()]).toEqual([1, 0])
    }
    expect(result.weeks.map((w) => w.workouts)).toEqual([1, 0, 0, 1])
  })
})

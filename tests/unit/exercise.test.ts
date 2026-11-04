import { describe, expect, it } from 'vitest'
import { e1rm, exercises, repRecords, sessions } from '../../src/lib/metrics/exercise'
import type { Dataset, Workout, WorkoutSet } from '../../src/lib/parse/types'

function set(exercise: string, fields: Partial<WorkoutSet> = {}): WorkoutSet {
  return {
    exercise,
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

function workout(start: Date, sets: WorkoutSet[], title = 'Workout'): Workout {
  return { title, start, end: null, description: null, sets }
}

const dataset = (workouts: Workout[]): Dataset => ({ workouts, sourceUnit: 'kg' })

describe('e1rm', () => {
  it('uses the Epley formula', () => {
    expect(e1rm(100, 5)).toBeCloseTo(116.667, 3)
    expect(e1rm(100, 1)).toBeCloseTo(103.333, 3)
  })

  it.each([
    [100, 0],
    [100, 13],
    [null, 5],
    [100, null],
  ])('skips weight %j × %j reps', (weight, reps) => {
    expect(e1rm(weight, reps)).toBeNull()
  })
})

describe('timed exercises', () => {
  it('measures a hold by time, with the longest set per session', () => {
    const data = dataset([
      workout(new Date(2026, 10, 2), [
        set('Plank', { durationSeconds: 60 }),
        set('Plank', { durationSeconds: 90 }),
      ]),
    ])

    expect(exercises(data)[0]?.kind).toBe('timed')
    expect(sessions(data, 'Plank')[0]).toMatchObject({ durationSeconds: 150, longestSeconds: 90 })
  })
})

describe('exercises', () => {
  const data = dataset([
    workout(new Date(2026, 10, 2), [
      set('Bench Press (Barbell)', { weightKg: 80, reps: 5 }),
      set('Bench Press (Barbell)', { weightKg: 80, reps: 5 }),
      set('Pull Up', { reps: 10 }),
    ]),
    workout(new Date(2026, 10, 4), [
      set('Bench Press (Barbell)', { weightKg: 82.5, reps: 5 }),
      set('Walking', { distanceKm: 2, durationSeconds: 1200 }),
    ]),
  ])

  it('lists each exercise once, most recent first, with its kind and session count', () => {
    expect(exercises(data)).toEqual([
      { name: 'Bench Press (Barbell)', kind: 'weighted', sessions: 2, last: new Date(2026, 10, 4) },
      { name: 'Walking', kind: 'cardio', sessions: 1, last: new Date(2026, 10, 4) },
      { name: 'Pull Up', kind: 'bodyweight', sessions: 1, last: new Date(2026, 10, 2) },
    ])
  })
})

describe('sessions', () => {
  it('finds the top set, best e1RM and volume, leaving out warmups', () => {
    const [session] = sessions(
      dataset([
        workout(new Date(2026, 10, 2), [
          set('Squat', { type: 'warmup', weightKg: 140, reps: 1 }),
          set('Squat', { weightKg: 100, reps: 5 }),
          set('Squat', { weightKg: 110, reps: 2 }),
          set('Squat', { type: 'failure', weightKg: 110, reps: 3 }),
          set('Squat', { weightKg: 60, reps: 20 }),
        ]),
      ]),
      'Squat',
    )

    expect(session?.sets).toHaveLength(4)
    // Heaviest weight wins; more reps breaks the tie.
    expect(session?.topSet).toEqual({ weightKg: 110, reps: 3 })
    // 110 × 3 → 121 beats 100 × 5 → 116.7; 60 × 20 is outside the 1–12 rep range.
    expect(session?.bestE1rmKg).toBeCloseTo(121, 3)
    expect(session?.volumeKg).toBe(100 * 5 + 110 * 2 + 110 * 3 + 60 * 20)
  })

  it('tracks bodyweight exercises by reps and cardio by distance and duration', () => {
    const data = dataset([
      workout(new Date(2026, 10, 2), [
        set('Pull Up', { reps: 8 }),
        set('Pull Up', { reps: 10 }),
        set('Walking', { distanceKm: 1.5, durationSeconds: 900 }),
        set('Walking', { distanceKm: 1, durationSeconds: 600 }),
      ]),
    ])

    expect(sessions(data, 'Pull Up')[0]).toMatchObject({
      topSet: null,
      bestE1rmKg: null,
      bestReps: 10,
      volumeKg: 0,
    })
    expect(sessions(data, 'Walking')[0]).toMatchObject({ distanceKm: 2.5, durationSeconds: 1500 })
  })

  it('keeps one session per workout, oldest first, and skips warmup-only sessions', () => {
    const data = dataset([
      workout(new Date(2026, 10, 2), [set('Squat', { weightKg: 100, reps: 5 })], 'Legs'),
      workout(new Date(2026, 10, 4), [set('Squat', { type: 'warmup', weightKg: 60, reps: 5 })]),
      workout(new Date(2026, 10, 6), [set('Squat', { weightKg: 102.5, reps: 5 })], 'Legs B'),
    ])

    expect(sessions(data, 'Squat').map((s) => [s.workout, s.topSet?.weightKg])).toEqual([
      ['Legs', 100],
      ['Legs B', 102.5],
    ])
  })
})

describe('repRecords', () => {
  it('finds the heaviest weight for at least each rep count done, first time it was lifted', () => {
    const data = dataset([
      workout(new Date(2026, 9, 1), [
        set('Bench', { weightKg: 100, reps: 3 }),
        set('Bench', { weightKg: 90, reps: 6 }),
      ]),
      workout(new Date(2026, 9, 8), [
        set('Bench', { type: 'warmup', weightKg: 120, reps: 1 }),
        set('Bench', { weightKg: 95, reps: 5 }),
        set('Bench', { weightKg: 90, reps: 6 }),
      ]),
    ])

    expect(repRecords(sessions(data, 'Bench'))).toEqual([
      { reps: 3, weightKg: 100, date: new Date(2026, 9, 1) },
      { reps: 5, weightKg: 95, date: new Date(2026, 9, 8) },
      { reps: 6, weightKg: 90, date: new Date(2026, 9, 1) },
    ])
  })

  it('keeps only the most reps at each weight', () => {
    const data = dataset([
      workout(new Date(2026, 9, 1), [
        set('Bench', { weightKg: 95, reps: 3 }),
        set('Bench', { weightKg: 95, reps: 6 }),
      ]),
    ])
    expect(repRecords(sessions(data, 'Bench'))).toEqual([
      { reps: 6, weightKg: 95, date: new Date(2026, 9, 1) },
    ])
  })
})

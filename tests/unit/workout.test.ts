import { describe, expect, it } from 'vitest'
import type { PersonalRecord } from '../../src/lib/metrics/progress'
import { workoutExercises, workoutIds, workoutSummaries } from '../../src/lib/metrics/workout'
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

function workout(start: Date, sets: WorkoutSet[], title = 'Push', minutes = 60): Workout {
  return {
    title,
    start,
    end: new Date(start.getTime() + minutes * 60_000),
    description: null,
    sets,
  }
}

const dataset = (workouts: Workout[]): Dataset => ({ workouts, sourceUnit: 'kg' })

describe('workoutSummaries', () => {
  const data = dataset([
    workout(new Date(2026, 9, 30, 17, 6), [
      set('Bench', { type: 'warmup', weightKg: 40, reps: 8 }),
      set('Bench', { weightKg: 80, reps: 5 }),
      set('Bench', { weightKg: 80, reps: 5 }),
      set('Dip', { reps: 10 }),
    ]),
    workout(new Date(2026, 10, 2, 7, 5), [set('Squat', { weightKg: 100, reps: 5 })], 'Legs', 45),
  ])

  it('lists workouts newest first with working sets, volume and length', () => {
    const [legs, push] = workoutSummaries(data)
    expect(legs).toMatchObject({ id: '2026-11-02-0705', sets: 1, volumeKg: 500, minutes: 45 })
    expect(push).toMatchObject({
      id: '2026-10-30-1706',
      exercises: ['Bench', 'Dip'],
      sets: 3,
      volumeKg: 800,
      minutes: 60,
    })
  })

  it('numbers workouts that start in the same minute', () => {
    const start = new Date(2026, 9, 30, 17, 6)
    const ids = workoutSummaries(dataset([workout(start, []), workout(start, [], 'Pull')])).map(
      (s) => s.id,
    )
    expect(ids).toEqual(['2026-10-30-1706-2', '2026-10-30-1706'])
  })

  it('finds a workout id from its start time', () => {
    expect(workoutIds(data).get(new Date(2026, 9, 30, 17, 6).getTime())).toBe('2026-10-30-1706')
  })
})

describe('workoutExercises', () => {
  const start = new Date(2026, 9, 30, 17, 6)
  const push = workout(start, [
    set('Bench', { type: 'warmup', weightKg: 40, reps: 8, notes: 'Pause the first rep.' }),
    set('Bench', { weightKg: 80, reps: 5, notes: 'Pause the first rep.' }),
    set('Bench', { weightKg: 85, reps: 3, notes: 'Pause the first rep.' }),
    set('Bench', { type: 'failure', weightKg: 80, reps: 6, notes: 'Pause the first rep.' }),
    set('Dip', { reps: 10, supersetId: 4 }),
    set('Raise', { type: 'dropset', weightKg: 8, reps: 12, supersetId: 4 }),
    set('Plank', { durationSeconds: 60, supersetId: 7 }),
  ])
  const data = dataset([push])
  const records: PersonalRecord[] = [
    { date: start, exercise: 'Bench', kinds: ['e1rm', 'weight'], weightKg: 85, reps: 3 },
  ]
  const entries = workoutExercises(data, push, records)

  it('keeps the order, kind and note of each exercise', () => {
    expect(entries.map((e) => [e.name, e.kind])).toEqual([
      ['Bench', 'weighted'],
      ['Dip', 'bodyweight'],
      ['Raise', 'weighted'],
      ['Plank', 'timed'],
    ])
    expect(entries[0]?.notes).toBe('Pause the first rep.')
    expect(entries[1]?.notes).toBeNull()
  })

  it('labels sets as Hevy does: W, D and F, and numbers for the rest', () => {
    expect(entries[0]?.sets.map((s) => s.label)).toEqual(['W', '1', '2', 'F'])
    expect(entries[2]?.sets.map((s) => s.label)).toEqual(['D'])
  })

  it('letters supersets in the order they appear', () => {
    expect(entries.map((e) => e.superset)).toEqual([null, 'A', 'A', 'B'])
  })

  it('pins each record to the set behind it, and gives warmups no e1RM', () => {
    const bench = entries[0]!.sets
    expect(bench.map((s) => s.records)).toEqual([[], [], ['e1rm', 'weight'], []])
    expect(bench[0]?.e1rmKg).toBeNull()
    expect(bench[2]?.e1rmKg).toBeCloseTo(93.5)
  })
})

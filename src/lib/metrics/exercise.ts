// Per-exercise numbers for the exercise explorer. Pure functions over the parsed model.

import type { Dataset, WorkoutSet } from '../parse/types'
import { isWorkingSet } from './overview'

/**
 * How an exercise is measured, decided from its sets: by weight, by reps, by distance
 * (cardio) or by time alone (a plank, a dead hang).
 */
export type ExerciseKind = 'weighted' | 'bodyweight' | 'cardio' | 'timed'

export interface Exercise {
  name: string
  kind: ExerciseKind
  sessions: number
  last: Date
}

export interface TopSet {
  weightKg: number
  reps: number | null
}

export interface Session {
  date: Date
  workout: string
  /** Working sets only. */
  sets: WorkoutSet[]
  /** Heaviest working set (most reps breaks a tie). Null when no set has a weight. */
  topSet: TopSet | null
  bestE1rmKg: number | null
  bestReps: number | null
  volumeKg: number
  distanceKm: number | null
  /** Total time across the session's sets. */
  durationSeconds: number | null
  /** The longest single set, for timed holds. */
  longestSeconds: number | null
}

/** Epley estimated one-rep max, only for sets of 1–12 reps. */
export function e1rm(weightKg: number | null, reps: number | null): number | null {
  if (weightKg === null || reps === null || reps < 1 || reps > 12) return null
  return weightKg * (1 + reps / 30)
}

function kindOf(sets: WorkoutSet[]): ExerciseKind {
  if (sets.some((set) => set.weightKg !== null)) return 'weighted'
  if (sets.some((set) => set.reps !== null)) return 'bodyweight'
  if (sets.some((set) => set.distanceKm !== null)) return 'cardio'
  if (sets.some((set) => set.durationSeconds !== null)) return 'timed'
  return 'cardio'
}

/** Every exercise in the dataset, most recently trained first. */
export function exercises(dataset: Dataset): Exercise[] {
  const byName = new Map<string, { sets: WorkoutSet[]; sessions: number; last: Date }>()

  for (const workout of dataset.workouts) {
    const seen = new Set<string>()
    for (const set of workout.sets) {
      const entry = byName.get(set.exercise) ?? { sets: [], sessions: 0, last: workout.start }
      entry.sets.push(set)
      if (!seen.has(set.exercise)) {
        seen.add(set.exercise)
        entry.sessions++
        // Workouts are oldest first, so the latest one seen is the most recent.
        entry.last = workout.start
      }
      byName.set(set.exercise, entry)
    }
  }

  return [...byName]
    .map(([name, { sets, sessions, last }]) => ({ name, kind: kindOf(sets), sessions, last }))
    .sort((a, b) => b.last.getTime() - a.last.getTime() || a.name.localeCompare(b.name))
}

/** Every session of one exercise, oldest first. Sessions with only warmups are left out. */
export function sessions(dataset: Dataset, exercise: string): Session[] {
  const result: Session[] = []

  for (const workout of dataset.workouts) {
    const sets = workout.sets.filter((set) => set.exercise === exercise && isWorkingSet(set))
    if (sets.length === 0) continue

    let topSet: TopSet | null = null
    let bestE1rmKg: number | null = null
    let bestReps: number | null = null
    let volumeKg = 0
    let distanceKm: number | null = null
    let durationSeconds: number | null = null
    let longestSeconds: number | null = null

    for (const set of sets) {
      const { weightKg, reps } = set
      if (
        weightKg !== null &&
        (!topSet ||
          weightKg > topSet.weightKg ||
          (weightKg === topSet.weightKg && (reps ?? 0) > (topSet.reps ?? 0)))
      ) {
        topSet = { weightKg, reps }
      }

      const estimate = e1rm(weightKg, reps)
      if (estimate !== null && (bestE1rmKg === null || estimate > bestE1rmKg)) bestE1rmKg = estimate
      if (reps !== null && (bestReps === null || reps > bestReps)) bestReps = reps
      if (weightKg !== null && reps !== null) volumeKg += weightKg * reps
      if (set.distanceKm !== null) distanceKm = (distanceKm ?? 0) + set.distanceKm
      if (set.durationSeconds !== null) {
        durationSeconds = (durationSeconds ?? 0) + set.durationSeconds
        longestSeconds = Math.max(longestSeconds ?? 0, set.durationSeconds)
      }
    }

    result.push({
      date: workout.start,
      workout: workout.title,
      sets,
      topSet,
      bestE1rmKg,
      bestReps,
      volumeKg,
      distanceKm,
      durationSeconds,
      longestSeconds,
    })
  }

  return result
}

export interface RepRecord {
  reps: number
  /** The heaviest weight lifted for at least `reps` reps. */
  weightKg: number
  /** When that weight was first lifted for that many reps. */
  date: Date
}

/**
 * Your rep maxes: for each rep count you've done, the heaviest weight lifted for at least that
 * many reps. A set of 100 kg × 6 also proves a 5-rep max of 100 kg, so only the highest rep
 * count at each weight is kept: what's left are the sets nothing has beaten on both weight
 * and reps. Working sets only, fewest reps first.
 */
export function repRecords(history: Session[]): RepRecord[] {
  const sets = history.flatMap((session) =>
    session.sets.flatMap((set) =>
      set.weightKg !== null && set.reps !== null && set.reps > 0
        ? [{ weightKg: set.weightKg, reps: set.reps, date: session.date }]
        : [],
    ),
  )
  const counts = [...new Set(sets.map((s) => s.reps))].sort((a, b) => a - b)

  const maxes = counts.map((reps) => {
    let best: RepRecord | null = null
    // Sessions are oldest first, so a later equal weight doesn't move the date.
    for (const set of sets) {
      if (set.reps >= reps && (!best || set.weightKg > best.weightKg)) {
        best = { reps, weightKg: set.weightKg, date: set.date }
      }
    }
    return best!
  })

  // Weights never rise with reps; drop a row when the next one lifts the same for more.
  return maxes.filter((row, i) => maxes[i + 1]?.weightKg !== row.weightKg)
}

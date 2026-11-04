// Single workouts: the list of every session and everything logged in one of them.
// Pure functions over the parsed model.

import type { Dataset, Workout, WorkoutSet } from '../parse/types'
import { e1rm, exercises, type ExerciseKind } from './exercise'
import { isWorkingSet } from './overview'
import type { PersonalRecord, RecordKind } from './progress'

export interface WorkoutSummary {
  /** Stable across re-imports of a newer export: built from the start time, e.g. "2026-10-30-1706". */
  id: string
  workout: Workout
  /** Exercises in the order they were done. */
  exercises: string[]
  /** Working sets, warmups left out, as everywhere else. */
  sets: number
  volumeKg: number
  minutes: number | null
}

const pad = (n: number) => String(n).padStart(2, '0')

function baseId(start: Date): string {
  const date = `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`
  return `${date}-${pad(start.getHours())}${pad(start.getMinutes())}`
}

/** Every workout, newest first, with the totals shown in the list. */
export function workoutSummaries(dataset: Dataset): WorkoutSummary[] {
  const seen = new Map<string, number>()

  const summaries = dataset.workouts.map((workout) => {
    // Two workouts starting in the same minute are rare but possible; number the later ones.
    const base = baseId(workout.start)
    const count = (seen.get(base) ?? 0) + 1
    seen.set(base, count)

    let sets = 0
    let volumeKg = 0
    for (const set of workout.sets) {
      if (!isWorkingSet(set)) continue
      sets++
      if (set.weightKg !== null && set.reps !== null) volumeKg += set.weightKg * set.reps
    }

    const minutes = workout.end
      ? Math.round((workout.end.getTime() - workout.start.getTime()) / 60_000)
      : null

    return {
      id: count === 1 ? base : `${base}-${count}`,
      workout,
      exercises: [...new Set(workout.sets.map((set) => set.exercise))],
      sets,
      volumeKg,
      minutes: minutes !== null && minutes > 0 ? minutes : null,
    }
  })

  return summaries.reverse()
}

/** Each workout's id by its start time, for linking to a workout from a date. */
export function workoutIds(dataset: Dataset): Map<number, string> {
  const ids = new Map<number, string>()
  for (const { id, workout } of workoutSummaries(dataset)) {
    // Newest first, so on the rare clash the earlier-numbered workout wins.
    ids.set(workout.start.getTime(), id)
  }
  return ids
}

export interface SetRow {
  set: WorkoutSet
  /** As in Hevy: W for a warmup, D for a drop set, F for a set to failure, otherwise 1, 2, 3… */
  label: string
  e1rmKg: number | null
  /** The kinds of personal record this set set, if any. */
  records: RecordKind[]
}

const LETTERS: Partial<Record<WorkoutSet['type'], string>> = {
  warmup: 'W',
  dropset: 'D',
  failure: 'F',
}

export interface WorkoutExercise {
  name: string
  kind: ExerciseKind
  notes: string | null
  /** Exercises sharing a letter were done as a superset. */
  superset: string | null
  sets: SetRow[]
}

/**
 * The exercises of one workout in the order they were done, with every set, warmups included.
 * `records` comes from personalRecords(); each record is pinned to the set behind it.
 */
export function workoutExercises(
  dataset: Dataset,
  workout: Workout,
  records: PersonalRecord[],
): WorkoutExercise[] {
  const kinds = new Map(exercises(dataset).map((e) => [e.name, e.kind]))
  const supersets = new Map<number, string>()

  // Consecutive sets of the same exercise form one entry, as in the app.
  const groups: WorkoutSet[][] = []
  for (const set of workout.sets) {
    const last = groups.at(-1)
    if (last && last[0]!.exercise === set.exercise) last.push(set)
    else groups.push([set])
  }

  return groups.map((sets) => {
    const name = sets[0]!.exercise
    const supersetId = sets.find((s) => s.supersetId !== null)?.supersetId ?? null
    if (supersetId !== null && !supersets.has(supersetId)) {
      supersets.set(supersetId, String.fromCharCode(65 + supersets.size))
    }

    const record = records.find(
      (r) => r.exercise === name && r.date.getTime() === workout.start.getTime(),
    )
    let recordPlaced = false
    let normal = 0

    const rows = sets.map((set): SetRow => {
      const label = LETTERS[set.type] ?? String(++normal)
      const isRecordSet =
        !!record &&
        !recordPlaced &&
        isWorkingSet(set) &&
        set.weightKg === record.weightKg &&
        set.reps === record.reps
      if (isRecordSet) recordPlaced = true
      return {
        set,
        label,
        e1rmKg: isWorkingSet(set) ? e1rm(set.weightKg, set.reps) : null,
        records: isRecordSet ? record.kinds : [],
      }
    })

    return {
      name,
      kind: kinds.get(name) ?? 'weighted',
      notes: sets.find((s) => s.notes !== null)?.notes ?? null,
      superset: supersetId === null ? null : supersets.get(supersetId)!,
      sets: rows,
    }
  })
}

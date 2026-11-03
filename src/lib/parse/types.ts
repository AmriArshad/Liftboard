// The typed model every other part of the app works from.
// Weights are always kg and distances always km; convert only for display.

export type Unit = 'kg' | 'lb'

export type SetType = 'warmup' | 'normal' | 'failure' | 'dropset'

export interface WorkoutSet {
  exercise: string
  index: number
  type: SetType
  /** Null for bodyweight and cardio sets. For weighted variants this is the added load. */
  weightKg: number | null
  reps: number | null
  distanceKm: number | null
  durationSeconds: number | null
  rpe: number | null
  supersetId: number | null
  notes: string | null
}

export interface Workout {
  title: string
  /** Local time, as Hevy records it. */
  start: Date
  end: Date | null
  description: string | null
  sets: WorkoutSet[]
}

export interface Dataset {
  /** Oldest first. */
  workouts: Workout[]
  /** The unit the export was written in, used as the default display unit. */
  sourceUnit: Unit
}

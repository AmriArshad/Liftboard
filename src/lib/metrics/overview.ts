// Numbers for the overview screen. Pure functions over the parsed model.

import type { Dataset, WorkoutSet } from '../parse/types'

/** Warmups are left out of every strength and volume metric. */
export function isWorkingSet(set: WorkoutSet): boolean {
  return set.type !== 'warmup'
}

export interface Week {
  /** Monday 00:00, local time. */
  start: Date
  workouts: number
  /** Workouts on each day, Monday first. */
  days: [number, number, number, number, number, number, number]
  /** Working sets with reps: weighted and bodyweight, not cardio. */
  sets: number
  /** Sum of weight × reps over working weighted sets. */
  volumeKg: number
}

export interface Overview {
  workouts: number
  first: Date
  last: Date
  /** Every week from the first workout to the last, including empty ones, oldest first. */
  weeks: Week[]
}

/** Monday 00:00 of the week containing `date`, in local time. */
export function weekStart(date: Date): Date {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  // getDay() counts from Sunday (0); shift so Monday is 0.
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7))
  return start
}

export function overview(dataset: Dataset): Overview {
  const { workouts } = dataset
  const first = workouts[0]?.start
  const last = workouts.at(-1)?.start
  if (!first || !last) throw new Error('overview() needs at least one workout')

  // One entry per week, keyed by its Monday's timestamp. setDate() rather than adding
  // 7 × 24 hours keeps every key on local midnight across daylight-saving changes.
  const weeks = new Map<number, Week>()
  for (const day = weekStart(first); day <= last; day.setDate(day.getDate() + 7)) {
    const start = new Date(day)
    weeks.set(start.getTime(), {
      start,
      workouts: 0,
      days: [0, 0, 0, 0, 0, 0, 0],
      sets: 0,
      volumeKg: 0,
    })
  }

  for (const workout of workouts) {
    const week = weeks.get(weekStart(workout.start).getTime())!
    week.workouts++
    week.days[(workout.start.getDay() + 6) % 7]!++

    for (const set of workout.sets) {
      if (!isWorkingSet(set) || set.reps === null) continue
      week.sets++
      if (set.weightKg !== null) week.volumeKg += set.weightKg * set.reps
    }
  }

  return { workouts: workouts.length, first, last, weeks: [...weeks.values()] }
}

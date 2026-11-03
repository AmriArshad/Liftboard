// Personal records and stalled lifts. Pure functions over the parsed model.

import type { Dataset } from '../parse/types'
import { e1rm, exercises, sessions, type Session } from './exercise'

export type RecordKind = 'e1rm' | 'weight' | 'reps'

export interface PersonalRecord {
  date: Date
  exercise: string
  /** Every kind of record this session set, in the order e1RM, weight, reps. */
  kinds: RecordKind[]
  /** The set behind the headline record. Weight is null for bodyweight exercises. */
  weightKg: number | null
  reps: number | null
}

// Weights are floats (and lb exports convert to awkward kg values), so key them to the gram.
const weightKey = (kg: number) => kg.toFixed(3)

/**
 * Every personal record, newest first. A record is a new best e1RM, a new heaviest weight,
 * or more reps than ever before at a weight lifted previously (for bodyweight exercises,
 * simply more reps). An exercise's first session sets the baseline and isn't a record.
 */
export function personalRecords(dataset: Dataset): PersonalRecord[] {
  const records: PersonalRecord[] = []

  for (const { name } of exercises(dataset)) {
    let bestE1rm: number | null = null
    let bestWeight: number | null = null
    let bestBodyweightReps: number | null = null
    const bestRepsAt = new Map<string, number>()

    sessions(dataset, name).forEach((session, i) => {
      const found: { kind: RecordKind; weightKg: number | null; reps: number | null }[] = []
      const isBaseline = i === 0

      // New best e1RM: the session's best estimate beats every earlier one.
      const e1rmSet = bestE1rmSet(session)
      if (e1rmSet && bestE1rm !== null && e1rmSet.estimate > bestE1rm) {
        found.push({ kind: 'e1rm', weightKg: e1rmSet.weightKg, reps: e1rmSet.reps })
      }

      // New heaviest weight.
      const top = session.topSet
      if (top && bestWeight !== null && top.weightKg > bestWeight) {
        found.push({ kind: 'weight', weightKg: top.weightKg, reps: top.reps })
      }

      // More reps at a weight lifted before; the heaviest such set is the one shown.
      let repsRecord: { weightKg: number | null; reps: number } | null = null
      for (const set of session.sets) {
        if (set.reps === null) continue
        if (set.weightKg === null) {
          if (
            bestBodyweightReps !== null &&
            set.reps > bestBodyweightReps &&
            (!repsRecord || set.reps > repsRecord.reps)
          ) {
            repsRecord = { weightKg: null, reps: set.reps }
          }
          continue
        }
        const previous = bestRepsAt.get(weightKey(set.weightKg))
        if (
          previous !== undefined &&
          set.reps > previous &&
          (!repsRecord || set.weightKg > (repsRecord.weightKg ?? 0))
        ) {
          repsRecord = { weightKg: set.weightKg, reps: set.reps }
        }
      }
      if (repsRecord) found.push({ kind: 'reps', ...repsRecord })

      // Fold this session into the running bests only after comparing against them.
      if (e1rmSet) bestE1rm = Math.max(bestE1rm ?? 0, e1rmSet.estimate)
      if (top) bestWeight = Math.max(bestWeight ?? 0, top.weightKg)
      for (const set of session.sets) {
        if (set.reps === null) continue
        if (set.weightKg === null) {
          bestBodyweightReps = Math.max(bestBodyweightReps ?? 0, set.reps)
        } else {
          const key = weightKey(set.weightKg)
          bestRepsAt.set(key, Math.max(bestRepsAt.get(key) ?? 0, set.reps))
        }
      }

      const [headline] = found
      if (!isBaseline && headline) {
        records.push({
          date: session.date,
          exercise: name,
          kinds: found.map((f) => f.kind),
          weightKg: headline.weightKg,
          reps: headline.reps,
        })
      }
    })
  }

  return records.sort((a, b) => b.date.getTime() - a.date.getTime())
}

function bestE1rmSet(session: Session) {
  let best: { estimate: number; weightKg: number; reps: number } | null = null
  for (const set of session.sets) {
    const estimate = e1rm(set.weightKg, set.reps)
    if (estimate !== null && (!best || estimate > best.estimate)) {
      best = { estimate, weightKg: set.weightKg!, reps: set.reps! }
    }
  }
  return best
}

export interface StalledLift {
  exercise: string
  /** Sessions inside the window. */
  sessions: number
  /** The best e1RM from before the window, which nothing in the window has beaten. */
  bestE1rmKg: number
  /** When that best was set. */
  since: Date
}

export interface StallOptions {
  /** How far back to look, ending at the most recent workout. */
  weeks?: number
  /** Fewer sessions than this in the window isn't enough to call a lift stalled. */
  minSessions?: number
}

/**
 * Lifts trained at least `minSessions` times in the last `weeks` weeks whose best e1RM in that
 * window hasn't gone above their best from before it. The window ends at the latest workout
 * rather than today, so an old export still gives a useful answer.
 */
export function stalledLifts(
  dataset: Dataset,
  { weeks = 6, minSessions = 4 }: StallOptions = {},
): StalledLift[] {
  const latest = dataset.workouts.at(-1)?.start
  if (!latest) return []
  const windowStart = new Date(latest)
  windowStart.setDate(windowStart.getDate() - weeks * 7)

  const stalled: StalledLift[] = []

  for (const exercise of exercises(dataset)) {
    if (exercise.kind !== 'weighted') continue

    const history = sessions(dataset, exercise.name).filter((s) => s.bestE1rmKg !== null)
    const before = history.filter((s) => s.date < windowStart)
    const during = history.filter((s) => s.date >= windowStart)
    if (during.length < minSessions || before.length === 0) continue

    const previous = before.reduce((best, s) => (s.bestE1rmKg! > best.bestE1rmKg! ? s : best))
    const recentBest = Math.max(...during.map((s) => s.bestE1rmKg!))
    if (recentBest <= previous.bestE1rmKg!) {
      stalled.push({
        exercise: exercise.name,
        sessions: during.length,
        bestE1rmKg: previous.bestE1rmKg!,
        since: previous.date,
      })
    }
  }

  return stalled.sort((a, b) => b.sessions - a.sessions || a.exercise.localeCompare(b.exercise))
}

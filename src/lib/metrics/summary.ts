// The overview's "how is my training going" numbers for a chosen period, compared with the
// period before it. Pure functions over the parsed model.

import type { Dataset, Workout } from '../parse/types'
import { exercises, sessions } from './exercise'
import { isWorkingSet, overview, type Week } from './overview'
import type { PersonalRecord } from './progress'

export type Period = '4w' | '12w' | '26w' | '52w' | 'all'

export const PERIOD_WEEKS: Record<Exclude<Period, 'all'>, number> = {
  '4w': 4,
  '12w': 12,
  '26w': 26,
  '52w': 52,
}

const DAY = 24 * 60 * 60 * 1000

export interface Range {
  /** Inclusive. */
  start: Date
  /** Exclusive: midnight after the latest workout. */
  end: Date
  /** The same length of time just before `start`, or null for "all". */
  previous: { start: Date; end: Date } | null
}

/**
 * The period ends at the latest workout, not today, so an export from months ago still shows
 * its last stretch of training rather than an empty window.
 */
export function periodRange(dataset: Dataset, period: Period): Range {
  const first = dataset.workouts[0]?.start ?? new Date()
  const last = dataset.workouts.at(-1)?.start ?? new Date()
  const end = new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1)

  if (period === 'all') {
    return {
      start: new Date(first.getFullYear(), first.getMonth(), first.getDate()),
      end,
      previous: null,
    }
  }

  const days = PERIOD_WEEKS[period] * 7
  const start = new Date(end.getFullYear(), end.getMonth(), end.getDate() - days)
  const previousStart = new Date(start.getFullYear(), start.getMonth(), start.getDate() - days)
  return { start, end, previous: { start: previousStart, end: start } }
}

export function inRange(workouts: Workout[], start: Date, end: Date): Workout[] {
  return workouts.filter((w) => w.start >= start && w.start < end)
}

export interface Totals {
  workouts: number
  /** Workouts per week across the whole period, including weeks with none. */
  perWeek: number
  volumeKg: number
  sets: number
  /** Mean session length; null when no workout has a usable end time. */
  avgMinutes: number | null
  personalRecords: number
}

// Longer than this is a session someone forgot to finish in the app, not a workout.
const MAX_SESSION_MINUTES = 5 * 60

export function totals(
  workouts: Workout[],
  start: Date,
  end: Date,
  records: PersonalRecord[],
): Totals {
  let volumeKg = 0
  let sets = 0
  const durations: number[] = []

  for (const workout of workouts) {
    if (workout.end) {
      const minutes = (workout.end.getTime() - workout.start.getTime()) / 60_000
      if (minutes > 0 && minutes <= MAX_SESSION_MINUTES) durations.push(minutes)
    }
    for (const set of workout.sets) {
      if (!isWorkingSet(set) || set.reps === null) continue
      sets++
      if (set.weightKg !== null) volumeKg += set.weightKg * set.reps
    }
  }

  const weeks = Math.max(1, Math.round((end.getTime() - start.getTime()) / (7 * DAY)))
  return {
    workouts: workouts.length,
    perWeek: workouts.length / weeks,
    volumeKg,
    sets,
    avgMinutes: durations.length ? durations.reduce((a, b) => a + b, 0) / durations.length : null,
    personalRecords: records.filter((r) => r.date >= start && r.date < end).length,
  }
}

/** Relative change from `before` to `now`, or null when there's nothing to compare against. */
export function change(now: number, before: number | null | undefined): number | null {
  if (before === null || before === undefined || before === 0) return null
  return (now - before) / before
}

export interface Streaks {
  /** Consecutive weeks with at least one workout, ending at the latest week. */
  current: number
  longest: number
}

export function streaks(weeks: Week[]): Streaks {
  let longest = 0
  let run = 0
  for (const week of weeks) {
    run = week.workouts > 0 ? run + 1 : 0
    longest = Math.max(longest, run)
  }
  return { current: run, longest }
}

export type LiftStatus = 'progressing' | 'flat' | 'regressing' | 'stalled'

export interface LiftTrend {
  exercise: string
  sessions: number
  /** Best e1RM across the last few (up to three) sessions in the period. */
  e1rmKg: number
  /** Change from the first few sessions' best to the last few's, or null under four sessions. */
  changePct: number | null
  status: LiftStatus
  points: [Date, number][]
}

// A few percent either way is day-to-day noise, not a trend.
const FLAT_BAND = 0.02

/**
 * The period's weighted lifts and whether each is moving, most-trained first. Stalled and
 * regressing lifts are always kept, because the lift that isn't working is the one worth
 * seeing; the rest of the `limit` goes to the most-trained.
 * `stalled` names come from stalledLifts(), so this page and Progress always agree.
 */
export function liftTrends(
  dataset: Dataset,
  start: Date,
  end: Date,
  stalled: ReadonlySet<string>,
  limit = 8,
): LiftTrend[] {
  const trends: LiftTrend[] = []

  for (const exercise of exercises(dataset)) {
    if (exercise.kind !== 'weighted') continue
    const history = sessions(dataset, exercise.name).filter(
      (s) => s.date >= start && s.date < end && s.bestE1rmKg !== null,
    )
    if (history.length < 2) continue

    // Compare the best of the first few sessions with the best of the last few. The two
    // windows never overlap, so a lift that dropped can't be compared against itself.
    const best = (list: typeof history) => Math.max(...list.map((s) => s.bestE1rmKg!))
    const window = Math.min(3, Math.floor(history.length / 2))
    const now = best(history.slice(-window))
    const changePct = history.length >= 4 ? change(now, best(history.slice(0, window))) : null

    let status: LiftStatus = 'flat'
    if (stalled.has(exercise.name)) status = 'stalled'
    else if (changePct !== null && changePct > FLAT_BAND) status = 'progressing'
    else if (changePct !== null && changePct < -FLAT_BAND) status = 'regressing'

    trends.push({
      exercise: exercise.name,
      sessions: history.length,
      e1rmKg: now,
      changePct,
      status,
      points: history.map((s) => [s.date, s.bestE1rmKg!]),
    })
  }

  const byUse = (a: LiftTrend, b: LiftTrend) =>
    b.sessions - a.sessions || a.exercise.localeCompare(b.exercise)
  const problems = trends.filter((t) => t.status === 'stalled' || t.status === 'regressing')
  const others = trends.filter((t) => !problems.includes(t)).sort(byUse)
  const kept = [...problems.sort(byUse).slice(0, limit)]
  kept.push(...others.slice(0, Math.max(0, limit - kept.length)))
  return kept.sort(byUse)
}

export interface SplitShare {
  title: string
  workouts: number
  share: number
}

/** How the period's workouts divide by workout name ("Push", "Legs", …). */
export function split(workouts: Workout[], limit = 4): SplitShare[] {
  const counts = new Map<string, number>()
  for (const w of workouts) {
    const title = w.title || 'Untitled'
    counts.set(title, (counts.get(title) ?? 0) + 1)
  }
  const sorted = [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  const top = sorted.slice(0, limit)
  const rest = sorted.slice(limit).reduce((sum, [, n]) => sum + n, 0)
  if (rest > 0) top.push(['Other', rest])
  const total = workouts.length || 1
  return top.map(([title, n]) => ({ title, workouts: n, share: n / total }))
}

/** Workouts on each weekday, Monday first. */
export function byWeekday(workouts: Workout[]): number[] {
  const days = [0, 0, 0, 0, 0, 0, 0]
  for (const w of workouts) days[(w.start.getDay() + 6) % 7]!++
  return days
}

/** Weeks of the full history that overlap the range, for the calendar and volume chart. */
export function weeksInRange(dataset: Dataset, start: Date, end: Date): Week[] {
  return overview(dataset).weeks.filter(
    (w) => w.start.getTime() + 7 * DAY > start.getTime() && w.start < end,
  )
}

/** Trailing average of the last `size` values at each point (fewer at the very start). */
export function rollingAverage(values: number[], size = 4): number[] {
  return values.map((_, i) => {
    const window = values.slice(Math.max(0, i - size + 1), i + 1)
    return window.reduce((a, b) => a + b, 0) / window.length
  })
}

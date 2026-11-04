// The overview's "how is my training going" numbers for a chosen period, compared with the
// period before it. Pure functions over the parsed model.

import type { Dataset, Workout } from '../parse/types'
import { exercises, sessions } from './exercise'
import { isWorkingSet, overview, weekStart, type Week } from './overview'
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
 * its last stretch of training rather than an empty window. It covers whole calendar weeks
 * (Monday to Sunday), counting the latest workout's week as the last, so every weekly bar
 * and calendar column is a full week.
 */
export function periodRange(dataset: Dataset, period: Period): Range {
  const first = dataset.workouts[0]?.start ?? new Date()
  const last = dataset.workouts.at(-1)?.start ?? new Date()
  const end = new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1)

  if (period === 'all') {
    return { start: weekStart(first), end, previous: null }
  }

  const days = PERIOD_WEEKS[period] * 7
  const lastWeek = weekStart(last)
  const start = new Date(lastWeek.getFullYear(), lastWeek.getMonth(), lastWeek.getDate() - days + 7)
  // A period longer than the history starts at the first workout's week. Otherwise the weeks
  // before it would count as weeks without training and drag every weekly average down.
  const firstWeek = weekStart(first)
  if (start < firstWeek) return { start: firstWeek, end, previous: null }
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

  // The latest week is usually partway through; it still counts as a week of the period.
  const weeks = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (7 * DAY)))
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

/** How the period's volume divides by workout name ("Push", "Legs", …). */
export function split(workouts: Workout[], limit = 4): SplitShare[] {
  // Shares of volume, to match the stacked volume chart they label. Workouts without any
  // weighted volume (a run, a mobility session) have nothing to stack, so they're left out.
  const volumes = new Map<string, { volumeKg: number; workouts: number }>()
  for (const w of workouts) {
    const volumeKg = workoutVolume(w)
    if (volumeKg === 0) continue
    const title = w.title || 'Untitled'
    const entry = volumes.get(title) ?? { volumeKg: 0, workouts: 0 }
    entry.volumeKg += volumeKg
    entry.workouts++
    volumes.set(title, entry)
  }
  const sorted = [...volumes].sort(
    (a, b) => b[1].volumeKg - a[1].volumeKg || a[0].localeCompare(b[0]),
  )
  const top = sorted.slice(0, limit)
  const rest = sorted.slice(limit)
  if (rest.length > 0) {
    top.push([
      'Other',
      {
        volumeKg: rest.reduce((sum, [, e]) => sum + e.volumeKg, 0),
        workouts: rest.reduce((sum, [, e]) => sum + e.workouts, 0),
      },
    ])
  }
  const total = sorted.reduce((sum, [, e]) => sum + e.volumeKg, 0) || 1
  return top.map(([title, e]) => ({ title, workouts: e.workouts, share: e.volumeKg / total }))
}

function workoutVolume(workout: Workout): number {
  let volumeKg = 0
  for (const set of workout.sets) {
    if (isWorkingSet(set) && set.weightKg !== null && set.reps !== null) {
      volumeKg += set.weightKg * set.reps
    }
  }
  return volumeKg
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

/**
 * Each week's volume divided by workout name, one array per entry of `titles` (aligned with
 * `weeks`), for a stacked chart. Workouts whose name isn't listed count towards "Other" when
 * `titles` includes it.
 */
export function weeklyVolumeBySplit(
  workouts: Workout[],
  weeks: Week[],
  titles: string[],
): number[][] {
  const index = new Map(weeks.map((w, i) => [w.start.getTime(), i]))
  const rows = titles.map(() => weeks.map(() => 0))
  const other = titles.indexOf('Other')

  for (const workout of workouts) {
    const week = index.get(weekStart(workout.start).getTime())
    const row = titles.indexOf(workout.title || 'Untitled')
    const target = row === -1 ? other : row
    if (week === undefined || target === -1) continue
    rows[target]![week]! += workoutVolume(workout)
  }
  return rows
}

const strip = (exercise: string) => exercise.replace(/\s*\([^)]*\)\s*$/, '') || exercise

/**
 * "Deadlift (Barbell)" → "Deadlift": equipment in brackets reads badly mid-sentence. The
 * brackets stay when dropping them would make two exercises in `all` look the same, so
 * "Pull Up (Weighted)" is never shown as plain "Pull Up" next to the bodyweight one.
 */
export function shortName(exercise: string, all: readonly string[] = []): string {
  const short = strip(exercise)
  const clash = all.some((other) => other !== exercise && strip(other) === short)
  return clash ? exercise : short
}

const list = (items: string[]) =>
  items.length <= 1 ? (items[0] ?? '') : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`

/**
 * Two or three plain sentences on what's working and what isn't, from the numbers on the page.
 * Facts only: the reader knows their program better than this does.
 */
export function insights(
  lifts: LiftTrend[],
  now: Totals,
  before: Totals | null,
  names: readonly string[] = [],
): string[] {
  const sentences: string[] = []
  const short = (exercise: string) => shortName(exercise, names)
  const pct = (n: number) => `${n > 0 ? '+' : ''}${Math.round(n * 100)}%`

  const leaders = lifts
    .filter((l) => l.status === 'progressing' && l.changePct !== null)
    .sort((a, b) => b.changePct! - a.changePct!)
    .slice(0, 2)
  if (leaders.length > 0) {
    const names = leaders.map((l) => `${short(l.exercise)} (${pct(l.changePct!)})`)
    sentences.push(`${list(names)} ${leaders.length > 1 ? 'are' : 'is'} leading your progress.`)
  } else if (lifts.length > 0) {
    sentences.push('No lift is clearly moving up this period.')
  }

  const stalled = lifts.filter((l) => l.status === 'stalled').map((l) => short(l.exercise))
  if (stalled.length > 0) {
    sentences.push(`${list(stalled)} ${stalled.length > 1 ? 'have' : 'has'} stalled.`)
  }
  const down = lifts.filter((l) => l.status === 'regressing')
  for (const lift of down.slice(0, 2)) {
    sentences.push(`${short(lift.exercise)} is down ${pct(lift.changePct!).slice(1)}.`)
  }

  if (before && before.workouts > 0) {
    const oneDecimal = (n: number) => Math.round(n * 10) / 10
    const [a, b] = [oneDecimal(now.perWeek), oneDecimal(before.perWeek)]
    sentences.push(
      a === b
        ? `You trained a steady ${a} times a week.`
        : `You trained ${a} times a week, ${a > b ? 'up' : 'down'} from ${b}.`,
    )
  }
  return sentences
}

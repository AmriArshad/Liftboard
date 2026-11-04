import { describe, expect, it } from 'vitest'
import type { Week } from '../../src/lib/metrics/overview'
import {
  byWeekday,
  change,
  liftTrends,
  periodRange,
  split,
  streaks,
  insights,
  shortName,
  totals,
  weeklyVolumeBySplit,
  type LiftTrend,
  type Totals,
} from '../../src/lib/metrics/summary'
import type { Dataset, Workout, WorkoutSet } from '../../src/lib/parse/types'

function set(exercise: string, weightKg: number | null, reps: number | null): WorkoutSet {
  return {
    exercise,
    index: 0,
    type: 'normal',
    weightKg,
    reps,
    distanceKm: null,
    durationSeconds: null,
    rpe: null,
    supersetId: null,
    notes: null,
  }
}

const day = (n: number, hour = 18) => new Date(2026, 8, 1 + n, hour, 0)

function workout(n: number, sets: WorkoutSet[] = [], title = 'Push', minutes = 60): Workout {
  const start = day(n)
  return {
    title,
    start,
    end: new Date(start.getTime() + minutes * 60_000),
    description: null,
    sets,
  }
}

const dataset = (workouts: Workout[]): Dataset => ({ workouts, sourceUnit: 'kg' })

describe('periodRange', () => {
  const data = dataset([workout(0), workout(40)])

  it('covers whole calendar weeks ending with the latest workout', () => {
    const range = periodRange(data, '4w')
    expect(range.end).toEqual(new Date(2026, 9, 12))
    expect(range.start).toEqual(new Date(2026, 8, 14))
    expect(range.previous).toEqual({ start: new Date(2026, 7, 17), end: new Date(2026, 8, 14) })
  })

  it('starts at the first workout when the period is longer than the history', () => {
    const range = periodRange(data, '12w')
    expect(range.start).toEqual(new Date(2026, 7, 31))
    expect(range.previous).toBeNull()
  })

  it('covers the whole history for "all", with nothing to compare against', () => {
    const range = periodRange(data, 'all')
    // From the Monday of the first workout's week.
    expect(range.start).toEqual(new Date(2026, 7, 31))
    expect(range.previous).toBeNull()
  })
})

describe('totals', () => {
  it('adds up workouts, volume, working sets, session length and records', () => {
    const workouts = [
      workout(0, [set('Squat', 100, 5), { ...set('Squat', 60, 5), type: 'warmup' }], 'Legs', 50),
      workout(2, [set('Pull Up', null, 10)], 'Pull', 70),
      workout(4, [], 'Push', 600), // a session left running: ignored for length
    ]
    const result = totals(workouts, day(0, 0), day(28, 0), [
      { date: day(2), exercise: 'Squat', kinds: ['e1rm'], weightKg: 100, reps: 5 },
      { date: day(40), exercise: 'Squat', kinds: ['e1rm'], weightKg: 100, reps: 5 },
    ])

    expect(result).toEqual({
      workouts: 3,
      perWeek: 0.75,
      volumeKg: 500,
      sets: 2,
      avgMinutes: 60,
      personalRecords: 1,
    })
  })
})

describe('change', () => {
  it('returns the relative change, or null without a baseline', () => {
    expect(change(110, 100)).toBeCloseTo(0.1)
    expect(change(5, 0)).toBeNull()
    expect(change(5, null)).toBeNull()
  })
})

describe('streaks', () => {
  const week = (workouts: number) => ({ workouts }) as Week

  it('counts consecutive training weeks, now and at best', () => {
    expect(streaks([1, 2, 3, 0, 1, 1].map(week))).toEqual({ current: 2, longest: 3 })
    expect(streaks([1, 1, 0].map(week))).toEqual({ current: 0, longest: 2 })
  })
})

describe('liftTrends', () => {
  const squat = (n: number, kg: number) => workout(n, [set('Squat', kg, 5)])

  it('compares the first and last sessions without overlap and labels the trend', () => {
    const data = dataset([squat(0, 100), squat(7, 102.5), squat(14, 105), squat(21, 110)])
    const [trend] = liftTrends(data, day(0, 0), day(28, 0), new Set())

    expect(trend).toMatchObject({ exercise: 'Squat', sessions: 4, status: 'progressing' })
    expect(trend?.e1rmKg).toBeCloseTo(110 * (1 + 5 / 30))
    // Four sessions: the first two (best 102.5) against the last two (best 110).
    expect(trend?.changePct).toBeCloseTo(110 / 102.5 - 1)
    expect(trend?.points).toHaveLength(4)
  })

  it('calls small changes flat, falls regressing, and defers to the stall list', () => {
    const flat = dataset([squat(0, 100), squat(7, 100), squat(14, 100), squat(21, 101)])
    const down = dataset([squat(0, 110), squat(7, 110), squat(14, 100), squat(21, 100)])

    expect(liftTrends(flat, day(0, 0), day(28, 0), new Set())[0]?.status).toBe('flat')
    expect(liftTrends(down, day(0, 0), day(28, 0), new Set())[0]?.status).toBe('regressing')
    expect(liftTrends(down, day(0, 0), day(28, 0), new Set(['Squat']))[0]?.status).toBe('stalled')
  })

  it('needs four sessions to call a trend and leaves out bodyweight lifts', () => {
    const data = dataset([
      squat(0, 100),
      squat(7, 110),
      workout(1, [set('Pull Up', null, 8)]),
      workout(8, [set('Pull Up', null, 9)]),
    ])
    const trends = liftTrends(data, day(0, 0), day(28, 0), new Set())

    expect(trends.map((t) => [t.exercise, t.changePct, t.status])).toEqual([
      ['Squat', null, 'flat'],
    ])
  })
})

describe('split', () => {
  it('shares volume by workout name, folding the long tail into Other', () => {
    const volumes: [string, number][] = [
      ['Legs', 300],
      ['Push', 100],
      ['Push', 100],
      ['Pull', 150],
      ['Arms', 50],
      ['Abs', 20],
    ]
    const result = split(
      volumes.map(([name, kg], i) => workout(i, [set('Lift', kg, 1)], name)),
      3,
    )

    expect(result.map((s) => [s.title, s.workouts])).toEqual([
      ['Legs', 1],
      ['Push', 2],
      ['Pull', 1],
      ['Other', 2],
    ])
    expect(result[0]?.share).toBeCloseTo(300 / 720)
    expect(result[3]?.share).toBeCloseTo(70 / 720)
  })

  it('leaves out workouts with no weighted volume', () => {
    const result = split([workout(0, [set('Bench', 100, 5)], 'Push'), workout(1, [], 'Run')])
    expect(result.map((s) => [s.title, s.share])).toEqual([['Push', 1]])
  })
})

describe('byWeekday', () => {
  it('counts workouts per weekday, Monday first', () => {
    // 1 Sep 2026 is a Tuesday.
    expect(byWeekday([workout(0), workout(6), workout(7)])).toEqual([1, 2, 0, 0, 0, 0, 0])
  })
})

describe('liftTrends selection', () => {
  it('always keeps stalled lifts, even when better-trained lifts fill the limit', () => {
    const lift = (name: string, sessions: number) =>
      Array.from({ length: sessions }, (_, i) => workout(i * 3, [set(name, 100 + i, 5)]))
    const data = dataset(
      [...lift('Bench', 6), ...lift('Squat', 6), ...lift('Press', 4)].sort(
        (a, b) => a.start.getTime() - b.start.getTime(),
      ),
    )
    const names = liftTrends(data, day(0, 0), day(40, 0), new Set(['Press']), 2).map(
      (t) => t.exercise,
    )

    expect(names).toEqual(['Bench', 'Press'])
  })
})

describe('weeklyVolumeBySplit', () => {
  it('stacks each week by workout name, with unlisted names in Other', () => {
    // 31 Aug 2026 is a Monday; days 0 and 1 share a week, day 7 is the next.
    const weeks = [{ start: new Date(2026, 7, 31) }, { start: new Date(2026, 8, 7) }] as Week[]
    const rows = weeklyVolumeBySplit(
      [
        workout(0, [set('Bench', 100, 5)], 'Push'),
        workout(1, [set('Row', 50, 10)], 'Pull'),
        workout(7, [set('Bench', 100, 2), set('Pull Up', null, 10)], 'Push'),
      ],
      weeks,
      ['Push', 'Other'],
    )

    expect(rows).toEqual([
      [500, 200],
      [500, 0],
    ])
  })
})

describe('shortName', () => {
  it('drops the equipment in brackets', () => {
    expect(shortName('Deadlift (Barbell)', ['Deadlift (Barbell)', 'Pull Up'])).toBe('Deadlift')
  })

  it('keeps the brackets when another exercise would look the same', () => {
    const all = ['Pull Up', 'Pull Up (Weighted)', 'Bench Press (Barbell)', 'Bench Press (Dumbbell)']
    expect(shortName('Pull Up (Weighted)', all)).toBe('Pull Up (Weighted)')
    expect(shortName('Bench Press (Dumbbell)', all)).toBe('Bench Press (Dumbbell)')
    expect(shortName('Pull Up', all)).toBe('Pull Up')
  })
})

describe('insights', () => {
  const trend = (exercise: string, status: LiftTrend['status'], changePct: number | null) =>
    ({ exercise, status, changePct, sessions: 6, e1rmKg: 100, points: [] }) as LiftTrend
  const totalsOf = (perWeek: number) => ({ perWeek, workouts: 10 }) as Totals

  it('names the leaders, the stalled and the slipping, and how often you trained', () => {
    const result = insights(
      [
        trend('Squat (Barbell)', 'progressing', 0.07),
        trend('Deadlift (Barbell)', 'progressing', 0.09),
        trend('Curl', 'progressing', 0.03),
        trend('Overhead Press (Barbell)', 'stalled', 0),
        trend('Bench Press (Barbell)', 'regressing', -0.04),
      ],
      totalsOf(2.8),
      totalsOf(2.5),
    )

    expect(result).toEqual([
      'Deadlift (+9%) and Squat (+7%) are leading your progress.',
      'Overhead Press has stalled.',
      'Bench Press is down 4%.',
      'You trained 2.8 times a week, up from 2.5.',
    ])
  })

  it('keeps brackets that tell two exercises apart', () => {
    const names = ['Pull Up', 'Pull Up (Weighted)']
    expect(
      insights([trend('Pull Up (Weighted)', 'progressing', 0.2)], totalsOf(3), null, names),
    ).toEqual(['Pull Up (Weighted) (+20%) is leading your progress.'])
  })

  it('says so when nothing is moving up, and skips the comparison without one', () => {
    expect(insights([trend('Squat', 'flat', 0.01)], totalsOf(3), null)).toEqual([
      'No lift is clearly moving up this period.',
    ])
  })
})

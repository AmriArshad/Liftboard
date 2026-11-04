// Writes public/demo.csv: a synthetic Hevy export behind the "Try the demo" button.
// Run with `npm run generate:demo`. A seeded random number generator keeps the output the same
// on every run, so the file only changes in git when this script does.

import { writeFileSync } from 'node:fs'

interface Lift {
  name: string
  /** Starting weight in kg; omit for bodyweight and cardio. */
  start?: number
  /** kg added each session. */
  step?: number
  /** Stop progressing after this many sessions, so the demo has a stalled lift to show. */
  stallAfter?: number
  reps: number
  sets: number
  warmup?: boolean
  cardio?: boolean
  /** Hevy repeats an exercise's note on every one of its sets. */
  notes?: string
  /** Lifts sharing an id in a day were done as a superset. */
  superset?: number
}

const DAYS: Record<string, Lift[]> = {
  Push: [
    {
      name: 'Bench Press (Barbell)',
      start: 70,
      step: 1.25,
      reps: 5,
      sets: 3,
      warmup: true,
      notes: 'Pause the first rep, elbows tucked.',
    },
    { name: 'Overhead Press (Barbell)', start: 40, step: 0.5, stallAfter: 12, reps: 6, sets: 3 },
    { name: 'Triceps Dip', reps: 10, sets: 3, superset: 0 },
    { name: 'Lateral Raise (Dumbbell)', start: 8, step: 0.1, reps: 12, sets: 3, superset: 0 },
  ],
  Pull: [
    { name: 'Deadlift (Barbell)', start: 110, step: 2.5, reps: 5, sets: 3, warmup: true },
    { name: 'Pull Up', reps: 8, sets: 2 },
    { name: 'Pull Up (Weighted)', start: 5, step: 0.5, reps: 6, sets: 2 },
    { name: 'Bent Over Row (Barbell)', start: 60, step: 1.25, reps: 8, sets: 3 },
  ],
  Legs: [
    {
      name: 'Squat (Barbell)',
      start: 90,
      step: 2.5,
      reps: 5,
      sets: 3,
      warmup: true,
      notes: 'High bar. Belt from the second set.',
    },
    { name: 'Romanian Deadlift (Barbell)', start: 80, step: 1.25, reps: 8, sets: 3 },
    { name: 'Leg Press (Machine)', start: 140, step: 5, reps: 10, sets: 3 },
    { name: 'Walking', reps: 0, sets: 1, cardio: true },
  ],
}

const HEADER = [
  'title',
  'start_time',
  'end_time',
  'description',
  'exercise_title',
  'superset_id',
  'exercise_notes',
  'set_index',
  'set_type',
  'weight_kg',
  'reps',
  'distance_km',
  'duration_seconds',
  'rpe',
]

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// mulberry32: a tiny seeded PRNG, so the demo is identical on every run.
function seeded(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const random = seeded(42)
const between = (min: number, max: number) => min + Math.floor(random() * (max - min + 1))

// Hevy's format: "2 Nov 2026, 17:26".
function hevyDate(date: Date): string {
  const time = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}, ${time}`
}

// Every fifth workout gets a note, cycling through these. Picked by position rather than at
// random, so adding them didn't change any of the generated numbers.
const DESCRIPTIONS = [
  'Felt strong today.',
  'Short on sleep, kept the weights honest.',
  'Gym was packed, so I swapped the order around a little.',
  'Good session. Bar speed felt quick on everything.',
]

const roundTo = (value: number, step: number) => Math.round(value / step) * step

const csvRow = (fields: (string | number)[]) =>
  fields.map((field) => `"${String(field).replaceAll('"', '""')}"`).join(',')

const workouts: string[][] = []
const sessions: Record<string, number> = { Push: 0, Pull: 0, Legs: 0 }
const order = ['Push', 'Pull', 'Legs']
let next = 0

// Mondays, Wednesdays and Fridays from June to the end of October 2026.
for (let day = new Date(2026, 5, 1); day < new Date(2026, 10, 1); day.setDate(day.getDate() + 1)) {
  if (![1, 3, 5].includes(day.getDay()) || random() < 0.1) continue

  const title = order[next++ % order.length]!
  const n = sessions[title]!++
  const start = new Date(day)
  start.setHours(between(17, 18), between(0, 59))
  const end = new Date(start.getTime() + between(55, 80) * 60_000)
  const rows: string[] = []
  const description =
    workouts.length % 5 === 0 ? DESCRIPTIONS[(workouts.length / 5) % DESCRIPTIONS.length]! : ''
  workouts.push(rows)

  for (const lift of DAYS[title]!) {
    const sets: (string | number)[][] = []

    if (lift.cardio) {
      sets.push(['normal', '', '', (between(18, 30) / 10).toFixed(1), between(1200, 1800), ''])
    } else if (lift.start === undefined) {
      // Bodyweight: reps creep up over time.
      const reps = lift.reps + Math.floor(n / 4)
      for (let s = 0; s < lift.sets; s++) {
        sets.push(['normal', '', reps - between(0, 2), '', '', ''])
      }
    } else {
      const weight = roundTo(lift.start + lift.step! * Math.min(n, lift.stallAfter ?? n), 1.25)
      if (lift.warmup) sets.push(['warmup', roundTo(weight * 0.5, 2.5), 8, '', '', ''])
      for (let s = 0; s < lift.sets; s++) {
        const last = s === lift.sets - 1
        const reps = lift.reps + between(-1, 1) - (last ? 1 : 0)
        sets.push([last ? 'failure' : 'normal', weight, reps, '', '', last ? 9.5 : between(7, 9)])
      }
    }

    sets.forEach((set, index) => {
      const [type, weight, reps, distance, duration, rpe] = set
      rows.push(
        csvRow([
          title,
          hevyDate(start),
          hevyDate(end),
          description,
          lift.name,
          lift.superset ?? '',
          lift.notes ?? '',
          index,
          type!,
          weight!,
          reps!,
          distance!,
          duration!,
          rpe!,
        ]),
      )
    })
  }
}

// Hevy lists the newest workout first.
const rows = workouts.reverse().flat()

writeFileSync('public/demo.csv', [csvRow(HEADER), ...rows].join('\n') + '\n')
console.log(`Wrote public/demo.csv: ${workouts.length} workouts, ${rows.length} sets`)

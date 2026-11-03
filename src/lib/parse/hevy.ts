// Turns a Hevy workout CSV export into the typed model in ./types.
// Pure functions only: no DOM, no Svelte, so everything here is unit-testable.

import Papa from 'papaparse'
import type { Dataset, SetType, Unit, Workout, WorkoutSet } from './types'

const KG_PER_LB = 0.45359237
const KM_PER_MILE = 1.609344

/** Thrown for any file we can't read. The message is short enough to show to the user as is. */
export class HevyParseError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'HevyParseError'
  }
}

type Row = Record<string, string | undefined>

const REQUIRED_COLUMNS = ['title', 'start_time', 'exercise_title', 'set_type']

// Only kg exports have been seen for real, so accept the likely imperial spellings too.
const WEIGHT_COLUMNS = new Map<string, Unit>([
  ['weight_kg', 'kg'],
  ['weight_kgs', 'kg'],
  ['weight_lbs', 'lb'],
  ['weight_lb', 'lb'],
])

const KM_PER_DISTANCE_UNIT = new Map<string, number>([
  ['distance_km', 1],
  ['distance_miles', KM_PER_MILE],
  ['distance_mi', KM_PER_MILE],
])

interface Columns {
  weight: string
  unit: Unit
  distance: string | null
  kmPerDistanceUnit: number
}

function detectColumns(headers: string[]): Columns {
  if (!REQUIRED_COLUMNS.every((column) => headers.includes(column))) {
    throw new HevyParseError("This doesn't look like a Hevy workout export.")
  }

  const weight = headers.find((header) => WEIGHT_COLUMNS.has(header))
  if (!weight) throw new HevyParseError("Couldn't find a weight column in this export.")

  const distance = headers.find((header) => KM_PER_DISTANCE_UNIT.has(header)) ?? null

  return {
    weight,
    unit: WEIGHT_COLUMNS.get(weight)!,
    distance,
    kmPerDistanceUnit: distance ? KM_PER_DISTANCE_UNIT.get(distance)! : 1,
  }
}

/** Empty cells are null, never 0. */
function toNumber(value: string | undefined): number | null {
  const text = value?.trim()
  if (!text) return null
  // Some locales write decimals with a comma ("62,5").
  const number = Number(text.includes('.') ? text : text.replace(',', '.'))
  return Number.isFinite(number) ? number : null
}

function toText(value: string | undefined): string | null {
  return value?.trim() || null
}

const SET_TYPES = new Set<string>(['warmup', 'normal', 'failure', 'dropset'])

// Unknown set types count as normal working sets rather than failing the whole file.
function toSetType(value: string | undefined): SetType {
  const text = value?.trim().toLowerCase() ?? ''
  return SET_TYPES.has(text) ? (text as SetType) : 'normal'
}

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']

const ISO_DATE = /^(\d{4})-(\d{1,2})-(\d{1,2})[t ](\d{1,2}):(\d{2})(?::(\d{2}))?/
const TIME = /(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)?/

/**
 * Reads a Hevy date such as "2 Nov 2026, 17:26" as local time.
 * Hevy's format follows the phone's locale, so this also accepts "Nov 2, 2026, 5:26 PM",
 * "2026-11-02 17:26" and numeric dates ("02/11/2026 17:26", read day-first unless that's impossible).
 * Returns null instead of guessing when it can't read the text.
 */
export function parseHevyDate(text: string): Date | null {
  const value = text.trim().toLowerCase()

  const iso = ISO_DATE.exec(value)
  if (iso) {
    const [, year, month, day, hour, minute, second] = iso
    return makeDate(+year!, +month!, +day!, +hour!, +minute!, +(second ?? 0))
  }

  const time = TIME.exec(value)
  if (!time) return null

  let hour = +time[1]!
  const minute = +time[2]!
  const second = +(time[3] ?? 0)
  const meridiem = time[4]?.[0] // 'a' or 'p'
  if (meridiem) {
    if (hour < 1 || hour > 12) return null
    hour = (hour % 12) + (meridiem === 'p' ? 12 : 0)
  }

  // Whatever is left once the time is removed is the date.
  const datePart = value.slice(0, time.index) + ' ' + value.slice(time.index + time[0].length)
  const numbers = datePart.match(/\d+/g) ?? []
  const monthName = /[a-z]{3,}/.exec(datePart)?.[0]

  let year: number
  let month: number
  let day: number

  if (monthName) {
    // "2 Nov 2026" or "Nov 2, 2026": the 4-digit number is the year, the other is the day.
    month = MONTHS.indexOf(monthName.slice(0, 3)) + 1
    const yearIndex = numbers.findIndex((number) => number.length === 4)
    if (month === 0 || numbers.length !== 2 || yearIndex === -1) return null
    year = +numbers[yearIndex]!
    day = +numbers[1 - yearIndex]!
  } else {
    if (numbers.length !== 3) return null
    const [a, b, c] = numbers as [string, string, string]
    if (a.length === 4) {
      ;[year, month, day] = [+a, +b, +c]
    } else if (c.length === 4) {
      year = +c
      ;[day, month] = +b > 12 ? [+b, +a] : [+a, +b]
    } else {
      return null
    }
  }

  return makeDate(year, month, day, hour, minute, second)
}

function makeDate(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
): Date | null {
  if (hour > 23 || minute > 59 || second > 59) return null
  const date = new Date(year, month - 1, day, hour, minute, second)
  // new Date() silently rolls "31 Feb" over into March; reject that instead.
  const valid =
    date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
  return valid ? date : null
}

/** Parses the text of a Hevy CSV export. Throws HevyParseError if the file can't be used. */
export function parseHevyCsv(text: string): Dataset {
  if (!text.trim()) throw new HevyParseError('This file is empty.')

  const result = Papa.parse<Row>(text, {
    header: true,
    skipEmptyLines: 'greedy',
    // trim() also strips the byte-order mark some apps put at the start of a CSV.
    transformHeader: (header) => header.trim().toLowerCase(),
  })
  if (result.errors.some((error) => error.type === 'Quotes')) {
    throw new HevyParseError("This file isn't a valid CSV.")
  }

  const columns = detectColumns(result.meta.fields ?? [])
  const kgPerWeightUnit = columns.unit === 'lb' ? KG_PER_LB : 1

  // One CSV row per set; a workout is every row sharing a title and start time.
  const workouts = new Map<string, Workout>()

  for (const [i, row] of result.data.entries()) {
    const startText = row.start_time?.trim() ?? ''
    const start = parseHevyDate(startText)
    if (!start) throw new HevyParseError(`Row ${i + 1}: can't read the date "${startText}".`)

    const exercise = toText(row.exercise_title)
    if (!exercise) throw new HevyParseError(`Row ${i + 1}: the exercise name is missing.`)

    const title = toText(row.title) ?? ''
    const key = `${title}\u0000${startText}`
    let workout = workouts.get(key)
    if (!workout) {
      workout = {
        title,
        start,
        end: parseHevyDate(row.end_time ?? ''),
        description: toText(row.description),
        sets: [],
      }
      workouts.set(key, workout)
    }

    const weight = toNumber(row[columns.weight])
    const distance = columns.distance ? toNumber(row[columns.distance]) : null

    const set: WorkoutSet = {
      exercise,
      index: toNumber(row.set_index) ?? 0,
      type: toSetType(row.set_type),
      weightKg: weight === null ? null : weight * kgPerWeightUnit,
      reps: toNumber(row.reps),
      distanceKm: distance === null ? null : distance * columns.kmPerDistanceUnit,
      durationSeconds: toNumber(row.duration_seconds),
      rpe: toNumber(row.rpe),
      supersetId: toNumber(row.superset_id),
      notes: toText(row.exercise_notes),
    }
    workout.sets.push(set)
  }

  if (workouts.size === 0) throw new HevyParseError('This export has no workouts in it.')

  return {
    workouts: [...workouts.values()].sort((a, b) => a.start.getTime() - b.start.getTime()),
    sourceUnit: columns.unit,
  }
}

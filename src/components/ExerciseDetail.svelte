<!--
  One exercise: its bests, progress over time, rep maxes, and every session newest first.
-->
<script lang="ts">
  import {
    formatDate,
    formatDecimal,
    formatDuration,
    formatInteger,
    formatWeight,
  } from '../lib/format'
  import { repRecords, sessions, type Exercise, type Session } from '../lib/metrics/exercise'
  import { workoutIds } from '../lib/metrics/workout'
  import type { Dataset, Unit } from '../lib/parse/types'
  import { href } from '../lib/store/route.svelte'
  import { distanceUnit, fromKg, fromKm } from '../lib/units'
  import ProgressLine, { type Series } from './charts/ProgressLine.svelte'

  let { data, exercise, unit }: { data: Dataset; exercise: Exercise; unit: Unit } = $props()

  const history = $derived(sessions(data, exercise.name))
  const newestFirst = $derived(history.toReversed())

  const weight = (kg: number) => `${formatWeight(fromKg(kg, unit), unit)} ${unit}`
  // e1RM is an estimate, so one decimal is plenty.
  const estimate = (kg: number) => `${formatDecimal(fromKg(kg, unit))} ${unit}`
  const distance = (km: number) => `${formatDecimal(fromKm(km, unit))} ${distanceUnit(unit)}`

  const ids = $derived(workoutIds(data))
  const workoutLink = (date: Date) =>
    href({ view: 'workouts', workout: ids.get(date.getTime()) ?? null })

  /** The session with the highest value, and that value; the earliest wins a tie. */
  function best(value: (session: Session) => number | null) {
    let top: { session: Session; value: number } | null = null
    for (const session of history) {
      const v = value(session)
      if (v !== null && (!top || v > top.value)) top = { session, value: v }
    }
    return top
  }

  // The headline numbers above the chart, in the measures the exercise uses.
  const stats = $derived.by(() => {
    const rows: { label: string; value: string; date?: Date }[] = []
    const add = (label: string, value: string, date?: Date) => rows.push({ label, value, date })

    if (exercise.kind === 'weighted') {
      const e1rmBest = best((s) => s.bestE1rmKg)
      const heaviest = best((s) => s.topSet?.weightKg ?? null)
      if (e1rmBest) add('Best e1RM', estimate(e1rmBest.value), e1rmBest.session.date)
      if (heaviest) {
        const reps = heaviest.session.topSet!.reps
        add(
          'Heaviest',
          `${weight(heaviest.value)}${reps === null ? '' : ` × ${reps}`}`,
          heaviest.session.date,
        )
      }
    } else if (exercise.kind === 'bodyweight') {
      const most = best((s) => s.bestReps)
      if (most) add('Most reps', formatInteger(most.value), most.session.date)
      const total = history.reduce(
        (n, s) => n + s.sets.reduce((m, set) => m + (set.reps ?? 0), 0),
        0,
      )
      add('Total reps', formatInteger(total))
    } else if (exercise.kind === 'timed') {
      const longest = best((s) => s.longestSeconds)
      if (longest) add('Longest', formatDuration(longest.value), longest.session.date)
    } else {
      const longest = best((s) => s.distanceKm)
      if (longest) add('Longest', distance(longest.value), longest.session.date)
      add('Total', distance(history.reduce((n, s) => n + (s.distanceKm ?? 0), 0)))
    }
    add('Sessions', formatInteger(history.length))
    return rows
  })

  const reps = $derived(exercise.kind === 'weighted' ? repRecords(history) : [])

  /** Every working set of a session, compactly: "95 × 6, 95 × 4" or "12, 11, 10". */
  function setsText(session: Session): string {
    // Cardio has one line per session; its time is the useful second number.
    if (exercise.kind === 'cardio') {
      return session.durationSeconds === null ? '' : formatDuration(session.durationSeconds)
    }
    return session.sets
      .map((set) => {
        if (exercise.kind === 'timed') {
          return set.durationSeconds === null ? '' : formatDuration(set.durationSeconds)
        }
        if (set.weightKg === null) return set.reps === null ? '' : String(set.reps)
        const w = formatWeight(fromKg(set.weightKg, unit), unit)
        return set.reps === null ? w : `${w} × ${set.reps}`
      })
      .filter(Boolean)
      .join(', ')
  }

  /** The number a session is judged by: its top set, best reps, longest hold or distance. */
  function headline(session: Session): string {
    if (exercise.kind === 'weighted') {
      const top = session.topSet
      if (!top) return ''
      return `${weight(top.weightKg)}${top.reps === null ? '' : ` × ${top.reps}`}`
    }
    if (exercise.kind === 'bodyweight') {
      return session.bestReps === null ? '' : `${session.bestReps} reps`
    }
    if (exercise.kind === 'timed') {
      return session.longestSeconds === null ? '' : formatDuration(session.longestSeconds)
    }
    return session.distanceKm === null ? '' : distance(session.distanceKm)
  }

  /** Points for the chart, skipping sessions without a value. */
  function points(value: (session: (typeof history)[number]) => number | null): [Date, number][] {
    return history.flatMap((session) => {
      const v = value(session)
      return v === null ? [] : [[session.date, v] as [Date, number]]
    })
  }

  // What to chart depends on how the exercise is measured.
  const chart = $derived.by(() => {
    if (exercise.kind === 'weighted') {
      const series: Series[] = [
        {
          name: 'e1RM',
          points: points((s) => (s.bestE1rmKg === null ? null : fromKg(s.bestE1rmKg, unit))),
        },
        {
          name: 'Top set',
          points: points((s) => (s.topSet === null ? null : fromKg(s.topSet.weightKg, unit))),
        },
      ]
      return {
        // Every set above 12 reps leaves e1RM empty; show only what has data.
        series: series.filter((s) => s.points.length > 0),
        format: (v: number) => `${formatWeight(v, unit)} ${unit}`,
      }
    }
    if (exercise.kind === 'bodyweight') {
      return {
        series: [{ name: 'Best reps', points: points((s) => s.bestReps) }],
        format: (v: number) => `${formatInteger(v)} reps`,
      }
    }
    if (exercise.kind === 'timed') {
      return {
        series: [{ name: 'Longest', points: points((s) => s.longestSeconds) }],
        format: formatDuration,
        axisFormat: formatDuration,
      }
    }
    return {
      series: [
        {
          name: 'Distance',
          points: points((s) => (s.distanceKm === null ? null : fromKm(s.distanceKm, unit))),
        },
      ],
      format: (v: number) => `${formatDecimal(v)} ${distanceUnit(unit)}`,
    }
  })
</script>

<h1>{exercise.name}</h1>

<dl class="stats">
  {#each stats as stat (stat.label)}
    <div>
      <dt>{stat.label}</dt>
      <dd>{stat.value}</dd>
      {#if stat.date}
        <dd class="when">
          <a href={workoutLink(stat.date)}>{formatDate(stat.date)}</a>
        </dd>
      {/if}
    </div>
  {/each}
</dl>

<!-- A line needs two points; with one session the table below says it all. -->
{#if chart.series.some((s) => s.points.length > 1)}
  <ProgressLine
    series={chart.series}
    format={chart.format}
    axisFormat={chart.axisFormat}
    label="{exercise.name} over {history.length} sessions"
  />
{/if}

{#if reps.length > 0}
  <h2>Rep maxes</h2>
  <!-- Wide tables scroll sideways inside their box rather than widening the page on phones. -->
  <div class="table">
    <table class="reps">
      <thead>
        <tr>
          <th>Reps</th>
          <th>Weight</th>
          <th>Date</th>
        </tr>
      </thead>
      <tbody>
        {#each reps as record (record.reps)}
          <tr>
            <td>{record.reps}</td>
            <td>{weight(record.weightKg)}</td>
            <td><a href={workoutLink(record.date)}>{formatDate(record.date)}</a></td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
{/if}

<h2 id="sessions">Sessions</h2>
<!-- Two lines per session: the date and its headline number, then every set, quieter. A list
     rather than a table, so nothing runs off the side of a phone. -->
<ul class="sessions" aria-labelledby="sessions">
  {#each newestFirst as session (`${session.date.getTime()} ${session.workout}`)}
    {@const sets = setsText(session)}
    <li>
      <a href={workoutLink(session.date)}>{formatDate(session.date)}</a>
      <span class="headline">{headline(session)}</span>
      {#if sets}
        <span class="detail">{sets}</span>
      {/if}
      {#if session.bestE1rmKg !== null && exercise.kind === 'weighted'}
        <span class="detail aside">e1RM {estimate(session.bestE1rmKg)}</span>
      {/if}
    </li>
  {/each}
</ul>

<style>
  h1 {
    margin: 0 0 16px;
    font-size: 1.5rem;
    font-weight: 600;
    letter-spacing: -0.01em;
  }

  .stats {
    display: flex;
    flex-wrap: wrap;
    gap: 8px 40px;
    margin: 0 0 24px;
  }

  dt {
    font-size: 0.8125rem;
    opacity: 0.6;
  }

  dd {
    margin: 2px 0 0;
    font-size: 1.375rem;
    font-weight: 300;
    font-variant-numeric: tabular-nums;
  }

  dd.when {
    font-size: 0.8125rem;
    font-weight: 400;
    opacity: 0.6;
  }

  a {
    color: inherit;
    text-decoration: none;
  }

  a:hover {
    text-decoration: underline;
  }

  h2 {
    margin: 32px 0 0;
    font-size: 1.0625rem;
    font-weight: 500;
  }

  /* A short table: no need to stretch three columns across the page. */
  table.reps {
    width: auto;
    min-width: min(100%, 360px);
  }

  .sessions {
    margin: 8px 0 0;
    padding: 0;
    list-style: none;
    font-variant-numeric: tabular-nums;
  }

  .sessions li {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 2px 16px;
    padding: 10px 0;
    border-bottom: 1px solid color-mix(in srgb, var(--text) 8%, transparent);
  }

  .headline,
  .aside {
    text-align: right;
    white-space: nowrap;
  }

  /* Every set, which can run long, wraps under the date. */
  .detail {
    grid-column: 1;
    font-size: 0.875rem;
    opacity: 0.6;
  }

  .detail.aside {
    grid-column: 2;
  }

  .table {
    margin-top: 8px;
    overflow-x: auto;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-variant-numeric: tabular-nums;
  }

  th,
  td {
    padding: 10px 12px 10px 0;
    text-align: left;
    white-space: nowrap;
    border-bottom: 1px solid color-mix(in srgb, var(--text) 8%, transparent);
  }

  th {
    font-size: 0.875rem;
    font-weight: 500;
    opacity: 0.6;
  }

  /* Numbers line up on the right; the date stays on the left. */
  th:not(:first-child),
  td:not(:first-child) {
    text-align: right;
  }
</style>

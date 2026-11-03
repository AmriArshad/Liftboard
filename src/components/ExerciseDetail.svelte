<!-- One exercise: progress over time and every session, newest first. -->
<script lang="ts">
  import {
    formatDate,
    formatDecimal,
    formatDuration,
    formatInteger,
    formatWeight,
  } from '../lib/format'
  import { sessions, type Exercise } from '../lib/metrics/exercise'
  import type { Dataset, Unit } from '../lib/parse/types'
  import { distanceUnit, fromKg, fromKm } from '../lib/units'
  import ProgressLine, { type Series } from './charts/ProgressLine.svelte'

  let { data, exercise, unit }: { data: Dataset; exercise: Exercise; unit: Unit } = $props()

  const history = $derived(sessions(data, exercise.name))
  const newestFirst = $derived(history.toReversed())

  const weight = (kg: number) => `${formatWeight(fromKg(kg, unit))} ${unit}`
  // e1RM is an estimate, so one decimal is plenty.
  const estimate = (kg: number) => `${formatDecimal(fromKg(kg, unit))} ${unit}`
  const distance = (km: number) => `${formatDecimal(fromKm(km, unit))} ${distanceUnit(unit)}`

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
        format: (v: number) => `${formatWeight(v)} ${unit}`,
      }
    }
    if (exercise.kind === 'bodyweight') {
      return {
        series: [{ name: 'Best reps', points: points((s) => s.bestReps) }],
        format: (v: number) => `${formatInteger(v)} reps`,
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

<ProgressLine
  series={chart.series}
  format={chart.format}
  label="{exercise.name} over {history.length} sessions"
/>

<!-- Wide tables scroll sideways inside this box rather than widening the page on phones. -->
<div class="table">
  <table>
    <thead>
      <tr>
        <th>Date</th>
        {#if exercise.kind === 'weighted'}
          <th>Top set</th>
          <th>e1RM</th>
          <th>Sets</th>
        {:else if exercise.kind === 'bodyweight'}
          <th>Best</th>
          <th>Sets</th>
        {:else}
          <th>Distance</th>
          <th>Time</th>
        {/if}
      </tr>
    </thead>
    <tbody>
      {#each newestFirst as session (`${session.date.getTime()} ${session.workout}`)}
        <tr>
          <td>{formatDate(session.date)}</td>
          {#if exercise.kind === 'weighted'}
            <td>
              {#if session.topSet}
                {weight(session.topSet.weightKg)}{session.topSet.reps === null
                  ? ''
                  : ` × ${session.topSet.reps}`}
              {/if}
            </td>
            <td>{session.bestE1rmKg === null ? '' : estimate(session.bestE1rmKg)}</td>
            <td>{session.sets.length}</td>
          {:else if exercise.kind === 'bodyweight'}
            <td>{session.bestReps === null ? '' : `${session.bestReps} reps`}</td>
            <td>{session.sets.length}</td>
          {:else}
            <td>{session.distanceKm === null ? '' : distance(session.distanceKm)}</td>
            <td>
              {session.durationSeconds === null ? '' : formatDuration(session.durationSeconds)}
            </td>
          {/if}
        </tr>
      {/each}
    </tbody>
  </table>
</div>

<style>
  h1 {
    margin: 0 0 16px;
    font-size: 1.5rem;
    font-weight: 600;
    letter-spacing: -0.01em;
  }

  .table {
    margin-top: 32px;
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

<!-- One workout in full: when, how long, totals, then every exercise with every set. -->
<script lang="ts">
  import {
    formatDecimal,
    formatDuration,
    formatFullDate,
    formatInteger,
    formatMinutes,
    formatTime,
    formatTimeRange,
    formatWeight,
  } from '../lib/format'
  import { personalRecords, type RecordKind } from '../lib/metrics/progress'
  import { workoutExercises, type SetRow, type WorkoutSummary } from '../lib/metrics/workout'
  import type { Dataset, Unit } from '../lib/parse/types'
  import { href } from '../lib/store/route.svelte'
  import { distanceUnit, fromKg, fromKm } from '../lib/units'

  let { data, summary, unit }: { data: Dataset; summary: WorkoutSummary; unit: Unit } = $props()

  const workout = $derived(summary.workout)
  const records = $derived(personalRecords(data))
  const entries = $derived(workoutExercises(data, workout, records))
  const recordCount = $derived(
    entries.reduce((n, e) => n + e.sets.filter((s) => s.records.length > 0).length, 0),
  )

  const KIND_LABELS: Record<RecordKind, string> = { e1rm: 'e1RM', weight: 'Weight', reps: 'Reps' }

  /** What was done in a set, in the measures the exercise uses. */
  function setText({ set }: SetRow): string {
    const parts: string[] = []
    if (set.weightKg !== null) {
      const weight = `${formatWeight(fromKg(set.weightKg, unit), unit)} ${unit}`
      parts.push(set.reps === null ? weight : `${weight} × ${set.reps}`)
    } else if (set.reps !== null) {
      parts.push(`${set.reps} reps`)
    }
    if (set.distanceKm !== null) {
      parts.push(`${formatDecimal(fromKm(set.distanceKm, unit))} ${distanceUnit(unit)}`)
    }
    if (set.durationSeconds !== null) parts.push(formatDuration(set.durationSeconds))
    return parts.join(' · ')
  }

  const when = $derived(
    workout.end && workout.end > workout.start
      ? formatTimeRange(workout.start, workout.end)
      : formatTime(workout.start),
  )
</script>

<h1>{workout.title || 'Workout'}</h1>
<p class="when">{formatFullDate(workout.start)} · {when}</p>
{#if workout.description}
  <p class="description">{workout.description}</p>
{/if}

<dl class="stats">
  {#if summary.minutes !== null}
    <div>
      <dt>Duration</dt>
      <dd>{formatMinutes(summary.minutes)}</dd>
    </div>
  {/if}
  <div>
    <dt>Volume</dt>
    <dd>{formatInteger(fromKg(summary.volumeKg, unit))} {unit}</dd>
  </div>
  <div>
    <dt>Sets</dt>
    <dd>{summary.sets}</dd>
  </div>
  <div>
    <dt>Records</dt>
    <dd>{recordCount}</dd>
  </div>
</dl>

{#each entries as entry, i (`${i} ${entry.name}`)}
  <section class="exercise" class:superset={entry.superset !== null}>
    <h2>
      <a href={href({ view: 'exercises', exercise: entry.name })}>{entry.name}</a>
      {#if entry.superset}
        <span class="tag">Superset {entry.superset}</span>
      {/if}
    </h2>
    {#if entry.notes}
      <p class="notes">{entry.notes}</p>
    {/if}
    <table>
      <thead>
        <tr>
          <th class="label">Set</th>
          <th>{entry.kind === 'cardio' || entry.kind === 'timed' ? 'Done' : 'Lifted'}</th>
          <th>e1RM</th>
          <th>RPE</th>
          <th><span class="visually-hidden">Records</span></th>
        </tr>
      </thead>
      <tbody>
        {#each entry.sets as row, j (j)}
          <tr class:warmup={row.set.type === 'warmup'}>
            <td class="label">{row.label}</td>
            <td>{setText(row)}</td>
            <td>{row.e1rmKg === null ? '' : `${formatDecimal(fromKg(row.e1rmKg, unit))}`}</td>
            <td>{row.set.rpe ?? ''}</td>
            <td class="records">
              {#each row.records as kind (kind)}
                <span class="badge">{KIND_LABELS[kind]}</span>
              {/each}
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </section>
{/each}

<style>
  h1 {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 600;
    letter-spacing: -0.01em;
  }

  p {
    margin: 0;
  }

  .when {
    margin-top: 4px;
    opacity: 0.6;
  }

  .description {
    max-width: 60ch;
    margin-top: 12px;
    line-height: 1.5;
    white-space: pre-line;
  }

  .stats {
    display: flex;
    flex-wrap: wrap;
    gap: 8px 40px;
    margin: 24px 0 8px;
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

  /* Tighter on phones, so all four numbers share one line instead of leaving one alone. */
  @media (max-width: 519px) {
    .stats {
      gap: 8px 24px;
    }

    dd {
      font-size: 1.25rem;
    }
  }

  .exercise {
    margin-top: 32px;
  }

  /* A thin rule down the side ties a superset's exercises together. */
  .exercise.superset {
    padding-left: 14px;
    border-left: 2px solid var(--border);
  }

  h2 {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 4px 10px;
    margin: 0 0 8px;
    font-size: 1.0625rem;
    font-weight: 500;
  }

  h2 a {
    color: inherit;
    text-decoration: none;
  }

  h2 a:hover {
    text-decoration: underline;
  }

  .tag {
    font-size: 0.75rem;
    font-weight: 500;
    opacity: 0.6;
  }

  .notes {
    max-width: 60ch;
    margin-bottom: 8px;
    font-size: 0.875rem;
    line-height: 1.5;
    opacity: 0.75;
    white-space: pre-line;
  }

  /* Fixed columns so every exercise's table lines up with the next. */
  table {
    width: 100%;
    table-layout: fixed;
    border-collapse: collapse;
    font-variant-numeric: tabular-nums;
  }

  th,
  td {
    padding: 8px 12px 8px 0;
    text-align: right;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    border-bottom: 1px solid color-mix(in srgb, var(--text) 8%, transparent);
  }

  th {
    font-size: 0.8125rem;
    font-weight: 500;
    opacity: 0.6;
  }

  th:nth-child(1) {
    width: 44px;
  }

  th:nth-child(2) {
    width: auto;
  }

  th:nth-child(3) {
    width: 72px;
  }

  th:nth-child(4) {
    width: 52px;
  }

  th:nth-child(5) {
    width: 132px;
  }

  .label,
  td:nth-child(2),
  th:nth-child(2) {
    text-align: left;
  }

  .label {
    opacity: 0.6;
  }

  tr.warmup td {
    opacity: 0.5;
  }

  td.records {
    padding-right: 0;
  }

  /* PR highlights are one of the few places the accent appears. */
  .badge {
    display: inline-block;
    margin-left: 4px;
    padding: 2px 8px;
    border-radius: 999px;
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--on-accent);
    background: var(--accent);
  }

  .visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
  }

  @media (max-width: 519px) {
    th:nth-child(3),
    td:nth-child(3) {
      display: none;
    }

    th:nth-child(5) {
      width: 64px;
    }

    /* Two badges don't fit beside the set on a phone; stack them. */
    td.records {
      white-space: normal;
    }
  }
</style>

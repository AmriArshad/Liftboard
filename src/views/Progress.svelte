<!-- Stalled lifts first (the part worth acting on), then every personal record, newest first. -->
<script lang="ts">
  import { formatDate, formatDecimal, formatWeight } from '../lib/format'
  import { personalRecords, stalledLifts, type RecordKind } from '../lib/metrics/progress'
  import { workoutIds } from '../lib/metrics/workout'
  import type { Dataset, Unit } from '../lib/parse/types'
  import { href } from '../lib/store/route.svelte'
  import { fromKg } from '../lib/units'

  let { data, unit }: { data: Dataset; unit: Unit } = $props()

  const stalled = $derived(stalledLifts(data))
  const records = $derived(personalRecords(data))

  // The list can run to hundreds; show the latest few until asked for the rest.
  const PREVIEW = 20
  let showAll = $state(false)
  const shown = $derived(showAll ? records : records.slice(0, PREVIEW))

  // Records come newest first, so those from one workout sit next to each other.
  const days = $derived.by(() => {
    const groups: { date: Date; records: typeof shown }[] = []
    for (const record of shown) {
      const last = groups.at(-1)
      if (last?.date.getTime() === record.date.getTime()) last.records.push(record)
      else groups.push({ date: record.date, records: [record] })
    }
    return groups
  })

  const KIND_LABELS: Record<RecordKind, string> = { e1rm: 'e1RM', weight: 'Weight', reps: 'Reps' }

  function setText(weightKg: number | null, reps: number | null): string {
    if (weightKg === null) return reps === null ? '' : `${reps} reps`
    const weight = `${formatWeight(fromKg(weightKg, unit), unit)} ${unit}`
    return reps === null ? weight : `${weight} × ${reps}`
  }

  const exerciseLink = (exercise: string) => href({ view: 'exercises', exercise })
  const ids = $derived(workoutIds(data))
  const workoutLink = (date: Date) =>
    href({ view: 'workouts', workout: ids.get(date.getTime()) ?? null })
</script>

<main>
  <section>
    <h1>Stalled</h1>
    {#if stalled.length === 0}
      <p class="empty">Nothing stalled in the last 6 weeks.</p>
    {:else}
      <ul class="stalled">
        {#each stalled as lift (lift.exercise)}
          <li>
            <a href={exerciseLink(lift.exercise)}>{lift.exercise}</a>
            <span>
              {formatDecimal(fromKg(lift.bestE1rmKg, unit))}
              {unit} e1RM since {formatDate(lift.since)}
            </span>
          </li>
        {/each}
      </ul>
    {/if}
  </section>

  <section aria-labelledby="records">
    <h1 id="records">Personal records</h1>
    {#if records.length === 0}
      <p class="empty">No records yet.</p>
    {:else}
      <!-- Records grouped under the workout they were set in, so each date reads once. -->
      {#each days as day (day.date.getTime())}
        <h2><a href={workoutLink(day.date)}>{formatDate(day.date)}</a></h2>
        <ul class="records">
          {#each day.records as record (record.exercise)}
            <li>
              <a href={exerciseLink(record.exercise)}>{record.exercise}</a>
              <span class="set">{setText(record.weightKg, record.reps)}</span>
              <span class="kinds">
                {#each record.kinds as kind (kind)}
                  <span class="badge">{KIND_LABELS[kind]}</span>
                {/each}
              </span>
            </li>
          {/each}
        </ul>
      {/each}
      {#if records.length > PREVIEW}
        <button type="button" onclick={() => (showAll = !showAll)}>
          {showAll ? 'Show fewer' : `Show all ${records.length}`}
        </button>
      {/if}
    {/if}
  </section>
</main>

<style>
  main {
    display: grid;
    /* minmax(0, …) lets the column shrink below its content's width, so nothing widens
       the page on phones. */
    grid-template-columns: minmax(0, 1fr);
    gap: 48px;
    max-width: var(--page-width);
    margin: 0 auto;
    padding: 16px 16px 64px;
  }

  h1 {
    margin: 0 0 16px;
    font-size: 1.25rem;
    font-weight: 600;
  }

  a {
    color: inherit;
    text-decoration: none;
  }

  a:hover {
    text-decoration: underline;
  }

  .empty {
    margin: 0;
    opacity: 0.6;
  }

  .stalled {
    display: grid;
    gap: 8px;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .stalled li {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    gap: 4px 16px;
    padding: 12px 16px;
    border: 1px solid color-mix(in srgb, var(--text) 12%, transparent);
    border-radius: 12px;
  }

  .stalled a {
    font-weight: 500;
  }

  .stalled span {
    opacity: 0.6;
    font-variant-numeric: tabular-nums;
  }

  h2 {
    margin: 24px 0 4px;
    font-size: 0.8125rem;
    font-weight: 500;
    opacity: 0.6;
  }

  h2:first-of-type {
    margin-top: 0;
  }

  .records {
    margin: 0;
    padding: 0;
    list-style: none;
    font-variant-numeric: tabular-nums;
  }

  /* The exercise on the left and the set on the right; the badges sit under the set, so a
     long name never pushes the numbers off a phone screen. */
  .records li {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 4px 16px;
    align-items: baseline;
    padding: 10px 0;
    border-bottom: 1px solid color-mix(in srgb, var(--text) 8%, transparent);
  }

  .records .set {
    text-align: right;
    white-space: nowrap;
  }

  .records .kinds {
    grid-column: 2;
    display: flex;
    justify-content: flex-end;
    gap: 4px;
  }

  /* PR highlights are one of the few places the accent appears. */
  .badge {
    padding: 2px 8px;
    border-radius: 999px;
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--on-accent);
    background: var(--accent);
  }

  button {
    margin-top: 12px;
    padding: 8px 0;
    border: 0;
    font: inherit;
    color: inherit;
    background: none;
    opacity: 0.7;
    cursor: pointer;
  }

  button:hover {
    opacity: 1;
    text-decoration: underline;
  }
</style>

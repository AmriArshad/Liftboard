<!-- Stalled lifts first (the part worth acting on), then every personal record, newest first. -->
<script lang="ts">
  import { formatDate, formatDecimal, formatWeight } from '../lib/format'
  import { personalRecords, stalledLifts, type RecordKind } from '../lib/metrics/progress'
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

  const KIND_LABELS: Record<RecordKind, string> = { e1rm: 'e1RM', weight: 'Weight', reps: 'Reps' }

  function setText(weightKg: number | null, reps: number | null): string {
    if (weightKg === null) return reps === null ? '' : `${reps} reps`
    const weight = `${formatWeight(fromKg(weightKg, unit))} ${unit}`
    return reps === null ? weight : `${weight} × ${reps}`
  }

  const exerciseLink = (exercise: string) => href({ view: 'exercises', exercise })
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

  <section>
    <h1>Personal records</h1>
    {#if records.length === 0}
      <p class="empty">No records yet.</p>
    {:else}
      <div class="table">
        <table>
          <tbody>
            {#each shown as record (`${record.date.getTime()} ${record.exercise}`)}
              <tr>
                <td class="date">{formatDate(record.date)}</td>
                <td><a href={exerciseLink(record.exercise)}>{record.exercise}</a></td>
                <td class="set">{setText(record.weightKg, record.reps)}</td>
                <td class="kinds">
                  {#each record.kinds as kind (kind)}
                    <span class="badge">{KIND_LABELS[kind]}</span>
                  {/each}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
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
    /* minmax(0, …) lets the column shrink below the table's width, so the table scrolls
       inside its own box instead of widening the page on phones. */
    grid-template-columns: minmax(0, 1fr);
    gap: 48px;
    max-width: 960px;
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

  .table {
    overflow-x: auto;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-variant-numeric: tabular-nums;
  }

  td {
    padding: 10px 12px 10px 0;
    border-bottom: 1px solid color-mix(in srgb, var(--text) 8%, transparent);
    white-space: nowrap;
  }

  td.date {
    opacity: 0.6;
  }

  td.set,
  td.kinds {
    text-align: right;
  }

  td.kinds {
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

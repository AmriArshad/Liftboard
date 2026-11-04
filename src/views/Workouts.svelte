<!-- Every workout, newest first and grouped by month, beside the selected one in full. -->
<script lang="ts">
  import { MediaQuery } from 'svelte/reactivity'
  import Explorer from '../components/Explorer.svelte'
  import WorkoutDetail from '../components/WorkoutDetail.svelte'
  import { formatDate, formatMonth } from '../lib/format'
  import { workoutSummaries, type WorkoutSummary } from '../lib/metrics/workout'
  import type { Dataset, Unit } from '../lib/parse/types'
  import { href } from '../lib/store/route.svelte'

  let { data, unit, selected }: { data: Dataset; unit: Unit; selected: string | null } = $props()

  const all = $derived(workoutSummaries(data))

  // A workout matches when every word appears in its name, an exercise, or its month.
  let query = $state('')
  const matches = $derived.by(() => {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean)
    if (words.length === 0) return all
    return all.filter((summary) => {
      const text = [summary.workout.title, formatMonth(summary.workout.start), ...summary.exercises]
        .join(' ')
        .toLowerCase()
      return words.every((word) => text.includes(word))
    })
  })

  // Consecutive workouts in the same month share a heading.
  const months = $derived.by(() => {
    const groups: { label: string; workouts: WorkoutSummary[] }[] = []
    for (const summary of matches) {
      const label = formatMonth(summary.workout.start)
      const last = groups.at(-1)
      if (last?.label === label) last.workouts.push(summary)
      else groups.push({ label, workouts: [summary] })
    }
    return groups
  })

  function openFirst() {
    const [first] = matches
    if (first) location.hash = href({ view: 'workouts', workout: first.id })
  }

  const wide = new MediaQuery('min-width: 768px')

  // With room for both columns, show the latest workout rather than an empty side.
  const current = $derived(
    all.find((s) => s.id === selected) ?? (wide.current ? all[0] : undefined),
  )
</script>

<Explorer
  name="Workouts"
  bind:query
  onsubmit={openFirst}
  showingDetail={selected !== null}
  backHref={href({ view: 'workouts', workout: null })}
  detail={current ? detail : undefined}
>
  {#snippet list()}
    <nav aria-label="Workouts">
      {#each months as month (month.label)}
        <h2>{month.label}</h2>
        <ul>
          {#each month.workouts as summary (summary.id)}
            <li>
              <a
                href={href({ view: 'workouts', workout: summary.id })}
                aria-current={summary === current ? 'page' : undefined}
              >
                {summary.workout.title || 'Workout'}
                <span>{formatDate(summary.workout.start)}</span>
              </a>
            </li>
          {/each}
        </ul>
      {/each}
    </nav>
  {/snippet}
</Explorer>

{#snippet detail()}
  {#if current}
    <WorkoutDetail {data} summary={current} {unit} />
  {/if}
{/snippet}

<style>
  h2 {
    margin: 16px 12px 4px;
    font-size: 0.75rem;
    font-weight: 500;
    opacity: 0.6;
  }

  h2:first-child {
    margin-top: 4px;
  }

  /* The date sits under the name, quieter. */
  a span {
    display: block;
    font-size: 0.8125rem;
    opacity: 0.7;
  }
</style>

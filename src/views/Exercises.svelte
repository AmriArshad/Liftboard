<!-- The exercise explorer: a searchable list of exercises and the selected one's history. -->
<script lang="ts">
  import { MediaQuery } from 'svelte/reactivity'
  import ExerciseDetail from '../components/ExerciseDetail.svelte'
  import Explorer from '../components/Explorer.svelte'
  import { exercises } from '../lib/metrics/exercise'
  import type { Dataset, Unit } from '../lib/parse/types'
  import { href } from '../lib/store/route.svelte'

  let { data, unit, selected }: { data: Dataset; unit: Unit; selected: string | null } = $props()

  const all = $derived(exercises(data))

  let query = $state('')
  const matches = $derived.by(() => {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean)
    return all.filter((e) => words.every((word) => e.name.toLowerCase().includes(word)))
  })

  // Enter opens the first match, so typing a few letters is enough to jump to a lift.
  function openFirst() {
    const [first] = matches
    if (first) location.hash = href({ view: 'exercises', exercise: first.name })
  }

  // A reactive media query: `wide.current` updates when the window crosses the breakpoint.
  const wide = new MediaQuery('min-width: 768px')

  // With room for both columns, fall back to the most recently trained exercise
  // rather than leaving the detail side empty.
  const current = $derived(
    all.find((e) => e.name === selected) ?? (wide.current ? all[0] : undefined),
  )
</script>

<!-- bind:query keeps `query` here in step with the search box inside Explorer. -->
<Explorer
  name="Exercises"
  bind:query
  onsubmit={openFirst}
  showingDetail={selected !== null}
  backHref={href({ view: 'exercises', exercise: null })}
  detail={current ? detail : undefined}
>
  {#snippet list()}
    <ul aria-label="Exercises">
      {#each matches as exercise (exercise.name)}
        <li>
          <a
            href={href({ view: 'exercises', exercise: exercise.name })}
            aria-current={exercise === current ? 'page' : undefined}>{exercise.name}</a
          >
        </li>
      {/each}
    </ul>
  {/snippet}
</Explorer>

{#snippet detail()}
  <!-- {#key} rebuilds the detail when the exercise changes, so charts start fresh. -->
  {#if current}
    {#key current.name}
      <ExerciseDetail {data} exercise={current} {unit} />
    {/key}
  {/if}
{/snippet}

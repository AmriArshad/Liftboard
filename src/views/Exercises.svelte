<!--
  The exercise explorer: a searchable list and the selected exercise's detail.
  Side by side on wide screens; on phones, the list first, then the detail on its own.
-->
<script lang="ts">
  import { MediaQuery } from 'svelte/reactivity'
  import ExerciseDetail from '../components/ExerciseDetail.svelte'
  import { exercises } from '../lib/metrics/exercise'
  import type { Dataset, Unit } from '../lib/parse/types'
  import { href } from '../lib/store/route.svelte'

  let { data, unit, selected }: { data: Dataset; unit: Unit; selected: string | null } = $props()

  const all = $derived(exercises(data))

  // bind:value on the input below keeps this in sync both ways, like a controlled input in
  // React without the onChange handler.
  let query = $state('')
  const matches = $derived.by(() => {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean)
    return all.filter((e) => words.every((word) => e.name.toLowerCase().includes(word)))
  })

  // Enter opens the first match, so typing a few letters is enough to jump to a lift.
  function onsubmit(event: SubmitEvent) {
    event.preventDefault()
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

<main class:showing-detail={current !== undefined && selected !== null}>
  <section class="picker">
    <form role="search" {onsubmit}>
      <input type="search" placeholder="Search" aria-label="Search exercises" bind:value={query} />
    </form>
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
  </section>

  {#if current}
    <section class="detail">
      <a class="back" href={href({ view: 'exercises', exercise: null })}>← Exercises</a>
      <!-- {#key} rebuilds the detail when the exercise changes, so charts start fresh. -->
      {#key current.name}
        <ExerciseDetail {data} exercise={current} {unit} />
      {/key}
    </section>
  {/if}
</main>

<style>
  main {
    display: grid;
    grid-template-columns: 240px minmax(0, 1fr);
    gap: 40px;
    max-width: var(--page-width);
    margin: 0 auto;
    padding: 16px 16px 64px;
  }

  .picker {
    position: sticky;
    top: 16px;
    align-self: start;
    display: grid;
    gap: 8px;
    max-height: calc(100dvh - 32px);
    min-height: 0;
    grid-template-rows: auto minmax(0, 1fr);
  }

  input {
    width: 100%;
    padding: 8px 12px;
    border: 1px solid color-mix(in srgb, var(--text) 20%, transparent);
    border-radius: 8px;
    font: inherit;
    color: inherit;
    background: transparent;
  }

  input:focus {
    outline: 2px solid var(--text);
    outline-offset: 1px;
  }

  ul {
    margin: 0;
    padding: 0;
    overflow-y: auto;
    list-style: none;
  }

  li a {
    display: block;
    padding: 8px 12px;
    border-radius: 8px;
    color: inherit;
    text-decoration: none;
  }

  li a:hover {
    background: color-mix(in srgb, var(--text) 6%, transparent);
  }

  li a[aria-current='page'] {
    color: var(--on-accent);
    background: var(--accent);
  }

  .back {
    display: none;
  }

  @media (max-width: 767px) {
    main {
      grid-template-columns: minmax(0, 1fr);
    }

    .picker {
      position: static;
      max-height: none;
    }

    /* On phones the list and the detail take turns. */
    main.showing-detail .picker {
      display: none;
    }

    .back {
      display: inline-block;
      margin-bottom: 16px;
      color: inherit;
      text-decoration: none;
      opacity: 0.6;
    }
  }
</style>

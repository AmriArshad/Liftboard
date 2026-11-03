<script lang="ts">
  import { parseFile } from '../lib/parse/load'
  import { dataset } from '../lib/store/dataset.svelte'

  // $state makes a plain variable reactive: assign to it and the markup updates.
  // Unlike React's useState there's no setter function; just reassign.
  let dragging = $state(false)
  let loading = $state(false)
  let error = $state<string | null>(null)

  async function load(file: Blob | undefined) {
    if (!file || loading) return
    loading = true
    error = null
    try {
      dataset.set(await parseFile(file))
    } catch (e) {
      error = e instanceof Error ? e.message : "Couldn't read this file."
    } finally {
      loading = false
    }
  }

  async function loadDemo() {
    // Same-origin static file: a request for the demo, never for the user's data.
    const response = await fetch('/demo.csv')
    await load(await response.blob())
  }

  // The whole window is the drop target, so a file dropped anywhere is read
  // instead of the browser navigating away to open it.
  function ondragover(event: DragEvent) {
    event.preventDefault()
    dragging = true
  }

  function ondragleave(event: DragEvent) {
    // relatedTarget is null only when the drag leaves the window, not when it crosses child elements.
    if (!event.relatedTarget) dragging = false
  }

  function ondrop(event: DragEvent) {
    event.preventDefault()
    dragging = false
    load(event.dataTransfer?.files[0])
  }

  function onchange(event: Event & { currentTarget: HTMLInputElement }) {
    load(event.currentTarget.files?.[0])
    // Reset so choosing the same file again (after fixing it) still fires change.
    event.currentTarget.value = ''
  }
</script>

<svelte:window {ondragover} {ondragleave} {ondrop} />

<main>
  <h1>
    <picture>
      <source srcset="/brand/logo-dark.svg" media="(prefers-color-scheme: dark)" />
      <img src="/brand/logo-light.svg" alt="liftboard" width="300" height="72" />
    </picture>
  </h1>

  <!-- A <label> around the input makes the whole zone open the file picker, with no click handler. -->
  <label class="drop" class:dragging aria-busy={loading}>
    <input type="file" accept=".csv,text/csv" disabled={loading} {onchange} />
    {#if loading}
      Reading…
    {:else}
      <span class="pointer">Drop your Hevy CSV</span>
      <span class="touch">Choose your Hevy CSV</span>
    {/if}
  </label>

  {#if error}
    <p class="error" role="alert">{error}</p>
  {/if}

  <button type="button" onclick={loadDemo} disabled={loading}>Try the demo</button>
</main>

<style>
  main {
    display: grid;
    justify-items: center;
    align-content: center;
    gap: 24px;
    min-height: 100dvh;
    padding: 16px;
  }

  h1 {
    margin: 0 0 16px;
  }

  img {
    display: block;
    width: 200px;
    height: auto;
  }

  .drop {
    position: relative;
    display: grid;
    place-items: center;
    width: min(100%, 420px);
    height: 200px;
    border: 1.5px dashed color-mix(in srgb, var(--text) 25%, transparent);
    border-radius: 16px;
    font-weight: 500;
    cursor: pointer;
    transition:
      border-color 120ms,
      background-color 120ms;
  }

  .drop:hover,
  .drop:focus-within {
    border-color: color-mix(in srgb, var(--text) 50%, transparent);
  }

  .drop:focus-within {
    outline: 2px solid var(--text);
    outline-offset: 2px;
  }

  .drop.dragging {
    border-style: solid;
    border-color: var(--text);
    background: color-mix(in srgb, var(--accent) 20%, transparent);
  }

  .drop[aria-busy='true'] {
    cursor: progress;
  }

  /* Visually hidden but still focusable and usable by screen readers and tests. */
  input {
    position: absolute;
    width: 1px;
    height: 1px;
    opacity: 0;
  }

  /* Phones can't drag files, so say "Choose" there. */
  .touch {
    display: none;
  }

  @media (hover: none) {
    .pointer {
      display: none;
    }
    .touch {
      display: inline;
    }
  }

  .error {
    margin: 0;
    color: var(--error);
  }

  button {
    padding: 8px 12px;
    border: 0;
    border-radius: 8px;
    font: inherit;
    color: inherit;
    background: none;
    opacity: 0.7;
    cursor: pointer;
  }

  button:hover:not(:disabled) {
    opacity: 1;
    text-decoration: underline;
  }

  button:disabled {
    cursor: progress;
  }
</style>

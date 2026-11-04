<!-- Everything shown once a dataset is loaded: the header with navigation, then the current view. -->
<script lang="ts">
  import Logo from '../components/Logo.svelte'
  import Segmented from '../components/Segmented.svelte'
  import type { Dataset } from '../lib/parse/types'
  import { dataset } from '../lib/store/dataset.svelte'
  import { href, route, type Route } from '../lib/store/route.svelte'
  import { unitPreference } from '../lib/store/units.svelte'
  import Exercises from './Exercises.svelte'
  import Overview from './Overview.svelte'
  import Progress from './Progress.svelte'

  let { data }: { data: Dataset } = $props()

  // The user's choice if they've made one, otherwise whatever the export used.
  const unit = $derived(unitPreference.current ?? data.sourceUnit)

  const links: { label: string; to: Route }[] = [
    { label: 'Overview', to: { view: 'overview' } },
    { label: 'Exercises', to: { view: 'exercises', exercise: null } },
    { label: 'Progress', to: { view: 'progress' } },
  ]

  // Clearing can't be undone, so the first click only asks; a second click within a few
  // seconds clears. Quieter than a dialog, and just as hard to do by accident.
  let confirming = $state(false)
  let timer: ReturnType<typeof setTimeout> | undefined

  async function clear() {
    if (!confirming) {
      confirming = true
      timer = setTimeout(() => (confirming = false), 4000)
      return
    }
    clearTimeout(timer)
    await dataset.clear()
    // Back to the upload screen, starting from the overview next time.
    location.hash = href({ view: 'overview' })
  }
</script>

<header>
  <a href={href({ view: 'overview' })} class="home">
    <span class="wordmark"><Logo height={32} /></span>
    <!-- Phones get the square icon so all three links fit. -->
    <span class="icon"><Logo height={32} mark /></span>
  </a>
  <nav>
    {#each links as link (link.label)}
      <a
        href={href(link.to)}
        aria-current={route.current.view === link.to.view ? 'page' : undefined}
      >
        {link.label}
      </a>
    {/each}
  </nav>
</header>

{#if route.current.view === 'exercises'}
  <Exercises {data} {unit} selected={route.current.exercise} />
{:else if route.current.view === 'progress'}
  <Progress {data} {unit} />
{:else}
  <Overview {data} {unit} />
{/if}

<footer>
  <Segmented
    legend="Units"
    options={[
      { value: 'kg', label: 'kg' },
      { value: 'lb', label: 'lb' },
    ]}
    value={unit}
    onchange={unitPreference.set}
  />
  <button type="button" class:confirming onclick={clear} onblur={() => (confirming = false)}>
    {confirming ? 'Click again to clear' : 'Clear my data'}
  </button>
</footer>

<style>
  header,
  footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    max-width: var(--page-width);
    margin: 0 auto;
  }

  header {
    padding: 20px 16px 12px;
  }

  footer {
    padding: 0 16px 32px;
  }

  footer button {
    padding: 8px 0;
    border: 0;
    font: inherit;
    font-size: 0.875rem;
    color: inherit;
    background: none;
    opacity: 0.6;
    cursor: pointer;
  }

  footer button:hover,
  footer button.confirming {
    opacity: 1;
    text-decoration: underline;
  }

  footer button.confirming {
    color: var(--error);
  }

  .home {
    color: inherit;
    text-decoration: none;
    flex-shrink: 0;
    border-radius: 8px;
  }

  .icon {
    display: none;
  }

  nav {
    display: flex;
    gap: 2px;
  }

  nav a {
    padding: 6px 12px;
    border-radius: 8px;
    color: inherit;
    font-size: 0.9375rem;
    font-weight: 500;
    line-height: 20px;
    text-decoration: none;
    opacity: 0.6;
    transition:
      opacity 120ms,
      background-color 120ms;
  }

  nav a:hover {
    opacity: 1;
    background: color-mix(in srgb, var(--text) 6%, transparent);
  }

  /* The current page is a quiet raised pill; the lime dot is the one touch of accent. */
  nav a[aria-current='page'] {
    opacity: 1;
    background: var(--surface);
    box-shadow: inset 0 0 0 1px var(--border);
  }

  nav a[aria-current='page']::before {
    content: '';
    display: inline-block;
    width: 6px;
    height: 6px;
    margin-right: 8px;
    border-radius: 50%;
    vertical-align: 2px;
    background: var(--accent);
  }

  @media (prefers-color-scheme: light) {
    /* Lime on a pale pill is too faint; near-black reads as the same marker. */
    nav a[aria-current='page']::before {
      background: var(--text);
    }
  }

  @media (max-width: 519px) {
    .wordmark {
      display: none;
    }

    .icon {
      display: block;
    }

    nav a {
      padding: 6px 10px;
    }
  }
</style>

<!-- Everything shown once a dataset is loaded: the header with navigation, then the current view. -->
<script lang="ts">
  import Logo from '../components/Logo.svelte'
  import type { Dataset } from '../lib/parse/types'
  import { dataset } from '../lib/store/dataset.svelte'
  import { href, route, type Route } from '../lib/store/route.svelte'
  import Exercises from './Exercises.svelte'
  import Overview from './Overview.svelte'
  import Progress from './Progress.svelte'

  let { data }: { data: Dataset } = $props()

  const links: { label: string; to: Route }[] = [
    { label: 'Overview', to: { view: 'overview' } },
    { label: 'Exercises', to: { view: 'exercises', exercise: null } },
    { label: 'Progress', to: { view: 'progress' } },
  ]

  function clear() {
    // Back to the upload screen, starting from the overview next time.
    location.hash = href({ view: 'overview' })
    dataset.clear()
  }
</script>

<header>
  <a href={href({ view: 'overview' })} class="home">
    <span class="wordmark"><Logo width={120} /></span>
    <!-- Phones get the square icon so all three links fit. -->
    <img class="icon" src="/brand/icon.svg" alt="liftboard" width="32" height="32" />
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
  <Exercises {data} selected={route.current.exercise} />
{:else if route.current.view === 'progress'}
  <Progress {data} />
{:else}
  <Overview {data} />
{/if}

<footer>
  <button type="button" onclick={clear}>Clear my data</button>
</footer>

<style>
  footer {
    max-width: 960px;
    margin: 0 auto;
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

  footer button:hover {
    opacity: 1;
    text-decoration: underline;
  }

  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    max-width: 960px;
    margin: 0 auto;
    padding: 16px;
  }

  .home {
    flex-shrink: 0;
  }

  .icon {
    display: none;
  }

  nav {
    display: flex;
    gap: 4px;
  }

  nav a {
    padding: 6px 12px;
    border-radius: 8px;
    color: inherit;
    font-weight: 500;
    text-decoration: none;
    opacity: 0.6;
  }

  nav a:hover {
    opacity: 1;
  }

  /* The accent marks the active page, one of the few places it's used. */
  nav a[aria-current='page'] {
    opacity: 1;
    color: var(--on-accent);
    background: var(--accent);
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

<!-- Everything shown once a dataset is loaded: the header with navigation, then the current view. -->
<script lang="ts">
  import Logo from '../components/Logo.svelte'
  import type { Dataset } from '../lib/parse/types'
  import { href, route } from '../lib/store/route.svelte'
  import Exercises from './Exercises.svelte'
  import Overview from './Overview.svelte'

  let { data }: { data: Dataset } = $props()

  const view = $derived(route.current.view)
</script>

<header>
  <a href={href({ view: 'overview' })} class="logo"><Logo width={120} /></a>
  <nav>
    <a href={href({ view: 'overview' })} aria-current={view === 'overview' ? 'page' : undefined}>
      Overview
    </a>
    <a
      href={href({ view: 'exercises', exercise: null })}
      aria-current={view === 'exercises' ? 'page' : undefined}
    >
      Exercises
    </a>
  </nav>
</header>

{#if route.current.view === 'exercises'}
  <Exercises {data} selected={route.current.exercise} />
{:else}
  <Overview {data} />
{/if}

<style>
  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    max-width: 960px;
    margin: 0 auto;
    padding: 16px;
  }

  .logo {
    flex-shrink: 0;
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
</style>

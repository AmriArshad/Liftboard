<!--
  The list-and-detail layout shared by Workouts and Exercises: a searchable list beside the
  selected item. Side by side on wide screens; on phones, the list first, then the detail on
  its own with a link back.
-->
<script lang="ts">
  import type { Snippet } from 'svelte'

  let {
    name,
    query = $bindable(''),
    onsubmit,
    showingDetail,
    backHref,
    list,
    detail,
  }: {
    /** "Workouts" or "Exercises": names the search box and the back link. */
    name: string
    /** The search text. $bindable lets the parent use bind:query, two-way like bind:value. */
    query?: string
    /** Enter in the search box. */
    onsubmit: () => void
    /** True when the URL names an item, so phones show the detail instead of the list. */
    showingDetail: boolean
    backHref: string
    // Snippets are chunks of markup passed in by the parent, like render props or children
    // in React. The parent writes {#snippet list()}…{/snippet} inside <Explorer>.
    list: Snippet
    detail?: Snippet
  } = $props()

  function submit(event: SubmitEvent) {
    event.preventDefault()
    onsubmit()
  }
</script>

<main class:showing-detail={showingDetail && detail !== undefined}>
  <section class="picker">
    <form role="search" onsubmit={submit}>
      <input
        type="search"
        placeholder="Search"
        aria-label="Search {name.toLowerCase()}"
        bind:value={query}
      />
    </form>
    <div class="list">
      {@render list()}
    </div>
  </section>

  {#if detail}
    <section class="detail">
      <a class="back" href={backHref}>← {name}</a>
      {@render detail()}
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

  .list {
    min-height: 0;
    overflow-y: auto;
  }

  /*
    The list's markup comes from the parent through a snippet, so it carries the parent's
    scoped class names, not this component's. :global() reaches it from here, limited to
    inside .list so nothing else on the page is affected.
  */
  .list :global(ul) {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .list :global(li a) {
    display: block;
    padding: 8px 12px;
    border-radius: 8px;
    color: inherit;
    text-decoration: none;
  }

  .list :global(li a:hover) {
    background: color-mix(in srgb, var(--text) 6%, transparent);
  }

  .list :global(li a[aria-current='page']) {
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

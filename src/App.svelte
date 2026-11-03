<script lang="ts">
  import Upload from './components/Upload.svelte'
  import { dataset } from './lib/store/dataset.svelte'
</script>

{#if dataset.current}
  {@const count = dataset.current.workouts.length}
  <!-- Placeholder until the overview lands. -->
  <main>
    <p>{count} {count === 1 ? 'workout' : 'workouts'}</p>
  </main>
{:else}
  <Upload />
{/if}

<style>
  main {
    display: grid;
    place-items: center;
    min-height: 100dvh;
    padding: 16px;
  }
</style>

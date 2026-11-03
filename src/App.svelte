<script lang="ts">
  import { dataset } from './lib/store/dataset.svelte'
  import Upload from './views/Upload.svelte'

  // The overview pulls in ECharts, most of the bundle. A dynamic import() puts it in its own
  // chunk: the upload screen paints without it, and the download starts straight away so it's
  // usually ready by the time a file has been parsed.
  const overview = import('./views/Overview.svelte')
</script>

{#if dataset.current}
  {#await overview then { default: Overview }}
    <Overview data={dataset.current} />
  {/await}
{:else}
  <Upload />
{/if}

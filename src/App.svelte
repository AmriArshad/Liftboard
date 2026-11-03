<script lang="ts">
  import { dataset } from './lib/store/dataset.svelte'
  import Upload from './views/Upload.svelte'

  // The dashboard pulls in ECharts, most of the bundle. A dynamic import() puts it in its own
  // chunk: the upload screen paints without it, and the download starts straight away so it's
  // usually ready by the time a file has been parsed.
  const dashboard = import('./views/Dashboard.svelte')
</script>

<!-- Nothing renders for the moment it takes to read a saved dataset from IndexedDB. -->
{#if dataset.current}
  {#await dashboard then { default: Dashboard }}
    <Dashboard data={dataset.current} />
  {/await}
{:else if !dataset.restoring}
  <Upload />
{/if}

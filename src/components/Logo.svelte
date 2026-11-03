<!-- The liftboard wordmark, swapped to match the system colour scheme. -->
<script lang="ts">
  let { width = 200 }: { width?: number } = $props()
</script>

<picture>
  <source srcset="/brand/logo-dark.svg" media="(prefers-color-scheme: dark)" />
  <img src="/brand/logo-light.svg" alt="liftboard" {width} height={(width * 72) / 300} />
</picture>

<style>
  img {
    display: block;
    max-width: 100%;
    height: auto;
  }
</style>

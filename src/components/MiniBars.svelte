<!-- A handful of labelled bars in plain HTML, for small counts like workouts per weekday. -->
<script lang="ts">
  let { bars, label }: { bars: { label: string; value: number }[]; label: string } = $props()

  const max = $derived(Math.max(1, ...bars.map((b) => b.value)))
</script>

<div class="bars" role="img" aria-label={label}>
  {#each bars as bar, i (i)}
    <div class="bar">
      <span class="fill" class:empty={bar.value === 0} style:height="{(bar.value / max) * 100}%"
      ></span>
      <span class="name">{bar.label}</span>
    </div>
  {/each}
</div>

<style>
  .bars {
    display: grid;
    grid-auto-flow: column;
    grid-auto-columns: 1fr;
    gap: 6px;
    height: 96px;
  }

  .bar {
    display: grid;
    grid-template-rows: 1fr auto;
    align-items: end;
    gap: 6px;
    min-width: 0;
  }

  .fill {
    display: block;
    min-height: 3px;
    border-radius: 4px 4px 2px 2px;
    background: var(--series);
  }

  .fill.empty {
    opacity: 0.25;
  }

  .name {
    font-size: 0.75rem;
    text-align: center;
    opacity: 0.6;
  }
</style>

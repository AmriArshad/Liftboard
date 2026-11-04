<!-- "↑ 12% vs previous": a change with a direction arrow, coloured by whether it's good news. -->
<script lang="ts">
  let {
    change,
    text,
    suffix = '',
    better = 'up',
  }: {
    /** Relative or absolute change; its sign sets the arrow. */
    change: number
    /** What to show, e.g. "12%" or "3"; the arrow carries the sign. */
    text: string
    suffix?: string
    /** Which direction is good news; 'neither' keeps it neutral. */
    better?: 'up' | 'down' | 'neither'
  } = $props()

  const direction = $derived(Math.abs(change) < 0.005 ? 'flat' : change > 0 ? 'up' : 'down')
  const tone = $derived(
    direction === 'flat' || better === 'neither'
      ? 'neutral'
      : (direction === 'up') === (better === 'up')
        ? 'good'
        : 'bad',
  )
</script>

<span class="delta {tone}">
  <svg viewBox="0 0 16 16" aria-hidden="true">
    <circle cx="8" cy="8" r="7" />
    {#if direction === 'up'}
      <path d="M8 11.5v-7M5 7l3-2.8L11 7" />
    {:else if direction === 'down'}
      <path d="M8 4.5v7M5 9l3 2.8L11 9" />
    {:else}
      <path d="M4.5 8h7" />
    {/if}
  </svg>
  <span class="sr-only"
    >{direction === 'up' ? 'Up' : direction === 'down' ? 'Down' : 'No change'}</span
  >
  {text}{suffix}
</span>

<style>
  .delta {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 0.8125rem;
    font-weight: 500;
    font-variant-numeric: tabular-nums;
  }

  svg {
    width: 14px;
    height: 14px;
    flex: none;
    fill: none;
    stroke: currentColor;
    stroke-width: 1.4;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  .good {
    color: var(--good);
  }

  .bad {
    color: var(--bad);
  }

  .neutral {
    opacity: 0.65;
  }

  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
  }
</style>

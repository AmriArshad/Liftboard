<!-- One headline number, with its change against the previous period. -->
<script lang="ts">
  let {
    label,
    value,
    change = null,
    changeText,
    better = 'up',
  }: {
    label: string
    value: string
    /** Relative change; null hides it (no previous period, or nothing to compare). */
    change?: number | null
    /** Overrides the default "+8%" text, e.g. "+3" for a count. */
    changeText?: string
    /** Which direction is good news; 'neither' keeps the change neutral. */
    better?: 'up' | 'down' | 'neither'
  } = $props()

  const percent = new Intl.NumberFormat(undefined, {
    style: 'percent',
    maximumFractionDigits: 0,
    signDisplay: 'exceptZero',
  })

  const tone = $derived.by(() => {
    if (change === null || better === 'neither' || Math.abs(change) < 0.005) return 'neutral'
    return change > 0 === (better === 'up') ? 'good' : 'bad'
  })
</script>

<div class="stat">
  <p class="label">{label}</p>
  <p class="value">{value}</p>
  {#if change !== null}
    <p class="change {tone}">{changeText ?? percent.format(change)}</p>
  {/if}
</div>

<style>
  .stat {
    padding: 14px 16px;
    border-radius: 12px;
    background: var(--surface);
  }

  p {
    margin: 0;
  }

  .label {
    font-size: 0.8125rem;
    opacity: 0.6;
  }

  .value {
    margin-top: 4px;
    font-size: 1.5rem;
    font-weight: 600;
    letter-spacing: -0.01em;
    font-variant-numeric: tabular-nums;
  }

  .change {
    margin-top: 2px;
    font-size: 0.8125rem;
    font-weight: 500;
    font-variant-numeric: tabular-nums;
  }

  .good {
    color: var(--good);
  }

  .bad {
    color: var(--bad);
  }

  .neutral {
    opacity: 0.6;
  }
</style>

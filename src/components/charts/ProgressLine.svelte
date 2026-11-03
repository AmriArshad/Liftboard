<!-- One or more values over time. The first series is the highlighted one; the rest are dashed. -->
<script module lang="ts">
  // <script module> runs once for the file rather than once per component, which is where
  // types and constants that other files import belong.
  export interface Series {
    name: string
    points: [Date, number][]
  }
</script>

<script lang="ts">
  import type { ChartTheme } from '../../lib/charts/echarts'
  import { formatCompact, formatDate } from '../../lib/format'
  import Chart from './Chart.svelte'

  let {
    series,
    format,
    label,
  }: {
    series: Series[]
    /** Full value for the tooltip, e.g. "100 kg". */
    format: (value: number) => string
    label: string
  } = $props()

  function option(theme: ChartTheme) {
    return {
      grid: { top: 8, right: 8, bottom: 24, left: 40 },
      xAxis: {
        type: 'time' as const,
        axisLine: { lineStyle: { color: theme.faint } },
        axisTick: { show: false },
        axisLabel: { color: theme.muted, hideOverlap: true },
        splitLine: { show: false },
      },
      yAxis: {
        type: 'value' as const,
        // Start near the data instead of at 0, so progress is visible.
        scale: true,
        splitNumber: 3,
        splitLine: { lineStyle: { color: theme.faint } },
        axisLabel: { color: theme.muted, formatter: formatCompact },
      },
      tooltip: {
        trigger: 'axis' as const,
        axisPointer: { lineStyle: { color: theme.muted } },
        formatter: (params: unknown) => {
          const points = params as { seriesName: string; value: [Date, number] }[]
          const [first] = points
          if (!first) return ''
          const rows = points.map((point) => `${point.seriesName}: ${format(point.value[1])}`)
          return [formatDate(first.value[0]), ...rows].join('<br>')
        },
      },
      series: series.map((s, i) => ({
        type: 'line' as const,
        name: s.name,
        data: s.points,
        symbol: 'circle',
        symbolSize: i === 0 ? 6 : 0,
        showSymbol: i === 0,
        lineStyle: {
          width: i === 0 ? 2 : 1.5,
          color: i === 0 ? theme.highlight : theme.series,
          type: i === 0 ? ('solid' as const) : ('dashed' as const),
        },
        itemStyle: { color: i === 0 ? theme.highlight : theme.series },
      })),
    }
  }
</script>

{#if series.length > 1}
  <!-- A plain HTML key: lighter than ECharts' legend component and easier to style. -->
  <ul class="key">
    {#each series as s, i (s.name)}
      <li class:secondary={i > 0}>{s.name}</li>
    {/each}
  </ul>
{/if}
<Chart {option} {label} height={240} />

<style>
  .key {
    display: flex;
    gap: 16px;
    margin: 0 0 8px;
    padding: 0;
    list-style: none;
    font-size: 0.875rem;
  }

  .key li::before {
    content: '';
    display: inline-block;
    width: 14px;
    margin-right: 6px;
    vertical-align: middle;
    border-top: 2px solid var(--highlight);
  }

  .key li.secondary {
    opacity: 0.6;
  }

  .key li.secondary::before {
    border-top: 2px dashed var(--series);
  }
</style>

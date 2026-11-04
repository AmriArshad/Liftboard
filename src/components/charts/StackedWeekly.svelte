<!-- Weekly totals stacked by category (e.g. volume by workout name), darkest at the bottom. -->
<script lang="ts">
  import type { ChartTheme } from '../../lib/charts/echarts'
  import { formatCompact, formatDate, monthLabels } from '../../lib/format'
  import Chart from './Chart.svelte'

  let {
    dates,
    series,
    format,
    label,
  }: {
    dates: Date[]
    /** One row per category, aligned with `dates`. */
    series: { name: string; values: number[] }[]
    format: (value: number) => string
    label: string
  } = $props()

  function option(theme: ChartTheme) {
    const colors = theme.shades(series.length)
    return {
      grid: { top: 8, right: 0, bottom: 24, left: 40 },
      xAxis: {
        type: 'category' as const,
        data: monthLabels(dates),
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { interval: 0, color: theme.muted },
      },
      yAxis: {
        type: 'value' as const,
        splitNumber: 3,
        splitLine: { lineStyle: { color: theme.faint } },
        axisLabel: { color: theme.muted, formatter: formatCompact },
      },
      tooltip: {
        trigger: 'axis' as const,
        axisPointer: { type: 'shadow' as const, shadowStyle: { color: theme.faint } },
        formatter: (params: unknown) => {
          const rows = params as { dataIndex: number; seriesName: string; value: number }[]
          const first = rows[0]
          if (!first) return ''
          const total = rows.reduce((sum, r) => sum + r.value, 0)
          return [
            `Week of ${formatDate(dates[first.dataIndex]!)}: ${format(total)}`,
            ...rows.filter((r) => r.value > 0).map((r) => `${r.seriesName}: ${format(r.value)}`),
          ].join('<br>')
        },
      },
      series: series.map((s, i) => ({
        type: 'bar' as const,
        name: s.name,
        stack: 'total',
        data: s.values.map(Math.round),
        barCategoryGap: '28%',
        itemStyle: {
          color: colors[i],
          // Only the top of the stack is rounded.
          borderRadius: i === series.length - 1 ? [6, 6, 0, 0] : 0,
        },
      })),
    }
  }
</script>

<Chart {option} {label} />

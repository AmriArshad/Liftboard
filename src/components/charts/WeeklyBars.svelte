<!-- One bar per week, for any weekly number (volume, set count). -->
<script lang="ts">
  import type { ChartTheme } from '../../lib/charts/echarts'
  import { formatCompact, formatDate, monthLabels } from '../../lib/format'
  import type { Week } from '../../lib/metrics/overview'
  import Chart from './Chart.svelte'

  let {
    weeks,
    value,
    format,
    label,
    average,
  }: {
    weeks: Week[]
    value: (week: Week) => number
    /** Full value for the tooltip, e.g. "12,300 kg". */
    format: (value: number) => string
    label: string
    /** Optional trend line drawn over the bars, one value per week (e.g. a rolling average). */
    average?: { name: string; values: number[] }
  } = $props()

  function option(theme: ChartTheme) {
    return {
      grid: { top: 8, right: 0, bottom: 24, left: 40 },
      xAxis: {
        type: 'category' as const,
        data: monthLabels(weeks.map((week) => week.start)),
        axisLine: { lineStyle: { color: theme.faint } },
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
          const [bar, line] = params as { dataIndex: number; value: number }[]
          if (!bar) return ''
          const rows = [`Week of ${formatDate(weeks[bar.dataIndex]!.start)}: ${format(bar.value)}`]
          if (line && average) rows.push(`${average.name}: ${format(line.value)}`)
          return rows.join('<br>')
        },
      },
      series: [
        {
          type: 'bar' as const,
          data: weeks.map(value),
          itemStyle: { color: theme.series, borderRadius: [3, 3, 0, 0] },
          barCategoryGap: '30%',
        },
        ...(average
          ? [
              {
                type: 'line' as const,
                name: average.name,
                data: average.values.map(Math.round),
                symbol: 'none',
                smooth: true,
                lineStyle: { color: theme.highlight, width: 2.5 },
                itemStyle: { color: theme.highlight },
              },
            ]
          : []),
      ],
    }
  }
</script>

<Chart {option} {label} />

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
  }: {
    weeks: Week[]
    value: (week: Week) => number
    /** Full value for the tooltip, e.g. "12,300 kg". */
    format: (value: number) => string
    label: string
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
          const [bar] = params as { dataIndex: number; value: number }[]
          return bar
            ? `Week of ${formatDate(weeks[bar.dataIndex]!.start)}: ${format(bar.value)}`
            : ''
        },
      },
      series: [
        {
          type: 'bar' as const,
          data: weeks.map(value),
          itemStyle: { color: theme.series, borderRadius: [3, 3, 0, 0] },
          barCategoryGap: '30%',
        },
      ],
    }
  }
</script>

<Chart {option} {label} />

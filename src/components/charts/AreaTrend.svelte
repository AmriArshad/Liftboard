<!-- A soft filled line for one weekly number, with the latest value labelled at its end. -->
<script lang="ts">
  import type { ChartTheme } from '../../lib/charts/echarts'
  import { formatCompact, formatDate } from '../../lib/format'
  import Chart from './Chart.svelte'

  let {
    dates,
    values,
    format,
    label,
    height = 150,
  }: {
    dates: Date[]
    values: number[]
    /** Full value for the tooltip and end label, e.g. "12,300 kg". */
    format: (value: number) => string
    label: string
    height?: number
  } = $props()

  function option(theme: ChartTheme) {
    return {
      grid: { top: 28, right: 8, bottom: 4, left: 8 },
      xAxis: {
        type: 'category' as const,
        data: dates.map(formatDate),
        show: false,
        boundaryGap: false,
      },
      // From zero, so a light week reads as lighter, not as a collapse.
      yAxis: { type: 'value' as const, show: false, min: 0 },
      tooltip: {
        trigger: 'axis' as const,
        axisPointer: {
          type: 'line' as const,
          lineStyle: { color: theme.muted, type: 'dashed' as const },
        },
        formatter: (params: unknown) => {
          const [point] = params as { dataIndex: number; value: number }[]
          return point
            ? `Week of ${formatDate(dates[point.dataIndex]!)}: ${format(point.value)}`
            : ''
        },
      },
      series: [
        {
          type: 'line' as const,
          data: values.map(Math.round),
          smooth: 0.4,
          symbol: 'none',
          lineStyle: { color: theme.series, width: 2 },
          // A plain object gradient, so ECharts' graphic module isn't needed.
          areaStyle: {
            color: {
              type: 'linear' as const,
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: theme.seriesSoft },
                { offset: 1, color: theme.surface },
              ],
            },
          },
          endLabel: {
            show: true,
            formatter: (params: unknown) => formatCompact((params as { value: number }).value),
            color: theme.text,
            fontWeight: 600 as const,
            offset: [-24, -18] as [number, number],
          },
        },
      ],
    }
  }
</script>

<Chart {option} {label} {height} />

<!-- Workouts per day, one column per week and one row per weekday. -->
<script lang="ts">
  import type { ChartTheme } from '../../lib/charts/echarts'
  import { formatDate, monthLabels } from '../../lib/format'
  import type { Week } from '../../lib/metrics/overview'
  import Chart from './Chart.svelte'

  let { weeks }: { weeks: Week[] } = $props()

  const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  // $derived recomputes when `weeks` changes, like useMemo without the dependency array.
  const cells = $derived(weeks.flatMap((week, x) => week.days.map((count, y) => [x, y, count])))
  const total = $derived(weeks.reduce((sum, week) => sum + week.workouts, 0))

  function option(theme: ChartTheme) {
    return {
      grid: { top: 4, right: 0, bottom: 24, left: 36 },
      xAxis: {
        type: 'category' as const,
        data: monthLabels(weeks.map((week) => week.start)),
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { interval: 0, color: theme.muted },
      },
      yAxis: {
        type: 'category' as const,
        data: DAYS,
        inverse: true,
        axisLine: { show: false },
        axisTick: { show: false },
        // Every other day is enough to read the rows.
        axisLabel: { interval: 1, color: theme.muted },
      },
      // Heatmaps take their colours from a visualMap. Hidden: the colours speak for themselves.
      visualMap: {
        type: 'piecewise' as const,
        show: false,
        dimension: 2,
        pieces: [
          { value: 0, color: theme.faint },
          { gte: 1, color: theme.highlight },
        ],
      },
      tooltip: {
        formatter: (params: unknown) => {
          const [x, y, count] = (params as { value: [number, number, number] }).value
          const monday = weeks[x]!.start
          const day = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + y)
          return `${formatDate(day)}: ${count} ${count === 1 ? 'workout' : 'workouts'}`
        },
      },
      series: [
        {
          type: 'heatmap' as const,
          data: cells,
          // A border in the page colour draws the gaps between cells.
          itemStyle: { borderColor: theme.background, borderWidth: 3, borderRadius: 4 },
          emphasis: { itemStyle: { borderColor: theme.text, borderWidth: 1 } },
        },
      ],
    }
  }
</script>

<Chart {option} label="{total} workouts over {weeks.length} weeks" height={180} />

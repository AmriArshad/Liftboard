<!--
  Shared ECharts host used by every chart wrapper. It owns the chart instance:
  creating it, resizing it with its container, re-colouring it when the system
  theme changes, and disposing of it when the component is removed.
-->
<script lang="ts">
  import type { EChartsType } from 'echarts/core'
  import { echarts, readTheme, type ChartOption, type ChartTheme } from '../../lib/charts/echarts'

  let {
    option,
    label,
    height = 200,
  }: {
    /** Builds the option from theme colours, so it can be rebuilt when the theme changes. */
    option: (theme: ChartTheme) => ChartOption
    /** Read by screen readers in place of the chart. */
    label: string
    height?: number
  } = $props()

  // bind:this fills this in once the <div> exists.
  let element: HTMLDivElement
  // $state.raw: the chart instance is a big external object Svelte shouldn't proxy.
  let chart = $state.raw<EChartsType>()

  // $effect runs after the component mounts, and its return value runs on unmount,
  // much like useEffect(() => { ...; return cleanup }, []) in React.
  $effect(() => {
    const instance = echarts.init(element, null, { renderer: 'svg' })
    const observer = new ResizeObserver(() => instance.resize())
    observer.observe(element)
    chart = instance

    return () => {
      observer.disconnect()
      instance.dispose()
    }
  })

  // Svelte tracks what an $effect reads (chart, option) and re-runs it when they change:
  // no dependency array to keep in sync by hand.
  $effect(() => {
    if (!chart) return
    const target = chart
    const render = () => target.setOption(option(readTheme(element)), { notMerge: true })
    render()

    const scheme = matchMedia('(prefers-color-scheme: dark)')
    scheme.addEventListener('change', render)
    return () => scheme.removeEventListener('change', render)
  })
</script>

<div bind:this={element} role="img" aria-label={label} style:height="{height}px"></div>

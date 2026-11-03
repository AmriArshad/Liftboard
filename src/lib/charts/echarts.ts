// The one place ECharts is imported. Registering only the chart types and components we use
// lets the bundler drop the rest of the library (importing 'echarts' itself would pull in all of it).

import { BarChart, HeatmapChart } from 'echarts/charts'
import type { BarSeriesOption, HeatmapSeriesOption } from 'echarts/charts'
import { GridComponent, TooltipComponent, VisualMapPiecewiseComponent } from 'echarts/components'
import type {
  GridComponentOption,
  TooltipComponentOption,
  VisualMapComponentOption,
} from 'echarts/components'
import * as echarts from 'echarts/core'
import type { ComposeOption } from 'echarts/core'
import { SVGRenderer } from 'echarts/renderers'

echarts.use([
  BarChart,
  HeatmapChart,
  GridComponent,
  TooltipComponent,
  VisualMapPiecewiseComponent,
  SVGRenderer,
])

export { echarts }

/** The option object, typed to only what's registered above. */
export type ChartOption = ComposeOption<
  | BarSeriesOption
  | HeatmapSeriesOption
  | GridComponentOption
  | TooltipComponentOption
  | VisualMapComponentOption
>

/** Colours read from the page's CSS variables, so charts follow light and dark mode. */
export interface ChartTheme {
  background: string
  text: string
  muted: string
  faint: string
  series: string
}

// ECharts can't read CSS variables or color-mix(), so colours are resolved to plain values here.
export function readTheme(element: Element): ChartTheme {
  const style = getComputedStyle(element)
  const token = (name: string) => style.getPropertyValue(name).trim()
  const text = token('--text')
  return {
    background: token('--bg'),
    text,
    muted: withAlpha(text, 0.6),
    faint: withAlpha(text, 0.08),
    series: token('--series'),
  }
}

/** "#rrggbb" plus an alpha → "rgba(...)". The CSS tokens are all six-digit hex. */
function withAlpha(hex: string, alpha: number): string {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

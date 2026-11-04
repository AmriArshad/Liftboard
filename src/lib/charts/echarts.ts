// The one place ECharts is imported. Registering only the chart types and components we use
// lets the bundler drop the rest of the library (importing 'echarts' itself would pull in all of it).

import { BarChart, HeatmapChart, LineChart } from 'echarts/charts'
import type { BarSeriesOption, HeatmapSeriesOption, LineSeriesOption } from 'echarts/charts'
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
  LineChart,
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
  | LineSeriesOption
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
  seriesSoft: string
  highlight: string
  /** Card background, for gaps drawn in the colour of what's behind the chart. */
  surface: string
  /** The page's font stack, so chart text matches the rest of the page. */
  font: string
  /** `count` shades stepping from `series` to `seriesSoft`, for stacked series. */
  shades: (count: number) => string[]
}

// ECharts can't read CSS variables or color-mix(), so colours are resolved to plain values here.
export function readTheme(element: Element): ChartTheme {
  const style = getComputedStyle(element)
  const token = (name: string) => style.getPropertyValue(name).trim()
  const text = token('--text')
  const series = token('--series')
  const seriesSoft = token('--series-soft')
  return {
    background: token('--bg'),
    text,
    muted: withAlpha(text, 0.6),
    faint: withAlpha(text, 0.08),
    series,
    seriesSoft,
    highlight: token('--highlight'),
    surface: token('--surface'),
    font: style.fontFamily,
    shades: (count) =>
      Array.from({ length: count }, (_, i) =>
        mix(series, seriesSoft, count > 1 ? i / (count - 1) : 0),
      ),
  }
}

/** The CSS tokens are all six-digit hex. */
function channels(hex: string): [number, number, number] {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number]
}

/** "#rrggbb" plus an alpha → "rgba(...)". */
export function withAlpha(hex: string, alpha: number): string {
  const [r, g, b] = channels(hex)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

/** The colour `amount` of the way from `from` to `to` (0 = from, 1 = to). */
function mix(from: string, to: string, amount: number): string {
  const a = channels(from)
  const b = channels(to)
  const [r, g, bl] = a.map((v, i) => Math.round(v + (b[i]! - v) * amount))
  return `rgb(${r}, ${g}, ${bl})`
}

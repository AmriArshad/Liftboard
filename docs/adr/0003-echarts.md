# 0003: Apache ECharts for charts

## Context

v0.1 needs a calendar-style heatmap, bar charts and time-series lines with tooltips, in light
and dark mode, on phones. Later ideas (comparing exports, more panels) will want more chart
types, not fewer.

## Decision

- Use Apache ECharts, imported through `src/lib/charts/echarts.ts` only. That file registers
  just the chart types and components in use (`echarts/core` + `use([...])`), so the rest of
  the library is dropped from the bundle.
- Use the SVG renderer: crisp at any zoom, and the charts are small enough that canvas isn't
  needed for speed.
- One shared `Chart.svelte` owns the ECharts instance (create, resize, re-theme, dispose); one
  small wrapper per chart type builds the option. Colours come from CSS variables, resolved
  to plain values because ECharts can't read `var()`.
- Load the dashboard, and with it ECharts, as a separate chunk, so the upload screen doesn't
  wait for it.

## Consequences

- ECharts' core is the bulk of the app: about 190 KB gzipped for the dashboard chunk, against
  under 20 KB for the upload screen. The v0.2 `size-limit` budget keeps it from growing
  unnoticed.
- Adding a chart type means registering it in `echarts.ts` and writing one wrapper.
- Hand-drawn SVG would have been lighter for the three v0.1 overview charts, but the explorer's
  interactive time series would have needed a library anyway.

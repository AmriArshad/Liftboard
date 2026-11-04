<!--
  A tiny trend line drawn as plain SVG. Dozens of these on one page would mean dozens of
  ECharts instances; an SVG polyline is a few bytes and needs no JavaScript to draw.
-->
<script lang="ts">
  let {
    points,
    tone = 'neutral',
    label,
  }: {
    points: [Date, number][]
    tone?: 'highlight' | 'neutral'
    label: string
  } = $props()

  const WIDTH = 100
  const HEIGHT = 28
  const PAD = 3

  const path = $derived.by(() => {
    if (points.length < 2) return ''
    const times = points.map(([d]) => d.getTime())
    const values = points.map(([, v]) => v)
    const [t0, t1] = [Math.min(...times), Math.max(...times)]
    const [v0, v1] = [Math.min(...values), Math.max(...values)]
    const x = (t: number) => PAD + ((t - t0) / (t1 - t0 || 1)) * (WIDTH - 2 * PAD)
    // A flat line sits in the middle rather than on the floor.
    const y = (v: number) =>
      v1 === v0 ? HEIGHT / 2 : HEIGHT - PAD - ((v - v0) / (v1 - v0)) * (HEIGHT - 2 * PAD)
    return points.map(([d, v]) => `${x(d.getTime()).toFixed(1)},${y(v).toFixed(1)}`).join(' ')
  })
</script>

<svg viewBox="0 0 {WIDTH} {HEIGHT}" preserveAspectRatio="none" role="img" aria-label={label}>
  <polyline points={path} class={tone} vector-effect="non-scaling-stroke" />
</svg>

<style>
  svg {
    display: block;
    width: 100%;
    height: 28px;
    overflow: visible;
  }

  polyline {
    fill: none;
    stroke-width: 2;
    stroke-linejoin: round;
    stroke-linecap: round;
  }

  polyline.highlight {
    stroke: var(--highlight);
  }

  polyline.neutral {
    stroke: var(--series);
  }
</style>

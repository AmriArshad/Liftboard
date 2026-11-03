<script lang="ts">
  import WeekHeatmap from '../components/charts/WeekHeatmap.svelte'
  import WeeklyBars from '../components/charts/WeeklyBars.svelte'
  import Logo from '../components/Logo.svelte'
  import { formatDateRange, formatInteger } from '../lib/format'
  import { overview } from '../lib/metrics/overview'
  import type { Dataset } from '../lib/parse/types'
  import { fromKg } from '../lib/units'

  let { data }: { data: Dataset } = $props()

  const summary = $derived(overview(data))
  // Until the kg/lb toggle lands, show the unit the export was written in.
  const unit = $derived(data.sourceUnit)
</script>

<main>
  <header>
    <Logo width={140} />
  </header>

  <section class="summary">
    <h1>
      <strong>{formatInteger(summary.workouts)}</strong>
      {summary.workouts === 1 ? 'workout' : 'workouts'}
    </h1>
    <p>{formatDateRange(summary.first, summary.last)}</p>
  </section>

  <section>
    <h2>Workouts per week</h2>
    <WeekHeatmap weeks={summary.weeks} />
  </section>

  <section>
    <h2>Weekly volume</h2>
    <WeeklyBars
      weeks={summary.weeks}
      value={(week) => Math.round(fromKg(week.volumeKg, unit))}
      format={(value) => `${formatInteger(value)} ${unit}`}
      label="Weekly volume in {unit}"
    />
  </section>

  <section>
    <h2>Weekly sets</h2>
    <WeeklyBars
      weeks={summary.weeks}
      value={(week) => week.sets}
      format={(value) => `${formatInteger(value)} sets`}
      label="Weekly working sets"
    />
  </section>
</main>

<style>
  main {
    display: grid;
    gap: 40px;
    max-width: 960px;
    margin: 0 auto;
    padding: 24px 16px 64px;
  }

  h1 {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 500;
  }

  h1 strong {
    font-size: 2.5rem;
    font-weight: 600;
    letter-spacing: -0.02em;
  }

  .summary p {
    margin: 4px 0 0;
    opacity: 0.6;
  }

  h2 {
    margin: 0 0 12px;
    font-size: 0.875rem;
    font-weight: 500;
    opacity: 0.6;
  }
</style>

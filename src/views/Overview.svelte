<!--
  The home screen: is the training working, and is it consistent? Everything below the
  title follows the chosen period and is compared with the period before it.
-->
<script lang="ts">
  import AreaTrend from '../components/charts/AreaTrend.svelte'
  import StackedWeekly from '../components/charts/StackedWeekly.svelte'
  import WeekHeatmap from '../components/charts/WeekHeatmap.svelte'
  import Delta from '../components/Delta.svelte'
  import MiniBars from '../components/MiniBars.svelte'
  import Segmented from '../components/Segmented.svelte'
  import Sparkline from '../components/Sparkline.svelte'
  import {
    formatCompact,
    formatDate,
    formatDateRange,
    formatDecimal,
    formatInteger,
    formatWeight,
  } from '../lib/format'
  import { overview } from '../lib/metrics/overview'
  import { personalRecords, stalledLifts } from '../lib/metrics/progress'
  import {
    byWeekday,
    change,
    inRange,
    insights,
    liftTrends,
    periodRange,
    shortName,
    split,
    streaks,
    totals,
    weeklyVolumeBySplit,
    weeksInRange,
    type LiftStatus,
    type Period,
  } from '../lib/metrics/summary'
  import type { Dataset, Unit } from '../lib/parse/types'
  import { href } from '../lib/store/route.svelte'
  import { fromKg } from '../lib/units'

  let { data, unit }: { data: Dataset; unit: Unit } = $props()

  const PERIODS: { value: Period; label: string; name: string }[] = [
    { value: '4w', label: '4W', name: '4 weeks' },
    { value: '12w', label: '12W', name: '12 weeks' },
    { value: '26w', label: '6M', name: '6 months' },
    { value: '52w', label: '1Y', name: '1 year' },
    { value: 'all', label: 'All', name: 'All time' },
  ]
  const PERIOD_NAMES: Record<Period, string> = {
    '4w': '4 weeks',
    '12w': '12 weeks',
    '26w': '6 months',
    '52w': 'year',
    all: 'all time',
  }
  let period = $state<Period>('12w')

  // All-time, independent of the period.
  const all = $derived(overview(data))
  const records = $derived(personalRecords(data))
  const stalled = $derived(new Set(stalledLifts(data).map((s) => s.exercise)))
  const streak = $derived(streaks(all.weeks))

  // The chosen period and the one before it.
  const range = $derived(periodRange(data, period))
  const lastDay = $derived(new Date(range.end.getTime() - 1))
  const workouts = $derived(inRange(data.workouts, range.start, range.end))
  const now = $derived(totals(workouts, range.start, range.end, records))
  const before = $derived(
    range.previous &&
      totals(
        inRange(data.workouts, range.previous.start, range.previous.end),
        range.previous.start,
        range.previous.end,
        records,
      ),
  )
  // Comparing against an empty stretch before the first workout would read as +∞%.
  const compare = $derived(before && before.workouts > 0 ? before : null)
  const vs = $derived(` vs previous ${PERIOD_NAMES[period]}`)

  const weeks = $derived(weeksInRange(data, range.start, range.end))
  const lifts = $derived(liftTrends(data, range.start, range.end, stalled))
  const sentences = $derived(insights(lifts, now, compare))
  const shares = $derived(split(workouts, 3))
  const stacked = $derived(
    weeklyVolumeBySplit(
      workouts,
      weeks,
      shares.map((s) => s.title),
    ),
  )
  const weekdays = $derived(byWeekday(workouts))
  const recent = $derived(
    records.filter((r) => r.date >= range.start && r.date < range.end).slice(0, 5),
  )

  // Consistency in a word, for the pill on the lead card.
  const pace = $derived.by(() => {
    const delta = change(now.perWeek, compare?.perWeek)
    if (delta === null) return streak.current > 0 ? 'Active' : 'Paused'
    return delta > 0.1 ? 'Rising' : delta < -0.1 ? 'Slipping' : 'Steady'
  })

  const weight = (kg: number) => `${formatWeight(fromKg(kg, unit))} ${unit}`
  const pct = (n: number) => `${Math.abs(Math.round(n * 100))}%`
  // e1RM is an estimate: one decimal is plenty.
  const estimate = (kg: number) => `${formatDecimal(fromKg(kg, unit))} ${unit}`

  const STATUS_LABEL: Record<LiftStatus, string> = {
    progressing: 'Progressing',
    flat: 'Flat',
    regressing: 'Down',
    stalled: 'Stalled',
  }

  const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
  const exerciseLink = (exercise: string) => href({ view: 'exercises', exercise })
</script>

<main>
  <header class="top">
    <div>
      <h1>
        <strong>{formatInteger(all.workouts)}</strong>
        {all.workouts === 1 ? 'workout' : 'workouts'}
      </h1>
      <p class="muted">{formatDateRange(all.first, all.last)}</p>
    </div>
    <div class="period">
      <Segmented legend="Period" options={PERIODS} value={period} onchange={(p) => (period = p)} />
      <span class="muted">{formatDateRange(range.start, lastDay)}</span>
    </div>
  </header>

  <div class="grid">
    <!-- Lead card: consistency, in the brand's lime wash. -->
    <section class="card hero span-4">
      <div class="title-row">
        <h2>Consistency</h2>
        <span class="pill">{pace}</span>
      </div>
      <p class="huge">
        {streak.current}<span>{streak.current === 1 ? ' week' : ' weeks'}</span>
      </p>
      <p class="muted">Current streak · longest {streak.longest}</p>
      <div class="hero-foot">
        <p><strong>{formatDecimal(now.perWeek)}</strong> workouts / week</p>
        {#if compare}
          <Delta
            change={change(now.perWeek, compare.perWeek) ?? 0}
            text={pct(change(now.perWeek, compare.perWeek) ?? 0)}
            suffix={vs}
          />
        {/if}
      </div>
    </section>

    <section class="card span-8">
      <h2>Volume</h2>
      <p class="big">{formatCompact(fromKg(now.volumeKg, unit))} <span>{unit}</span></p>
      {#if compare}
        <Delta
          change={change(now.volumeKg, compare.volumeKg) ?? 0}
          text={pct(change(now.volumeKg, compare.volumeKg) ?? 0)}
          suffix={vs}
        />
      {/if}
      <AreaTrend
        dates={weeks.map((w) => w.start)}
        values={weeks.map((w) => fromKg(w.volumeKg, unit))}
        format={(v) => `${formatInteger(v)} ${unit}`}
        label="Weekly volume in {unit}"
      />
    </section>

    <section class="card span-8">
      <h2>Lifts</h2>
      {#if sentences.length > 0}
        <p class="insight">{sentences.join(' ')}</p>
      {/if}
      {#if lifts.length === 0}
        <p class="muted">Train a weighted lift twice in this period to see its trend.</p>
      {:else}
        <ul class="tiles">
          {#each lifts as lift (lift.exercise)}
            <li class="tile">
              <a href={exerciseLink(lift.exercise)} title={lift.exercise}>
                {shortName(lift.exercise)}
              </a>
              <p class="tile-value">{estimate(lift.e1rmKg)}</p>
              <div class="tile-foot">
                <span class="status {lift.status}">
                  {lift.changePct === null || lift.status === 'stalled'
                    ? STATUS_LABEL[lift.status]
                    : `${lift.changePct > 0 ? '+' : '−'}${pct(lift.changePct)}`}
                </span>
                <Sparkline
                  points={lift.points}
                  tone={lift.status === 'progressing' ? 'highlight' : 'neutral'}
                  label="{lift.exercise} e1RM trend"
                />
              </div>
            </li>
          {/each}
        </ul>
      {/if}
    </section>

    <section class="card span-4" aria-label="Totals for the period">
      <h2>This period</h2>
      <dl class="rows">
        <div>
          <dt>Workouts per week</dt>
          <dd>
            {formatDecimal(now.perWeek)}
            {#if compare}
              <Delta
                change={change(now.perWeek, compare.perWeek) ?? 0}
                text={pct(change(now.perWeek, compare.perWeek) ?? 0)}
              />
            {/if}
          </dd>
        </div>
        <div>
          <dt>Working sets</dt>
          <dd>
            {formatInteger(now.sets)}
            {#if compare}
              <Delta
                change={change(now.sets, compare.sets) ?? 0}
                text={pct(change(now.sets, compare.sets) ?? 0)}
              />
            {/if}
          </dd>
        </div>
        <div>
          <dt>Avg session</dt>
          <dd>
            {now.avgMinutes === null ? '–' : `${formatInteger(now.avgMinutes)} min`}
            {#if compare && now.avgMinutes !== null && compare.avgMinutes !== null}
              <Delta
                change={change(now.avgMinutes, compare.avgMinutes) ?? 0}
                text={pct(change(now.avgMinutes, compare.avgMinutes) ?? 0)}
                better="neither"
              />
            {/if}
          </dd>
        </div>
        <div>
          <dt>New records</dt>
          <dd>
            {formatInteger(now.personalRecords)}
            {#if compare}
              <Delta
                change={now.personalRecords - compare.personalRecords}
                text={String(Math.abs(now.personalRecords - compare.personalRecords))}
              />
            {/if}
          </dd>
        </div>
        <div>
          <dt>Stalled lifts</dt>
          <dd>{stalled.size}</dd>
        </div>
      </dl>
    </section>

    <section class="card span-8">
      <div class="title-row">
        <h2>Weekly volume by workout</h2>
        <ul class="legend">
          {#each shares as share, i (share.title)}
            <li style:--shade={i / Math.max(1, shares.length - 1)}>
              {share.title} <span class="muted">{Math.round(share.share * 100)}%</span>
            </li>
          {/each}
        </ul>
      </div>
      <StackedWeekly
        dates={weeks.map((w) => w.start)}
        series={shares.map((s, i) => ({
          name: s.title,
          values: stacked[i]!.map((kg) => fromKg(kg, unit)),
        }))}
        format={(v) => `${formatInteger(v)} ${unit}`}
        label="Weekly volume in {unit} by workout"
      />
    </section>

    <section class="card span-4">
      <h2>Weekdays</h2>
      <MiniBars
        bars={weekdays.map((value, i) => ({ label: DAYS[i]!, value }))}
        label="Workouts per weekday, Monday first: {weekdays.join(', ')}"
      />
    </section>

    <section class="card span-7">
      <h2>Training days</h2>
      <WeekHeatmap {weeks} />
    </section>

    <section class="card span-5">
      <h2>Recent records</h2>
      {#if recent.length === 0}
        <p class="muted">No new records in this period.</p>
      {:else}
        <ul class="records">
          {#each recent as record (`${record.date.getTime()} ${record.exercise}`)}
            <li>
              <a href={exerciseLink(record.exercise)}>{shortName(record.exercise)}</a>
              <span>
                {record.weightKg === null
                  ? `${record.reps} reps`
                  : `${weight(record.weightKg)}${record.reps === null ? '' : ` × ${record.reps}`}`}
              </span>
              <span class="muted">{formatDate(record.date)}</span>
            </li>
          {/each}
        </ul>
        <a class="more" href={href({ view: 'progress' })}>All records</a>
      {/if}
    </section>
  </div>
</main>

<style>
  main {
    max-width: var(--page-width);
    margin: 0 auto;
    padding: 8px 16px 64px;
  }

  p {
    margin: 0;
  }

  .muted {
    opacity: 0.6;
  }

  a {
    color: inherit;
    text-decoration: none;
  }

  a:hover {
    text-decoration: underline;
  }

  ul {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .top {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-end;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 20px;
  }

  h1 {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 500;
  }

  h1 strong {
    font-size: 2.75rem;
    font-weight: 300;
    letter-spacing: -0.03em;
  }

  .period {
    display: grid;
    justify-items: end;
    gap: 6px;
    font-size: 0.8125rem;
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(12, minmax(0, 1fr));
    gap: 16px;
  }

  .span-4 {
    grid-column: span 4;
  }

  .span-5 {
    grid-column: span 5;
  }

  .span-7 {
    grid-column: span 7;
  }

  .span-8 {
    grid-column: span 8;
  }

  .card {
    min-width: 0;
    padding: 20px 22px;
    border: 1px solid var(--border);
    border-radius: 20px;
    background: var(--surface);
  }

  h2 {
    margin: 0 0 12px;
    font-size: 1.0625rem;
    font-weight: 500;
  }

  .title-row {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px 16px;
    margin-bottom: 12px;
  }

  .title-row h2 {
    margin: 0;
  }

  /* Big numbers in a light weight: large, calm, easy to scan. */
  .big {
    font-size: 2.5rem;
    font-weight: 300;
    letter-spacing: -0.03em;
    line-height: 1.1;
  }

  .big span {
    font-size: 1rem;
    opacity: 0.6;
  }

  .hero {
    display: grid;
    align-content: start;
    gap: 4px;
    border-color: transparent;
    background: var(--hero);
  }

  .huge {
    margin-top: 12px;
    font-size: 4.5rem;
    font-weight: 300;
    letter-spacing: -0.05em;
    line-height: 1;
  }

  .huge span {
    font-size: 1.25rem;
    letter-spacing: 0;
  }

  .pill {
    padding: 3px 10px;
    border-radius: 6px;
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--bg);
    background: var(--text);
  }

  .hero-foot {
    display: grid;
    gap: 4px;
    margin-top: 24px;
    padding-top: 14px;
    border-top: 1px solid color-mix(in srgb, var(--text) 12%, transparent);
    font-size: 0.875rem;
  }

  .insight {
    max-width: 60ch;
    margin-bottom: 16px;
    line-height: 1.55;
    opacity: 0.75;
  }

  .tiles {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: 10px;
  }

  .tile {
    display: grid;
    gap: 6px;
    min-width: 0;
    padding: 14px;
    border: 1px solid var(--border);
    border-radius: 14px;
    background: var(--bg);
  }

  .tile a {
    overflow: hidden;
    font-size: 0.875rem;
    font-weight: 500;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .tile-value {
    font-size: 1.375rem;
    font-weight: 400;
    letter-spacing: -0.02em;
    font-variant-numeric: tabular-nums;
  }

  .tile-foot {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    align-items: center;
    gap: 10px;
  }

  .status {
    padding: 2px 8px;
    border-radius: 6px;
    font-size: 0.75rem;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  .status.progressing {
    color: var(--good);
    background: color-mix(in srgb, var(--good) 14%, transparent);
  }

  .status.regressing {
    color: var(--bad);
    background: color-mix(in srgb, var(--bad) 14%, transparent);
  }

  .status.stalled {
    color: var(--warn);
    background: color-mix(in srgb, var(--warn) 16%, transparent);
  }

  .status.flat {
    background: color-mix(in srgb, var(--text) 7%, transparent);
  }

  /* Label left, value right, hairlines between. */
  .rows {
    display: grid;
    margin: 0;
  }

  .rows div {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    justify-content: space-between;
    gap: 4px 12px;
    padding: 11px 0;
    border-top: 1px solid var(--border);
  }

  .rows div:first-child {
    border-top: 0;
    padding-top: 0;
  }

  dt {
    font-size: 0.875rem;
    opacity: 0.7;
  }

  dd {
    display: flex;
    align-items: baseline;
    gap: 10px;
    margin: 0;
    font-weight: 500;
    font-variant-numeric: tabular-nums;
  }

  .legend {
    display: flex;
    flex-wrap: wrap;
    gap: 6px 14px;
    font-size: 0.8125rem;
  }

  /* Each dot matches its stack's shade, from --series down to --series-soft. */
  .legend li::before {
    content: '';
    display: inline-block;
    width: 9px;
    height: 9px;
    margin-right: 6px;
    border-radius: 3px;
    background: color-mix(in srgb, var(--series-soft) calc(var(--shade) * 100%), var(--series));
  }

  .records {
    display: grid;
  }

  .records li {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto auto;
    gap: 12px;
    padding: 10px 0;
    border-top: 1px solid var(--border);
    font-size: 0.875rem;
    font-variant-numeric: tabular-nums;
  }

  .records li:first-child {
    border-top: 0;
    padding-top: 0;
  }

  .records a {
    overflow: hidden;
    font-weight: 500;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .more {
    display: inline-block;
    margin-top: 12px;
    font-size: 0.875rem;
    opacity: 0.6;
  }

  @media (max-width: 899px) {
    .span-4,
    .span-5,
    .span-7,
    .span-8 {
      grid-column: 1 / -1;
    }

    .period {
      justify-items: start;
    }
  }
</style>

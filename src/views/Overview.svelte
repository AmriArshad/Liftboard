<!--
  The home screen: is the training working, and is it consistent? Everything below the
  all-time line follows the chosen period and is compared with the period before it.
-->
<script lang="ts">
  import WeekHeatmap from '../components/charts/WeekHeatmap.svelte'
  import WeeklyBars from '../components/charts/WeeklyBars.svelte'
  import MiniBars from '../components/MiniBars.svelte'
  import Segmented from '../components/Segmented.svelte'
  import Sparkline from '../components/Sparkline.svelte'
  import Stat from '../components/Stat.svelte'
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
    liftTrends,
    periodRange,
    rollingAverage,
    split,
    streaks,
    totals,
    weeksInRange,
    type LiftStatus,
    type Period,
  } from '../lib/metrics/summary'
  import type { Dataset, Unit } from '../lib/parse/types'
  import { href } from '../lib/store/route.svelte'
  import { fromKg } from '../lib/units'

  let { data, unit }: { data: Dataset; unit: Unit } = $props()

  const PERIODS: { value: Period; label: string }[] = [
    { value: '4w', label: '4 weeks' },
    { value: '12w', label: '12 weeks' },
    { value: '26w', label: '6 months' },
    { value: '52w', label: '1 year' },
    { value: 'all', label: 'All' },
  ]
  let period = $state<Period>('12w')
  const periodLabel = $derived(PERIODS.find((p) => p.value === period)!.label.toLowerCase())

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

  const weeks = $derived(weeksInRange(data, range.start, range.end))
  const volumeAverage = $derived(rollingAverage(weeks.map((w) => fromKg(w.volumeKg, unit))))
  const lifts = $derived(liftTrends(data, range.start, range.end, stalled))
  const shares = $derived(split(workouts))
  const weekdays = $derived(byWeekday(workouts))
  const recent = $derived(
    records.filter((r) => r.date >= range.start && r.date < range.end).slice(0, 5),
  )

  const weight = (kg: number) => `${formatWeight(fromKg(kg, unit))} ${unit}`
  const percent = new Intl.NumberFormat(undefined, {
    style: 'percent',
    maximumFractionDigits: 0,
    signDisplay: 'exceptZero',
  })
  const signed = (n: number) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${Math.abs(n)}`

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
  <section class="intro">
    <h1>
      <strong>{formatInteger(all.workouts)}</strong>
      {all.workouts === 1 ? 'workout' : 'workouts'}
    </h1>
    <p>{formatDateRange(all.first, all.last)}</p>
  </section>

  <div class="period">
    <Segmented legend="Period" options={PERIODS} value={period} onchange={(p) => (period = p)} />
    <span>
      {formatDateRange(range.start, lastDay)}{compare ? ` · vs previous ${periodLabel}` : ''}
    </span>
  </div>

  <section class="stats" aria-label="Totals for the period">
    <Stat
      label="Workouts per week"
      value={formatDecimal(now.perWeek)}
      change={change(now.perWeek, compare?.perWeek)}
    />
    <Stat
      label="Volume"
      value="{formatCompact(fromKg(now.volumeKg, unit))} {unit}"
      change={change(now.volumeKg, compare?.volumeKg)}
    />
    <Stat
      label="Working sets"
      value={formatInteger(now.sets)}
      change={change(now.sets, compare?.sets)}
    />
    <Stat
      label="Avg session"
      value={now.avgMinutes === null ? '–' : `${formatInteger(now.avgMinutes)} min`}
      change={now.avgMinutes === null ? null : change(now.avgMinutes, compare?.avgMinutes)}
      better="neither"
    />
    <Stat
      label="New records"
      value={formatInteger(now.personalRecords)}
      change={compare ? now.personalRecords - compare.personalRecords : null}
      changeText={compare ? signed(now.personalRecords - compare.personalRecords) : undefined}
    />
  </section>

  <section class="card consistency">
    <div>
      <h2>Training days</h2>
      <WeekHeatmap {weeks} />
    </div>
    <div class="streak">
      <p class="big">{streak.current} <span>{streak.current === 1 ? 'week' : 'weeks'}</span></p>
      <p class="muted">Current streak</p>
      <dl>
        <div>
          <dt>Longest</dt>
          <dd>{streak.longest} weeks</dd>
        </div>
        <div>
          <dt>This period</dt>
          <dd>{formatDecimal(now.perWeek)} / week</dd>
        </div>
      </dl>
    </div>
  </section>

  <section class="card">
    <h2>Lifts</h2>
    {#if lifts.length === 0}
      <p class="muted">Train a weighted lift twice in this period to see its trend.</p>
    {:else}
      <ul class="lifts">
        {#each lifts as lift (lift.exercise)}
          <li>
            <a href={exerciseLink(lift.exercise)}>{lift.exercise}</a>
            <Sparkline
              points={lift.points}
              tone={lift.status === 'progressing' ? 'highlight' : 'neutral'}
              label="{lift.exercise} e1RM trend"
            />
            <span class="e1rm">{weight(lift.e1rmKg)}</span>
            <span class="status {lift.status}">
              {lift.changePct === null || lift.status === 'stalled'
                ? STATUS_LABEL[lift.status]
                : percent.format(lift.changePct)}
            </span>
          </li>
        {/each}
      </ul>
    {/if}
  </section>

  <section class="card">
    <h2>Weekly volume</h2>
    <WeeklyBars
      {weeks}
      value={(week) => Math.round(fromKg(week.volumeKg, unit))}
      format={(value) => `${formatInteger(value)} ${unit}`}
      label="Weekly volume in {unit}"
      average={{ name: '4-week average', values: volumeAverage }}
    />
  </section>

  <div class="trio">
    <section class="card">
      <h2>Split</h2>
      <ul class="split">
        {#each shares as share (share.title)}
          <li>
            <span class="name">{share.title}</span>
            <span class="pct">{Math.round(share.share * 100)}%</span>
            <span class="track"><span style:width="{share.share * 100}%"></span></span>
          </li>
        {/each}
      </ul>
    </section>

    <section class="card">
      <h2>Weekdays</h2>
      <MiniBars
        bars={weekdays.map((value, i) => ({ label: DAYS[i]!, value }))}
        label="Workouts per weekday, Monday first: {weekdays.join(', ')}"
      />
    </section>

    <section class="card">
      <h2>Recent records</h2>
      {#if recent.length === 0}
        <p class="muted">No new records in this period.</p>
      {:else}
        <ul class="records">
          {#each recent as record (`${record.date.getTime()} ${record.exercise}`)}
            <li>
              <a href={exerciseLink(record.exercise)}>{record.exercise}</a>
              <span class="muted">
                {record.weightKg === null
                  ? `${record.reps} reps`
                  : `${weight(record.weightKg)}${record.reps === null ? '' : ` × ${record.reps}`}`}
                · {formatDate(record.date)}
              </span>
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
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 16px;
    max-width: 960px;
    margin: 0 auto;
    padding: 16px 16px 64px;
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

  .intro p {
    margin: 4px 0 0;
    opacity: 0.6;
  }

  .period {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px 16px;
    margin-top: 16px;
  }

  .period > span {
    font-size: 0.875rem;
    opacity: 0.6;
  }

  .stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 12px;
  }

  .card {
    min-width: 0;
    padding: 16px 18px;
    border-radius: 12px;
    background: var(--surface);
  }

  h2 {
    margin: 0 0 12px;
    font-size: 0.875rem;
    font-weight: 500;
    opacity: 0.6;
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

  /* Calendar beside the streak; stacked on phones. */
  .consistency {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 180px;
    gap: 24px;
  }

  .streak {
    align-self: center;
  }

  .big {
    font-size: 2.25rem;
    font-weight: 600;
    letter-spacing: -0.02em;
    line-height: 1.1;
  }

  .big span {
    font-size: 1rem;
    font-weight: 500;
  }

  dl {
    display: grid;
    gap: 6px;
    margin: 16px 0 0;
    font-size: 0.875rem;
  }

  dl div {
    display: flex;
    justify-content: space-between;
    gap: 8px;
  }

  dt {
    opacity: 0.6;
  }

  dd {
    margin: 0;
    font-weight: 500;
    font-variant-numeric: tabular-nums;
  }

  .lifts li {
    display: grid;
    grid-template-columns: minmax(0, 1.4fr) minmax(60px, 1fr) auto 92px;
    align-items: center;
    gap: 16px;
    padding: 10px 0;
    border-top: 1px solid color-mix(in srgb, var(--text) 8%, transparent);
  }

  .lifts li:first-child {
    border-top: 0;
  }

  .lifts a {
    overflow: hidden;
    font-weight: 500;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .e1rm {
    font-variant-numeric: tabular-nums;
  }

  .status {
    justify-self: end;
    padding: 2px 10px;
    border-radius: 999px;
    font-size: 0.8125rem;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
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
    opacity: 0.6;
  }

  .trio {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 16px;
  }

  .split {
    display: grid;
    gap: 10px;
  }

  .split li {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 4px 8px;
    font-size: 0.875rem;
  }

  .split .name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .split .pct {
    font-variant-numeric: tabular-nums;
    opacity: 0.6;
  }

  .track {
    grid-column: 1 / -1;
    height: 6px;
    border-radius: 3px;
    background: color-mix(in srgb, var(--text) 8%, transparent);
  }

  .track span {
    display: block;
    height: 100%;
    border-radius: 3px;
    background: var(--series);
  }

  .records {
    display: grid;
    gap: 10px;
    font-size: 0.875rem;
  }

  .records li {
    display: grid;
    gap: 2px;
  }

  .records a {
    font-weight: 500;
  }

  .more {
    display: inline-block;
    margin-top: 12px;
    font-size: 0.875rem;
    opacity: 0.6;
  }

  @media (max-width: 767px) {
    .consistency,
    .trio {
      grid-template-columns: minmax(0, 1fr);
    }

    .lifts li {
      grid-template-columns: minmax(0, 1fr) auto auto;
      gap: 10px;
    }

    /* The sparkline earns its place on wide screens; on phones the numbers say enough. */
    .lifts :global(svg) {
      display: none;
    }
  }
</style>

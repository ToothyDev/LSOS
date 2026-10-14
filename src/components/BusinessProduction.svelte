<script lang="ts">
  // Stock, supplies, value and what comes next for one business (issue #6). Collapsed it shows
  // only that; `editing` adds the resync controls. Logic: lib/production.ts.
  import { BAR_SEGMENTS, SUPPLY_PURCHASE } from '../data/business-events'
  import type { Production, ProductionRate } from '../data/production'
  import {
    estimatedParts,
    forecast,
    stockUnits,
    stockValue,
    type KnownRate,
  } from '../lib/production'
  import { formatValue, settleBars, type Bars } from '../lib/resync'
  import BusinessBars from './ui/BusinessBars.svelte'
  import Countdown from './ui/Countdown.svelte'
  import Meter from './ui/Meter.svelte'

  interface Props {
    production: Production
    /** The rate for the bought upgrades, if the data has one. */
    rate: ProductionRate | undefined
    /** The same rate if it can run on its own (its supply use is known). */
    running: KnownRate | undefined
    bars: Bars
    /** Wall-clock time, for supply deliveries. */
    now: number
    /** Show the controls to correct the bars and record sales, raids and supplies. */
    editing: boolean
    onresync: (bars: Bars) => void
  }

  let { production, rate, running, bars, now, editing, onresync }: Props = $props()

  const current = $derived(settleBars(bars, now, SUPPLY_PURCHASE.fillsTo))
  const units = $derived(stockUnits(current, production))
  const value = $derived(rate ? stockValue(current, production, rate) : null)
  const ahead = $derived(running ? forecast(current, production, running) : null)
  const percent = (value: number) => formatValue(value, 'percent')
  // Numbers resting on estimated rates say so (decision 013). The value also counts units made
  // at an estimated rate.
  const estimated = $derived(estimatedParts(rate))
  const est = (label: string, isEstimate: boolean) => (isEstimate ? `${label} (est.)` : label)
</script>

{#if editing}
  <BusinessBars {bars} {now} {onresync} />
{:else}
  <Meter
    label={est('Stock', estimated.production)}
    value={current.stock}
    max={100}
    segments={BAR_SEGMENTS.count}
    valueText="{units} / {production.maxUnits} {production.unitName} · {percent(current.stock)}"
  />
  <Meter
    label={est('Supplies', estimated.production)}
    value={current.supplies ?? 0}
    max={100}
    kind="supplies"
    segments={BAR_SEGMENTS.count}
  />
  {#if current.suppliesDueAt !== undefined}
    <Countdown label="Supplies arrive in" remainingMs={current.suppliesDueAt - now} />
  {/if}
{/if}

{#if value}
  <div class="facts">
    <span class="label">{est('Value', estimated.value || estimated.production)}</span>
    <!-- Far sales pay more, so that is the headline; nearby is the alternative. -->
    <span
      class="value"
      title="Sold {production.farSaleLabel}; {formatValue(value.nearby, 'money')} sold nearby"
    >
      {formatValue(value.far, 'money')} far
      <span class="alt">· {formatValue(value.nearby, 'money')} nearby</span>
    </span>
  </div>
{/if}

{#if ahead}
  <!-- Only what happens first: the other one cannot happen before it. Play time. -->
  {#if ahead.fullInMs !== null}
    <Countdown
      label={est('Full in', estimated.production)}
      remainingMs={ahead.fullInMs}
      readyText="Full"
    />
  {:else}
    <Countdown
      label={est('Supplies out in', estimated.production)}
      remainingMs={ahead.suppliesOutInMs ?? 0}
      readyText="Out"
      readyTone="bad"
    />
  {/if}
  {#if rate?.estimate}
    <p class="note" role="note">
      <strong>Estimate.</strong> No reliable data for these upgrades. {rate.estimate.how}
    </p>
  {/if}
{:else}
  <p class="note" role="note">
    <strong>Not tracked.</strong>
    {#if rate}
      There is no reliable data on how fast this business uses supplies with these upgrades.
    {:else}
      There is no reliable data for this combination of upgrades.
    {/if}
    Stock and supplies stay where you set them.
  </p>
{/if}

<style>
  .facts {
    align-items: baseline;
    display: flex;
    gap: var(--space-3);
    justify-content: space-between;
  }

  .label {
    color: var(--muted);
    font-family: var(--font-display);
    font-size: var(--text-sm);
    letter-spacing: var(--tracking);
    text-transform: uppercase;
  }

  .value {
    font-variant-numeric: tabular-nums;
    text-align: right;
  }

  .alt {
    color: var(--muted);
    font-size: var(--text-sm);
  }

  .note {
    border-left: 3px solid var(--warn);
    font-size: var(--text-sm);
    margin: 0;
    padding-left: var(--space-2);
  }

  .note strong {
    color: var(--warn);
  }
</style>

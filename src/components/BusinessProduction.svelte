<script lang="ts">
  // Stock, supplies, value and what comes next for one business (issue #6). Collapsed it shows
  // only that; `editing` adds the resync controls. Logic: lib/production.ts.
  import { SUPPLY_PURCHASE } from '../data/business-events'
  import type { Production, ProductionRate } from '../data/production'
  import { forecast, stockUnits, stockValue, type KnownRate } from '../lib/production'
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
</script>

{#if editing}
  <BusinessBars {bars} {now} {onresync} />
{:else}
  <Meter
    label="Stock"
    value={current.stock}
    max={100}
    valueText="{units} / {production.maxUnits} {production.unitName} · {percent(current.stock)}"
  />
  <Meter label="Supplies" value={current.supplies ?? 0} max={100} kind="supplies" />
  {#if current.suppliesDueAt !== undefined}
    <Countdown label="Supplies arrive in" remainingMs={current.suppliesDueAt - now} />
  {/if}
{/if}

{#if value}
  <div class="facts">
    <span class="label">Value</span>
    <span class="value" title="Sold {production.farSaleLabel}: {formatValue(value.far, 'money')}">
      {formatValue(value.nearby, 'money')}
      <span class="far">· {formatValue(value.far, 'money')} far</span>
    </span>
  </div>
{/if}

{#if ahead}
  <!-- Only what happens first: the other one cannot happen before it. Play time. -->
  {#if ahead.fullInMs !== null}
    <Countdown label="Full in" remainingMs={ahead.fullInMs} readyText="Full" />
  {:else}
    <Countdown label="Supplies out in" remainingMs={ahead.suppliesOutInMs ?? 0} readyText="Out" />
  {/if}
{:else}
  <p class="hint">
    {#if rate}
      Supply use with these upgrades is not known yet: stock does not rise on its own.
    {:else}
      No production data for these upgrades yet: stock does not rise on its own.
    {/if}
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

  .far,
  .hint {
    color: var(--muted);
    font-size: var(--text-sm);
  }

  .hint {
    margin: 0;
  }
</style>

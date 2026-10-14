<script lang="ts">
  // Stock, supplies, value and countdowns of one business (issue #6). Logic: lib/production.ts.
  import { SUPPLY_PURCHASE } from '../data/business-events'
  import type { Production, ProductionRate } from '../data/production'
  import { forecast, stockUnits, stockValue, type KnownRate } from '../lib/production'
  import { formatValue, settleBars, type Bars } from '../lib/resync'
  import BusinessBars from './ui/BusinessBars.svelte'
  import Countdown from './ui/Countdown.svelte'

  interface Props {
    production: Production
    /** The rate for the bought upgrades, if the data has one. */
    rate: ProductionRate | undefined
    /** The same rate if it can run on its own (its supply use is known). */
    running: KnownRate | undefined
    bars: Bars
    /** Wall-clock time, for supply deliveries. */
    now: number
    onresync: (bars: Bars) => void
  }

  let { production, rate, running, bars, now, onresync }: Props = $props()

  const current = $derived(settleBars(bars, now, SUPPLY_PURCHASE.fillsTo))
  const units = $derived(stockUnits(current, production))
  const value = $derived(rate ? stockValue(current, production, rate) : null)
  const ahead = $derived(running ? forecast(current, production, running) : null)
</script>

<BusinessBars {bars} {now} {onresync} />

<dl>
  <dt>Stock</dt>
  <dd>{units} / {production.maxUnits} {production.unitName}</dd>
  {#if value}
    <dt>Value</dt>
    <dd>
      {formatValue(value.nearby, 'money')}
      <span class="far">{formatValue(value.far, 'money')} {production.farSaleLabel}</span>
    </dd>
  {/if}
</dl>

{#if ahead}
  <div class="countdowns">
    <Countdown
      label="Full in"
      remainingMs={ahead.fullInMs}
      readyText="Full"
      neverText="Supplies run out first"
    />
    <Countdown
      label="Supplies out in"
      remainingMs={ahead.suppliesOutInMs}
      readyText="Out"
      neverText="Last until full"
    />
  </div>
  <p class="hint">Counts play time: runs while the clock runs.</p>
{:else}
  <p class="hint">
    {#if rate}
      How fast this business uses supplies with these upgrades is not known yet, so stock does not
      rise on its own. Set the bars by hand.
    {:else}
      There is no production data for this combination of upgrades yet, so stock does not rise on
      its own. Set the bars by hand.
    {/if}
  </p>
{/if}

<style>
  dl {
    display: grid;
    gap: var(--space-1) var(--space-3);
    grid-template-columns: auto 1fr;
    margin: 0;
  }

  dt {
    color: var(--muted);
    font-family: var(--font-display);
    font-size: var(--text-sm);
    letter-spacing: var(--tracking);
    text-transform: uppercase;
  }

  dd {
    margin: 0;
    text-align: right;
  }

  .far {
    color: var(--muted);
    display: block;
    font-size: var(--text-sm);
  }

  .countdowns {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .hint {
    color: var(--muted);
    font-size: var(--text-sm);
    margin: 0;
  }
</style>

<script lang="ts">
  // Stock, supplies, value and what comes next for one business (issue #6). Collapsed it shows
  // only that; `editing` adds the resync controls. A business with a production boost shows it
  // and lets the user start it (issue #9), and the Mansion boost while it is on (issue #14).
  // Logic: lib/production.ts.
  import { SUPPLY_PURCHASE } from '../data/business-events'
  import type { Production, ProductionRate } from '../data/production'
  import { MANSION_BOOST } from '../data/timers'
  import {
    boostRunning,
    estimatedParts,
    forecastAt,
    nextBoostAt,
    startBoost,
    stockUnits,
    stockValue,
    type Boost,
    type KnownRate,
  } from '../lib/production'
  import { formatValue, settleBars, type Bars } from '../lib/resync'
  import BusinessBars from './ui/BusinessBars.svelte'
  import Button from './ui/Button.svelte'
  import Countdown from './ui/Countdown.svelte'
  import Fact from './ui/Fact.svelte'
  import Meter from './ui/Meter.svelte'

  interface Props {
    production: Production
    /** The rate for the bought upgrades, if the data has one. */
    rate: ProductionRate | undefined
    /** The same rate if it can run on its own (its supply use is known). */
    running: KnownRate | undefined
    /** Shut down from its laptop: nothing is made or used until it runs again (issue #38). */
    shutDown?: boolean
    bars: Bars
    /** Wall-clock time, for supply deliveries. */
    now: number
    /** Show the controls to correct the bars and record sales, raids and supplies. */
    editing: boolean
    onresync: (bars: Bars) => void
    /** What bought upgrades add to the value, e.g. 0.05 for a named product. */
    bonus?: number
    /** The far value adds an owned-property bonus to the far bonus by estimate (decision 019). */
    farEstimated?: boolean
    /** The last production boost, if the business has one (kept after it ends). */
    boost?: Boost
    /** Called with the new boost, or undefined to take back one started by mistake. */
    onboost?: (boost: Boost | undefined) => void
    /** When the Mansion boost on this business ends (wall clock), while it is on (issue #14). */
    mansionEndsAt?: number
  }

  let {
    production,
    rate,
    running,
    shutDown = false,
    bars,
    now,
    editing,
    onresync,
    bonus = 0,
    farEstimated = false,
    boost,
    onboost = () => {},
    mansionEndsAt,
  }: Props = $props()

  const current = $derived(settleBars(bars, now, SUPPLY_PURCHASE.fillsTo))
  const units = $derived(stockUnits(current, production))
  const value = $derived(rate ? stockValue(current, production, rate, bonus) : null)
  const farTitle = $derived(
    value &&
      `Sold ${production.farSale?.label}; ${formatValue(value.nearby, 'money')} sold nearby` +
        (farEstimated
          ? `. Estimate: the ${production.ownedBonus?.label} bonus and the far-sale bonus are ` +
            'added, the lower of the two ways they could combine'
          : ''),
  )
  const boosting = $derived(boostRunning(boost, production.boost, now))
  const nextBoost = $derived(production.boost ? nextBoostAt(boost, production.boost) : 0)
  const mansionOn = $derived(mansionEndsAt !== undefined && now < mansionEndsAt)
  const ahead = $derived(
    running && !shutDown
      ? forecastAt(current, production, running, now, {
          boost,
          mansion: mansionOn ? { endsAt: mansionEndsAt!, speed: MANSION_BOOST.speed } : undefined,
        })
      : null,
  )
  const percent = (value: number) => formatValue(value, 'percent')
  // Numbers resting on estimated rates say so (decision 013). The value also counts units made
  // at an estimated rate.
  // No source gives the speed of both boosts at once: LSOS multiplies them (est.).
  const stacked = $derived(boosting && mansionOn)
  const estimated = $derived.by(() => {
    const parts = estimatedParts(rate)
    return { ...parts, production: parts.production || stacked }
  })
  const est = (label: string, isEstimate: boolean) => (isEstimate ? `${label} (est.)` : label)
</script>

{#if editing}
  <BusinessBars {bars} {now} {onresync} raids={production.raids !== false} />
{:else}
  <Meter
    label={est('Stock', estimated.production)}
    value={current.stock}
    max={100}
    valueText="{units} / {production.maxUnits} {production.unitName} · {percent(current.stock)}"
  />
  <Meter
    label={est('Supplies', estimated.production)}
    value={current.supplies ?? 0}
    max={100}
    kind="supplies"
  />
  {#if current.suppliesDueAt !== undefined}
    <Countdown label="Supplies arrive in" remainingMs={current.suppliesDueAt - now} />
  {/if}
{/if}

{#if value}
  <!-- Far sales pay more, so that is the headline; nearby is the alternative. -->
  <Fact
    label={est('Value', estimated.value || estimated.production)}
    title={value.far !== null ? (farTitle ?? undefined) : undefined}
  >
    {#if value.far !== null}
      {formatValue(value.far, 'money')} far{farEstimated ? ' (est.)' : ''}
      <span class="alt">· {formatValue(value.nearby, 'money')} nearby</span>
    {:else}
      {formatValue(value.nearby, 'money')}
    {/if}
  </Fact>
{/if}

{#if production.boost && running?.boostedMinutesPerUnit !== undefined && !shutDown}
  <!-- Play time while it runs; the next one is a real-time wait (daily reset). -->
  {#if boosting}
    <Fact label="Boost on">
      {Math.ceil(boost!.unitsLeft)}
      {production.unitName} left
      <Button onclick={() => onboost(undefined)} title="Take back a boost started by mistake"
        >Undo</Button
      >
    </Fact>
  {:else if now >= nextBoost}
    <Fact label="Boost ready">
      <Button onclick={() => onboost(startBoost(production.boost!, now))}>Boost started</Button>
    </Fact>
  {/if}
  {#if !boosting && now < nextBoost}
    <Countdown label="Next boost in" remainingMs={nextBoost - now} />
  {/if}
{/if}

{#if mansionOn && !shutDown}
  <Countdown
    label="Mansion boost ×{MANSION_BOOST.speed} ends in"
    remainingMs={mansionEndsAt! - now}
  />
{/if}

{#if shutDown}
  <p class="note quiet" role="note">
    <strong>Shut down.</strong> No stock is made and no supplies are used until you start it again.
  </p>
{:else if ahead}
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
  {#if stacked}
    <p class="note" role="note">
      <strong>Estimate.</strong> No source gives the speed with both boosts on: LSOS takes the
      boosted speed ×{MANSION_BOOST.speed}.
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

  .note.quiet {
    border-left-color: var(--muted);
  }

  .note strong {
    color: var(--warn);
  }

  .note.quiet strong {
    color: inherit;
  }
</style>

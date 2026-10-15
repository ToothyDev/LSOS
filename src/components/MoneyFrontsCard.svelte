<script lang="ts">
  // The Money Fronts safe in the Car Wash (issue #11): money, payout, next payout, time until
  // full and until the Car Wash stops it, and a heat bar per owned front. `editing` adds the resync controls and the mission and
  // legal-job buttons. Logic: lib/fronts.ts.
  import { CAR_WASH, FRONTS_CAPACITY, FRONTS_ESTIMATE, HEAT_PER_MISSION } from '../data/fronts'
  import type { Property } from '../data/properties'
  import {
    frontPay,
    fullInMs,
    heatOf,
    legalJob,
    MAX_HEAT,
    maxHeatInMs,
    mission,
    ownedFronts,
    payoutParts,
    setHeat,
    syncFronts,
  } from '../lib/fronts'
  import type { OwnedProperties } from '../lib/properties'
  import { formatValue } from '../lib/resync'
  import { nextPayoutInMs, type SafeState } from '../lib/safes'
  import Button from './ui/Button.svelte'
  import Countdown from './ui/Countdown.svelte'
  import EditableValue from './ui/EditableValue.svelte'
  import Meter from './ui/Meter.svelte'

  interface Props {
    catalog: readonly Property[]
    owned: OwnedProperties
    onchange: (owned: OwnedProperties) => void
    safeState: SafeState
    /** Show the controls to correct money and heat, log missions and sync the payout time. */
    editing: boolean
    onresync: (safeState: SafeState) => void
  }

  let { catalog, owned, onchange, safeState: current, editing, onresync }: Props = $props()

  const fronts = $derived(ownedFronts(owned))
  const parts = $derived(payoutParts(current, owned, catalog))
  // "Full in" assumes heat stays where it is, like popularity on the other safes.
  const full = $derived(fullInMs(current, owned, catalog))
  const stopsIn = $derived(maxHeatInMs(current, owned, CAR_WASH))
  const money = (value: number) => formatValue(value, 'money')
  const stopped = $derived(fronts.filter((f) => heatOf(current, f.propertyId) >= MAX_HEAT))
  const carWashStopped = $derived(stopped.some((f) => f.propertyId === CAR_WASH))

  function log(frontId: string, kind: 'laundering' | 'faber') {
    const next = mission(current, owned, catalog, frontId, kind)
    onchange(next.owned)
    onresync(next.state)
  }
</script>

{#each fronts as front (front.propertyId)}
  {@const heat = heatOf(current, front.propertyId)}
  {#if editing}
    <EditableValue
      label="{front.label} heat (est.)"
      value={heat}
      unit="percent"
      min={0}
      max={MAX_HEAT}
      onresync={(value) => onresync(setHeat(current, front.propertyId, value))}
    >
      <Meter
        label="{front.label} heat"
        value={heat}
        max={MAX_HEAT}
        kind="heat"
        segments={MAX_HEAT / HEAT_PER_MISSION}
        bare
        onset={(value) => onresync(setHeat(current, front.propertyId, value))}
      />
    </EditableValue>
    <div class="actions">
      <Button
        title="A laundering mission launched here: +{HEAT_PER_MISSION}% heat, counts toward doubling this front's pay"
        onclick={() => log(front.propertyId, 'laundering')}>Laundering +{HEAT_PER_MISSION}%</Button
      >
      <Button
        title="A Mr. Faber job launched here: +{HEAT_PER_MISSION}% heat, counts toward doubling every front's pay"
        onclick={() => log(front.propertyId, 'faber')}>Faber job +{HEAT_PER_MISSION}%</Button
      >
      <Button
        title="Legal work here (washing cars, a helitour, a weed delivery) clears the heat"
        onclick={() => onresync(legalJob(current, front.propertyId))}>Legal job</Button
      >
    </div>
  {:else}
    <Meter
      label="{front.label} heat (est.)"
      value={heat}
      max={MAX_HEAT}
      kind="heat"
      segments={MAX_HEAT / HEAT_PER_MISSION}
    />
  {/if}
{/each}

{#if carWashStopped}
  <p class="warn" role="note">
    <strong>Safe stopped.</strong> The Car Wash is at 100% heat: the safe gets nothing until you do a
    legal job there.
  </p>
{:else if stopped.length > 0}
  <p class="warn" role="note">
    <strong>Front stopped.</strong>
    {stopped.map((f) => `${f.label} (${money(frontPay(f, owned, catalog))})`).join(', ')}
    {stopped.length === 1 ? 'is' : 'are'} at 100% heat and pay nothing until a legal job there.
  </p>
{/if}

{#if editing}
  <EditableValue
    label="Safe"
    value={current.money}
    unit="money"
    min={0}
    max={FRONTS_CAPACITY}
    presets={[
      { label: 'Collected', value: 0 },
      { label: 'Full', value: FRONTS_CAPACITY },
    ]}
    onresync={(value) => onresync({ ...current, money: value })}
  />
{:else}
  <Meter
    label="Safe"
    value={current.money}
    max={FRONTS_CAPACITY}
    valueText="{money(current.money)} / {money(FRONTS_CAPACITY)}"
  />
{/if}

<div class="facts">
  <span class="label">Payout</span>
  <span class="value">{money(parts.fronts + parts.others)} a day</span>
</div>
<p class="hint">
  Fronts {money(parts.fronts)} + your other businesses {money(parts.others)}. Biker businesses and
  the Bunker only count while set up and not paused.
</p>

<Countdown label="Next payout in" remainingMs={nextPayoutInMs(current)} />
{#if editing}
  <div class="actions">
    <Button onclick={() => onresync(syncFronts(current, owned, catalog))}
      >Payout just arrived</Button
    >
    <p class="hint">Press when the game says money was added to this safe.</p>
  </div>
{/if}
{#if full === null}
  <p class="hint">Never full: this safe gets nothing a day.</p>
{:else}
  <Countdown label="Full in" remainingMs={full} readyText="Full" />
{/if}
{#if stopsIn !== null && stopsIn > 0}
  <Countdown label="Car Wash 100% heat in (est.)" remainingMs={stopsIn} />
{/if}

<p class="hint" role="note">{FRONTS_ESTIMATE}</p>

<style>
  p {
    margin: 0;
  }

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
  }

  .actions {
    align-items: center;
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2) var(--space-3);
  }

  .warn {
    border-left: 3px solid var(--warn);
    font-size: var(--text-sm);
    padding-left: var(--space-2);
  }

  .warn strong {
    color: var(--warn);
  }

  .hint {
    color: var(--muted);
    font-size: var(--text-xs);
  }
</style>

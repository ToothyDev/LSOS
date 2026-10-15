<script lang="ts">
  // The Money Fronts safe in the Car Wash (issue #11): money, payout, next payout, time until
  // full (or until the Car Wash stops it, if sooner), and a heat bar per owned front. `editing` adds the resync controls and the mission and
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
  import Fact from './ui/Fact.svelte'
  import EditableBar from './ui/EditableBar.svelte'
  import EditableValue from './ui/EditableValue.svelte'
  import Hint from './ui/Hint.svelte'
  import Meter from './ui/Meter.svelte'
  import Note from './ui/Note.svelte'

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
  // Whichever comes first: the safe filling up, or the Car Wash stopping it at 100% heat.
  const stopsFirst = $derived(full !== null && stopsIn !== null && stopsIn < full)
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
    <EditableBar
      label="{front.label} heat (est.)"
      value={heat}
      kind="heat"
      segments={MAX_HEAT / HEAT_PER_MISSION}
      onresync={(value) => onresync(setHeat(current, front.propertyId, value))}
    />
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
  <Note title="Safe stopped.">
    The Car Wash is at 100% heat: the safe gets nothing until you do a legal job there.
  </Note>
{:else if stopped.length > 0}
  <Note title="Front stopped.">
    {stopped.map((f) => `${f.label} (${money(frontPay(f, owned, catalog))})`).join(', ')}
    {stopped.length === 1 ? 'is' : 'are'} at 100% heat and pay nothing until a legal job there.
  </Note>
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

<Fact label="Payout">{money(parts.fronts + parts.others)} a day</Fact>
<Hint fine>
  Fronts {money(parts.fronts)} + your other businesses {money(parts.others)}. A shut-down business
  adds nothing.
</Hint>

<Countdown label="Next payout in" remainingMs={nextPayoutInMs(current)} />
{#if editing}
  <div class="actions">
    <Button onclick={() => onresync(syncFronts(current, owned, catalog))}
      >Payout just arrived</Button
    >
    <Hint fine>Press when the game says money was added to this safe.</Hint>
  </div>
{/if}
{#if full === null}
  <Hint fine>Never full: this safe gets nothing a day.</Hint>
{:else if stopsFirst}
  <Countdown label="Car Wash max heat in (est.)" remainingMs={stopsIn ?? 0} />
  <Hint fine>The safe stops before it is full unless you do a legal job at the Car Wash.</Hint>
{:else}
  <Countdown label="Full in" remainingMs={full} readyText="Full" />
{/if}

<Hint fine role="note">{FRONTS_ESTIMATE}</Hint>

<style>
  .actions {
    align-items: center;
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2) var(--space-3);
  }
</style>

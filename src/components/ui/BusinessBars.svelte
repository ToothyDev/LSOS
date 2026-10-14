<script lang="ts">
  import { BUSINESS_EVENTS, SUPPLY_PURCHASE } from '../../data/business-events'
  import {
    applyEvent,
    buySupplies,
    formatValue,
    settleBars,
    undoBars,
    type Bars,
  } from '../../lib/resync'
  import Button from './Button.svelte'
  import Countdown from './Countdown.svelte'
  import EditableValue from './EditableValue.svelte'
  import Meter from './Meter.svelte'

  interface Props {
    /** Stock and supplies in percent; leave supplies out for a business with only a stock bar. */
    bars: Bars
    /** Wall-clock time, for supply deliveries (real time until confirmed, issue #4). */
    now: number
    /** Called with the corrected bars; the tracker stores them as of now (decision 003). */
    onresync: (bars: Bars) => void
  }

  let { bars: stored, now, onresync }: Props = $props()

  // The bars as of now, with an arrived delivery filled in. Every change starts from these.
  const bars = $derived(settleBars(stored, now, SUPPLY_PURCHASE.fillsTo))
  const dueAt = $derived(bars.suppliesDueAt)

  const events = $derived(
    Object.values(BUSINESS_EVENTS).filter(
      (event) => bars.supplies !== undefined || !event.empties.includes('supplies'),
    ),
  )

  // One undo for the whole business: the last edit, Full or event, whichever bars it changed.
  let last = $state<{ before: Bars; after: Bars; label: string } | null>(null)

  function set(after: Bars, label: string) {
    if (
      after.stock === bars.stock &&
      after.supplies === bars.supplies &&
      after.suppliesDueAt === bars.suppliesDueAt
    )
      return
    last = { before: { ...bars }, after, label }
    onresync(after)
  }

  function undo() {
    if (!last) return
    onresync(undoBars(last, bars))
    last = null
  }

  const FULL = [{ label: 'Full', value: 100 }]

  function buy() {
    set(buySupplies(bars, now, SUPPLY_PURCHASE.deliveryMs), SUPPLY_PURCHASE.label)
  }
</script>

<div class="bars">
  <EditableValue
    label="Stock"
    value={bars.stock}
    unit="percent"
    min={0}
    max={100}
    presets={FULL}
    undoable={false}
    onresync={(stock) => set({ ...bars, stock }, `stock was ${formatValue(bars.stock, 'percent')}`)}
  >
    <Meter label="Stock" value={bars.stock} max={100} bare />
  </EditableValue>
  {#if bars.supplies !== undefined}
    <EditableValue
      label="Supplies"
      value={bars.supplies}
      unit="percent"
      min={0}
      max={100}
      undoable={false}
      onresync={(supplies) =>
        set({ ...bars, supplies }, `supplies was ${formatValue(bars.supplies ?? 0, 'percent')}`)}
    >
      <Meter label="Supplies" value={bars.supplies} max={100} kind="supplies" bare />
      {#if dueAt !== undefined}
        <Countdown label="Supplies arrive in" remainingMs={dueAt - now} />
      {/if}
      <div class="actions">
        <Button onclick={buy} disabled={dueAt !== undefined}>{SUPPLY_PURCHASE.label}</Button>
      </div>
    </EditableValue>
  {/if}
  <div class="actions">
    {#each events as event (event.label)}
      <Button onclick={() => set(applyEvent(bars, event), event.label)}>{event.label}</Button>
    {/each}
    {#if last}
      <Button onclick={undo} title="Take back the last change ({last.label})">Undo</Button>
    {/if}
  </div>
</div>

<style>
  .bars {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
  }
</style>

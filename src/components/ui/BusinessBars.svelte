<script lang="ts">
  import { BAR_SEGMENTS, BUSINESS_EVENTS, SUPPLY_PURCHASE } from '../../data/business-events'
  import {
    applyEvent,
    buySupplies,
    formatValue,
    recordEdit,
    settleBars,
    undoBars,
    type Bars,
    type BarsEdit,
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
    /** False for a business that cannot be raided: no "Raided" button. */
    raids?: boolean
  }

  let { bars: stored, now, onresync, raids = true }: Props = $props()

  // The bars as of now, with an arrived delivery filled in. Every change starts from these.
  const bars = $derived(settleBars(stored, now, SUPPLY_PURCHASE.fillsTo))
  const dueAt = $derived(bars.suppliesDueAt)

  const events = $derived(
    Object.entries(BUSINESS_EVENTS)
      .filter(([id]) => raids || id !== 'raided')
      .map(([, event]) => event)
      .filter((event) => bars.supplies !== undefined || !event.empties.includes('supplies')),
  )

  // One undo for the whole business: the last edit, Full or event, whichever bars it changed.
  // Dragging and nudging one bar with the keys in a row count as one edit.
  let last = $state<BarsEdit | null>(null)
  // The level under the pointer while a bar is dragged, shown as its value.
  let dragging = $state<{ stock: number | null; supplies: number | null }>({
    stock: null,
    supplies: null,
  })

  function set(after: Bars, label: string, group?: string) {
    if (
      after.stock === bars.stock &&
      after.supplies === bars.supplies &&
      after.suppliesDueAt === bars.suppliesDueAt
    )
      return
    last = recordEdit(last, bars, after, label, group)
    onresync(after)
  }

  function undo() {
    if (!last) return
    onresync(undoBars(last, bars))
    last = null
  }

  function buy() {
    set(buySupplies(bars, now, SUPPLY_PURCHASE.deliveryMs), SUPPLY_PURCHASE.label)
  }
</script>

<div class="bars">
  <EditableValue
    label="Stock"
    value={dragging.stock ?? bars.stock}
    unit="percent"
    min={0}
    max={100}
    undoable={false}
    onresync={(stock) => set({ ...bars, stock }, `stock was ${formatValue(bars.stock, 'percent')}`)}
  >
    <Meter
      label="Stock"
      value={bars.stock}
      max={100}
      segments={BAR_SEGMENTS.count}
      bare
      onpreview={(value) => (dragging.stock = value)}
      onset={(stock) =>
        set({ ...bars, stock }, `stock was ${formatValue(bars.stock, 'percent')}`, 'stock')}
    />
  </EditableValue>
  {#if bars.supplies !== undefined}
    <EditableValue
      label="Supplies"
      value={dragging.supplies ?? bars.supplies}
      unit="percent"
      min={0}
      max={100}
      undoable={false}
      onresync={(supplies) =>
        set({ ...bars, supplies }, `supplies was ${formatValue(bars.supplies ?? 0, 'percent')}`)}
    >
      <Meter
        label="Supplies"
        value={bars.supplies}
        max={100}
        kind="supplies"
        segments={BAR_SEGMENTS.count}
        bare
        onpreview={(value) => (dragging.supplies = value)}
        onset={(supplies) =>
          set(
            { ...bars, supplies },
            `supplies was ${formatValue(bars.supplies ?? 0, 'percent')}`,
            'supplies',
          )}
      />
      {#if dueAt !== undefined}
        <Countdown label="Supplies arrive in" remainingMs={dueAt - now} />
      {/if}
    </EditableValue>
  {/if}
  <!-- All actions in one row to keep the card short. -->
  <div class="actions">
    <Button
      onclick={() =>
        set({ ...bars, stock: 100 }, `stock was ${formatValue(bars.stock, 'percent')}`)}
      >Full</Button
    >
    {#if bars.supplies !== undefined}
      <Button onclick={buy} disabled={dueAt !== undefined}>{SUPPLY_PURCHASE.label}</Button>
    {/if}
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

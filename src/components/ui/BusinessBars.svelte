<script lang="ts">
  import { BUSINESS_EVENTS } from '../../data/business-events'
  import { applyEvent, formatValue, undoBars, type Bars } from '../../lib/resync'
  import Button from './Button.svelte'
  import EditableValue from './EditableValue.svelte'
  import Meter from './Meter.svelte'

  interface Props {
    /** Stock and supplies in percent; leave supplies out for a business with only a stock bar. */
    bars: Bars
    /** Called with the corrected bars; the tracker stores them as of now (decision 003). */
    onresync: (bars: Bars) => void
  }

  let { bars, onresync }: Props = $props()

  const events = $derived(
    Object.values(BUSINESS_EVENTS).filter(
      (event) => bars.supplies !== undefined || !event.empties.includes('supplies'),
    ),
  )

  // One undo for the whole business: the last edit, Full or event, whichever bars it changed.
  let last = $state<{ before: Bars; after: Bars; label: string } | null>(null)

  function set(after: Bars, label: string) {
    if (after.stock === bars.stock && after.supplies === bars.supplies) return
    last = { before: { ...bars }, after, label }
    onresync(after)
  }

  function undo() {
    if (!last) return
    onresync(undoBars(last, bars))
    last = null
  }

  const FULL = [{ label: 'Full', value: 100 }]
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
      presets={FULL}
      undoable={false}
      onresync={(supplies) =>
        set({ ...bars, supplies }, `supplies was ${formatValue(bars.supplies ?? 0, 'percent')}`)}
    >
      <Meter label="Supplies" value={bars.supplies} max={100} kind="supplies" bare />
    </EditableValue>
  {/if}
  <div class="actions">
    {#each events as event (event.label)}
      <Button onclick={() => set(applyEvent(bars, event.empties), event.label)}
        >{event.label}</Button
      >
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

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
  import EditableBar from './EditableBar.svelte'

  interface Props {
    /** Stock and supplies in percent; leave supplies out for a business with only a stock bar. */
    bars: Bars
    /** Wall-clock time, for supply deliveries (real time until confirmed, issue #4). */
    now: number
    /** Called with the corrected bars; the tracker stores them as of now (decision 003). */
    onresync: (bars: Bars) => void
    /** Bar labels, e.g. with "(est.)" when the rates are estimated (decision 013). */
    stockLabel?: string
    suppliesLabel?: string
    /** Muted text after the stock label, e.g. "40 / 100 units". */
    stockDetail?: string
  }

  let {
    bars: stored,
    now,
    onresync,
    stockLabel = 'Stock',
    suppliesLabel = 'Supplies',
    stockDetail,
  }: Props = $props()

  // The bars as of now, with an arrived delivery filled in. Every change starts from these.
  const bars = $derived(settleBars(stored, now, SUPPLY_PURCHASE.fillsTo))
  const dueAt = $derived(bars.suppliesDueAt)

  const sold = BUSINESS_EVENTS.sold

  // One undo for the whole business: the last edit or event, whichever bars it changed.
  // Dragging and nudging one bar with the keys in a row count as one edit.
  let last = $state<BarsEdit | null>(null)

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
  <EditableBar
    label={stockLabel}
    detail={stockDetail}
    value={bars.stock}
    segments={BAR_SEGMENTS.count}
    undoable={false}
    onresync={(stock) => set({ ...bars, stock }, `stock was ${formatValue(bars.stock, 'percent')}`)}
    onset={(stock) =>
      set({ ...bars, stock }, `stock was ${formatValue(bars.stock, 'percent')}`, 'stock')}
  />
  {#if bars.supplies !== undefined}
    <EditableBar
      label={suppliesLabel}
      value={bars.supplies}
      kind="supplies"
      segments={BAR_SEGMENTS.count}
      undoable={false}
      onresync={(supplies) =>
        set({ ...bars, supplies }, `supplies was ${formatValue(bars.supplies ?? 0, 'percent')}`)}
      onset={(supplies) =>
        set(
          { ...bars, supplies },
          `supplies was ${formatValue(bars.supplies ?? 0, 'percent')}`,
          'supplies',
        )}
    >
      {#if dueAt !== undefined}
        <Countdown label="Supplies arrive in" remainingMs={dueAt - now} />
      {/if}
    </EditableBar>
  {/if}
  <!-- All actions in one row to keep the card short. -->
  <div class="actions">
    {#if bars.supplies !== undefined}
      <Button onclick={buy} disabled={dueAt !== undefined}>{SUPPLY_PURCHASE.label}</Button>
    {/if}
    <Button onclick={() => set(applyEvent(bars, sold), sold.label)}>{sold.label}</Button>
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

<script lang="ts">
  // Nightclub warehouse goods: one row per category with stock, value and when it is full, the
  // next one to fill highlighted (issue #7). `editing` swaps the rows for resync fields.
  // Logic: lib/nightclub.ts.
  import { FLOORS_ESTIMATE, type Goods } from '../data/nightclub'
  import type { Property } from '../data/properties'
  import {
    capacity,
    fullInMs,
    goodsValue,
    isProducing,
    isUnlocked,
    nextToFill,
    warehouseSetup,
    wholeCrates,
    type GoodsStock,
  } from '../lib/nightclub'
  import type { OwnedProperties } from '../lib/properties'
  import { formatValue } from '../lib/resync'
  import Countdown from './ui/Countdown.svelte'
  import EditableValue from './ui/EditableValue.svelte'
  import Meter from './ui/Meter.svelte'

  interface Props {
    goods: readonly Goods[]
    nightclub: Property
    owned: OwnedProperties
    stock: GoodsStock
    /** Show the fields to correct each category's crates. */
    editing: boolean
    onresync: (goodsId: string, crates: number) => void
  }

  let { goods, nightclub, owned, stock, editing, onresync }: Props = $props()

  const setup = $derived(warehouseSetup(owned, nightclub))
  const crates = (id: string) => stock[id] ?? 0
  // Collapsed: what is being made, and anything else still in stock (e.g. from Business Battles).
  const shown = $derived(
    goods.filter((g) => isProducing(g, setup, owned) || wholeCrates(crates(g.id)) > 0),
  )
  const next = $derived(nextToFill(goods, stock, setup, owned))
  const total = $derived(goods.reduce((sum, g) => sum + goodsValue(g, crates(g.id)), 0))
  const estimated = $derived(capacity(goods[0]!, setup.floors).estimated)
  const locked = $derived(
    goods.filter((g) => setup.assigned.includes(g.id) && !isUnlocked(g, owned)),
  )
  const est = (label: string) => (estimated ? `${label} (est.)` : label)
</script>

{#if editing}
  {#each goods as g (g.id)}
    {@const cap = capacity(g, setup.floors).crates}
    <EditableValue
      label={est(g.label)}
      value={crates(g.id)}
      unit="crates"
      min={0}
      max={cap}
      presets={[
        { label: 'Sold', value: 0 },
        { label: 'Full', value: cap },
      ]}
      onresync={(value) => onresync(g.id, value)}
    >
      <Meter label={g.label} value={crates(g.id)} max={cap} bare />
    </EditableValue>
  {/each}
{:else if shown.length === 0}
  <p class="hint">No technician is making goods. Assign one in this card's settings.</p>
{:else}
  {#each shown as g (g.id)}
    {@const cap = capacity(g, setup.floors).crates}
    {@const whole = wholeCrates(crates(g.id))}
    <div class="row" class:next={next === g.id}>
      <Meter
        label={est(g.label)}
        value={crates(g.id)}
        max={cap}
        valueText="{whole} / {cap} · {formatValue(goodsValue(g, crates(g.id)), 'money')}"
      />
      {#if isProducing(g, setup, owned)}
        <Countdown
          label={est(next === g.id ? 'Next full in' : 'Full in')}
          remainingMs={fullInMs(g, crates(g.id), setup)}
          readyText="Full"
        />
      {:else}
        <p class="hint">Not being made.</p>
      {/if}
    </div>
  {/each}
{/if}

<div class="facts">
  <span class="label">Total value</span>
  <span class="value">{formatValue(total, 'money')}</span>
</div>

{#if locked.length > 0}
  <p class="note" role="note">
    <strong>Locked.</strong>
    {locked.map((g) => g.label).join(', ')}: own the business that makes
    {locked.length === 1 ? 'it' : 'them'} to start production.
  </p>
{/if}
{#if setup.doubled}
  <p class="note" role="note">
    <strong>Two technicians on one category.</strong> The game allows one technician per category, so
    only one counts.
  </p>
{/if}
{#if estimated}
  <p class="note" role="note"><strong>Estimate.</strong> {FLOORS_ESTIMATE}</p>
{/if}

<style>
  .row {
    border-left: 3px solid transparent;
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    padding-left: var(--space-2);
  }

  .row.next {
    border-left-color: var(--accent);
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

  .hint {
    color: var(--muted);
    font-size: var(--text-sm);
    margin: 0;
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

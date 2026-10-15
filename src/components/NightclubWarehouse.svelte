<script lang="ts">
  // Nightclub warehouse goods: one row per category with stock, value and when it is full, the
  // next one to fill highlighted, and the most profitable technician setup for what the user
  // owns (issue #7). Crates can be typed in on each row (issue #60). Logic: lib/nightclub.ts.
  import type { Goods } from '../data/nightclub'
  import type { Property } from '../data/properties'
  import {
    capacity,
    fullGoods,
    fullInMs,
    goodsValue,
    isProducing,
    isUnlocked,
    nextToFill,
    suggestTechnicians,
    warehouseSetup,
    wholeCrates,
    type GoodsStock,
  } from '../lib/nightclub'
  import { setUpgrade, type OwnedProperties } from '../lib/properties'
  import { formatDuration } from '../lib/clock'
  import { formatValue } from '../lib/resync'
  import Button from './ui/Button.svelte'
  import Digits from './ui/Digits.svelte'
  import EditableValue from './ui/EditableValue.svelte'
  import Fact from './ui/Fact.svelte'
  import Hint from './ui/Hint.svelte'
  import Meter from './ui/Meter.svelte'
  import Note from './ui/Note.svelte'

  interface Props {
    goods: readonly Goods[]
    nightclub: Property
    owned: OwnedProperties
    onchange: (owned: OwnedProperties) => void
    stock: GoodsStock
    onresync: (goodsId: string, crates: number) => void
  }

  let { goods, nightclub, owned, onchange, stock, onresync }: Props = $props()

  const setup = $derived(warehouseSetup(owned, nightclub))
  const crates = (id: string) => stock[id] ?? 0
  // Collapsed: what is being made, and anything else still in stock (e.g. from Business Battles).
  const shown = $derived(
    goods.filter((g) => isProducing(g, setup, owned) || wholeCrates(crates(g.id)) > 0),
  )
  const next = $derived(nextToFill(goods, stock, setup, owned))
  const total = $derived(goods.reduce((sum, g) => sum + goodsValue(g, crates(g.id)), 0))
  const locked = $derived(
    goods.filter((g) => setup.assigned.includes(g.id) && !isUnlocked(g, owned)),
  )
  const suggestion = $derived(suggestTechnicians(goods, stock, owned, nightclub))
  // Full goods earn nothing until sold. Where a better job exists the suggestion names it;
  // otherwise selling is the only way to get the technician earning again.
  const full = $derived(fullGoods(goods, stock, setup, owned))
  const fullStuck = $derived(full.filter((id) => !suggestion?.moves.some((m) => m.from === id)))
  const label = (id: string) => goods.find((g) => g.id === id)?.label ?? 'nothing'

  function applySuggestion() {
    if (!suggestion) return
    let next = owned
    for (const move of suggestion.moves) {
      next = setUpgrade(next, nightclub.id, `technician-${move.technician}`, move.to)
    }
    onchange(next)
  }
</script>

{#if shown.length === 0}
  <Hint>No technician is making goods. Assign one in this card's settings.</Hint>
{:else}
  <!-- Two lines per goods type: name, value and crates (click to type them), then the bar with
       its play time to full. The time column has one header instead of a label on every row. -->
  <div class="head" aria-hidden="true"><span>Goods</span><span>Full in</span></div>
  {#each shown as g (g.id)}
    {@const cap = capacity(g, setup.floors)}
    {@const ms = fullInMs(g, crates(g.id), setup)}
    {@const producing = isProducing(g, setup, owned)}
    <div class="row" class:next={next === g.id}>
      <EditableValue
        label={g.label}
        detail="{formatValue(goodsValue(g, crates(g.id)), 'money')} · max {cap}"
        value={crates(g.id)}
        unit="crates"
        min={0}
        max={cap}
        presets={[{ label: 'Sold', value: 0 }]}
        inlinePresets
        onresync={(value) => onresync(g.id, value)}
      >
        <div class="bottom">
          <Meter label={g.label} value={crates(g.id)} max={cap} bare />
          {#if !producing}
            <span class="time idle">Idle</span>
          {:else if ms <= 0}
            <span class="time full">Full</span>
          {:else}
            <span class="time" aria-label="Full in {formatDuration(ms)}"
              ><Digits text={formatDuration(ms)} /></span
            >
          {/if}
        </div>
      </EditableValue>
    </div>
  {/each}
{/if}

<Fact label="Total value">{formatValue(total, 'money')}</Fact>

{#each fullStuck as id (id)}
  <Note title="{label(id)} is full.">Sell it: its technician makes nothing until then.</Note>
{/each}

{#if suggestion}
  <Note tone="good" title="More per hour:">
    {#each suggestion.moves as move (move.technician)}
      {#if full.includes(move.from)}
        <span class="move"
          >{label(move.from)} is full. Sell it, or move technician {move.technician} to
          {label(move.to)}.</span
        >
      {:else}
        <span class="move"
          >Technician {move.technician}: {label(move.to)}
          <span class="was">(now {label(move.from)})</span></span
        >
      {/if}
    {/each}
    {#snippet actions()}
      <div class="apply">
        <span class="gain">+{formatValue(suggestion.gainPerHour, 'money')} / h</span>
        <Button onclick={applySuggestion}>Move</Button>
      </div>
    {/snippet}
  </Note>
{/if}

{#if locked.length > 0}
  <Note title="Locked.">
    {locked.map((g) => g.label).join(', ')}: own the business that makes
    {locked.length === 1 ? 'it' : 'them'}, and keep it running, to start production.
  </Note>
{/if}
{#if setup.doubled}
  <Note title="Two technicians on one category."
    >The game allows one technician per category, so only one counts.</Note
  >
{/if}

<style>
  .head {
    color: var(--muted);
    display: flex;
    font-family: var(--font-display);
    font-size: var(--text-xs);
    gap: var(--space-2);
    justify-content: space-between;
    letter-spacing: var(--tracking);
    text-transform: uppercase;
    padding-left: calc(var(--space-2) + 3px);
  }

  .row {
    border-left: 3px solid transparent;
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
    padding-left: var(--space-2);
  }

  .row.next {
    border-left-color: var(--accent);
  }

  .bottom {
    align-items: center;
    display: grid;
    gap: var(--space-2);
    grid-template-columns: minmax(0, 1fr) 4.5rem;
  }

  .time {
    color: var(--warn);
    font-family: var(--font-display);
    letter-spacing: var(--tracking);
    text-align: right;
    text-transform: uppercase;
  }

  .time.full {
    color: var(--accent-text);
  }

  .time.idle {
    color: var(--muted);
    font-size: var(--text-sm);
  }

  .move {
    display: block;
  }

  .was {
    color: var(--muted);
  }

  .apply {
    align-items: center;
    display: flex;
    gap: var(--space-3);
    justify-content: space-between;
  }

  .gain {
    color: var(--accent-text);
    font-variant-numeric: tabular-nums;
  }
</style>

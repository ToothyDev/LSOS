<script lang="ts">
  // One property safe (issue #8): money, payout, next payout and time until full, and the
  // nightclub's popularity. Collapsed it shows only that; `editing` adds the resync controls.
  // Logic: lib/safes.ts.
  import type { Property } from '../data/properties'
  import type { Safe } from '../data/safes'
  import type { OwnedProperties } from '../lib/properties'
  import { formatValue } from '../lib/resync'
  import {
    bestPayout,
    capacity,
    dailyPayout,
    DAY_MS,
    estimatedParts,
    fullInMs,
    nextPayoutInMs,
    type SafeState,
  } from '../lib/safes'
  import Countdown from './ui/Countdown.svelte'
  import EditableValue from './ui/EditableValue.svelte'
  import Meter from './ui/Meter.svelte'

  interface Props {
    safe: Safe
    property: Property
    owned: OwnedProperties
    safeState: SafeState
    /** Show the controls to correct money, popularity and the next payout. */
    editing: boolean
    onresync: (safeState: SafeState) => void
  }

  let { safe, property, owned, safeState: current, editing, onresync }: Props = $props()

  const cap = $derived(capacity(safe, owned, property))
  const payout = $derived(dailyPayout(safe, owned, property, current.popularity))
  const best = $derived(bestPayout(safe, owned, property))
  const full = $derived(fullInMs(current, safe, owned, property))
  const estimated = $derived(estimatedParts(safe, owned, property))
  // Popularity falls at an estimated rate, so the time to full rests on it too.
  const est = (label: string, isEstimate: boolean) => (isEstimate ? `${label} (est.)` : label)
  const money = (value: number) => formatValue(value, 'money')
  // The lowest popularity that still pays the most: below it the payout is cut.
  const maxFrom = $derived(safe.payout.kind === 'popularity' ? safe.payout.rows[0]!.from : 0)
  const popularity = $derived(current.popularity)
  let dragging = $state<number | null>(null)
</script>

{#if popularity !== undefined}
  {#if editing}
    <EditableValue
      label={est('Popularity', estimated.popularity)}
      value={dragging ?? popularity}
      unit="percent"
      min={0}
      max={100}
      presets={[
        { label: 'Maxed', value: 100, title: 'Full bar, e.g. after switching to a new DJ' },
        ...(safe.popularity?.boosts ?? []).map((boost) => ({
          label: boost.label,
          value: Math.min(100, popularity + boost.adds),
          title: boost.title,
        })),
      ]}
      onresync={(value) => onresync({ ...current, popularity: value })}
    >
      <Meter
        label="Popularity"
        value={popularity}
        max={100}
        bare
        onpreview={(value) => (dragging = value)}
        onset={(value) => onresync({ ...current, popularity: value })}
      />
    </EditableValue>
  {:else}
    <Meter label={est('Popularity', estimated.popularity)} value={popularity} max={100} />
  {/if}
  {#if payout < best}
    <p class="warn" role="note">
      <strong>Payout cut.</strong> Under {maxFrom}% popularity the safe gets {money(payout)} a day instead
      of {money(best)}.
    </p>
  {/if}
{/if}

{#if editing}
  <EditableValue
    label="Safe"
    value={current.money}
    unit="money"
    min={0}
    max={cap}
    presets={[
      { label: 'Collected', value: 0 },
      { label: 'Full', value: cap },
    ]}
    onresync={(value) => onresync({ ...current, money: value })}
  />
  <EditableValue
    label="Next payout in"
    value={nextPayoutInMs(current)}
    unit="duration"
    min={0}
    max={DAY_MS}
    onresync={(value) => onresync({ ...current, sinceMs: DAY_MS - value })}
  />
{:else}
  <Meter
    label="Safe"
    value={current.money}
    max={cap}
    valueText="{money(current.money)} / {money(cap)}"
  />
{/if}

<div class="facts">
  <span class="label">{est('Payout', estimated.payout)}</span>
  <span class="value">{money(payout)} a day</span>
</div>

{#if !editing}
  <Countdown label="Next payout in" remainingMs={nextPayoutInMs(current)} />
{/if}
{#if full === null}
  <p class="hint">Never full: this safe gets nothing a day.</p>
{:else}
  <Countdown
    label={est('Full in', estimated.payout || estimated.popularity)}
    remainingMs={full}
    readyText="Full"
  />
{/if}

{#if safe.estimate}
  <p class="hint" role="note">{safe.estimate}</p>
{/if}

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

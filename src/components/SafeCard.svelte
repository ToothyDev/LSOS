<script lang="ts">
  // One property safe (issue #8): money, payout, next payout and time until full, and the
  // nightclub's popularity, always editable (issue #60).
  // Logic: lib/safes.ts.
  import { BAR_SEGMENTS } from '../data/business-events'
  import type { Property } from '../data/properties'
  import type { Safe } from '../data/safes'
  import type { OwnedProperties } from '../lib/properties'
  import { formatValue } from '../lib/resync'
  import {
    bestPayout,
    capacity,
    dailyPayout,
    estimatedParts,
    fullInMs,
    nextPayoutInMs,
    syncPayout,
    type SafeState,
  } from '../lib/safes'
  import Button from './ui/Button.svelte'
  import Countdown from './ui/Countdown.svelte'
  import Fact from './ui/Fact.svelte'
  import EditableBar from './ui/EditableBar.svelte'
  import EditableValue from './ui/EditableValue.svelte'
  import Hint from './ui/Hint.svelte'
  import Meter from './ui/Meter.svelte'
  import Note from './ui/Note.svelte'

  interface Props {
    safe: Safe
    property: Property
    owned: OwnedProperties
    safeState: SafeState
    onresync: (safeState: SafeState) => void
  }

  let { safe, property, owned, safeState: current, onresync }: Props = $props()

  const cap = $derived(capacity(safe, owned, property))
  const payout = $derived(dailyPayout(safe, owned, property, current.popularity))
  const best = $derived(bestPayout(safe, owned, property))
  const full = $derived(fullInMs(current, safe, owned, property))
  const estimated = $derived(estimatedParts(safe, owned, property))
  // "Full in" assumes popularity stays where it is, so it does not rest on the estimated loss.
  const est = (label: string, isEstimate: boolean) => (isEstimate ? `${label} (est.)` : label)
  const money = (value: number) => formatValue(value, 'money')
  // A random payout shows its range; LSOS counts the middle.
  const payoutText = $derived(
    safe.payout.kind === 'range'
      ? `${money(safe.payout.min)} to ${money(safe.payout.max)} a day`
      : `${money(payout)} a day`,
  )
  // The lowest popularity that still pays the most: below it the payout is cut.
  const maxFrom = $derived(safe.payout.kind === 'popularity' ? safe.payout.rows[0]!.from : 0)
  const popularity = $derived(current.popularity)
</script>

{#if popularity !== undefined}
  <EditableBar
    label={est('Popularity', estimated.popularity)}
    value={popularity}
    segments={BAR_SEGMENTS.count}
    presets={[
      { label: 'Maxed', value: 100, title: 'Full bar, e.g. after switching to a new DJ' },
      ...(safe.popularity?.boosts ?? []).map((boost) => ({
        label: boost.label,
        value: Math.min(100, popularity + boost.adds),
        title: boost.title,
      })),
    ]}
    onresync={(value) => onresync({ ...current, popularity: value })}
  />
  {#if payout < best}
    <Note title="Payout cut.">
      At {popularity}% popularity the safe gets {money(payout)} a day;
      {maxFrom}% or more pays {money(best)}.
    </Note>
  {/if}
{/if}

<EditableValue
  label="Safe"
  detail="of {money(cap)}"
  value={current.money}
  unit="money"
  min={0}
  max={cap}
  presets={[{ label: 'Collected', value: 0 }]}
  inlinePresets
  onresync={(value) => onresync({ ...current, money: value })}
>
  <Meter label="Safe" value={current.money} max={cap} bare />
</EditableValue>

<Fact label={est('Payout', estimated.payout)}>{payoutText}</Fact>

<Countdown label="Next payout in" remainingMs={nextPayoutInMs(current)} />
<div class="sync">
  <Button
    small
    title="Press when the game says money was added to this safe"
    onclick={() => onresync(syncPayout(current, safe, owned, property))}>Payout just arrived</Button
  >
</div>
{#if full === null}
  <Hint fine>Never full: this safe gets nothing a day.</Hint>
{:else}
  <Countdown label={est('Full in', estimated.payout)} remainingMs={full} readyText="Full" />
{/if}

{#if safe.estimate}
  <Hint fine role="note">{safe.estimate}</Hint>
{/if}

<style>
  .sync {
    display: flex;
  }
</style>

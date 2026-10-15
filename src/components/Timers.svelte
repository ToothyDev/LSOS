<script lang="ts">
  // Real-time timers (issues #13, #14): the Lucky Wheel cooldown and the Mansion production
  // boost. They run on the wall clock, also while LSOS is closed (decision 003); each countdown
  // can be corrected by hand (decision 010). Cards move like the business cards (decision 026).
  // Logic: lib/timers.ts.
  import type { Property } from '../data/properties'
  import { LUCKY_WHEEL, MANSION_BOOST } from '../data/timers'
  import { isOwned, type OwnedProperties } from '../lib/properties'
  import {
    boostableBusinesses,
    mansionBoostOn,
    readyAt,
    startForRemaining,
    type Timers,
  } from '../lib/timers'
  import Button from './ui/Button.svelte'
  import CardGrid from './ui/CardGrid.svelte'
  import Countdown from './ui/Countdown.svelte'
  import EditableValue from './ui/EditableValue.svelte'
  import Fact from './ui/Fact.svelte'
  import Hint from './ui/Hint.svelte'
  import MarkOwned from './ui/MarkOwned.svelte'
  import Panel from './ui/Panel.svelte'
  import Select from './ui/Select.svelte'
  import UndoStatus from './ui/UndoStatus.svelte'
  import { TimedUndo } from '../lib/cards.svelte'

  interface Props {
    catalog: readonly Property[]
    owned: OwnedProperties
    timers: Timers
    /** Wall-clock time. */
    now: number
    onchange: (timers: Timers) => void
    /** Saved card order: card ids (issue #51). */
    order?: readonly string[]
    onorder?: (order: string[]) => void
  }

  let { catalog, owned, timers, now, onchange, order = [], onorder = () => {} }: Props = $props()

  const CARDS = [
    { id: 'lucky-wheel', label: 'Lucky Wheel' },
    { id: 'mansion', label: 'Mansion boost' },
  ]

  // A press by mistake can be taken back for a while, on the card it was on.
  const undo = new TimedUndo()

  function spin() {
    const before = timers.luckyWheelSpunAt
    onchange({ ...timers, luckyWheelSpunAt: now })
    undo.offer('lucky-wheel', 'Spin marked', () =>
      onchange({ ...timers, luckyWheelSpunAt: before }),
    )
  }

  function activate(propertyId: string) {
    const before = timers.mansionBoost
    onchange({ ...timers, mansionBoost: { propertyId, startedAt: now } })
    undo.offer('mansion', 'Boost marked', () => onchange({ ...timers, mansionBoost: before }))
  }

  const spinAt = $derived(readyAt(timers.luckyWheelSpunAt, LUCKY_WHEEL.cooldownMs))

  const mansionOwned = $derived(isOwned(owned, MANSION_BOOST.propertyId))
  const last = $derived(timers.mansionBoost)
  const label = (id: string) => catalog.find((p) => p.id === id)?.label ?? id
  const boostOn = $derived(!!last && mansionBoostOn(last, MANSION_BOOST, last.propertyId, now))
  const endsAt = $derived(last ? last.startedAt + MANSION_BOOST.durationMs : 0)
  const nextBoostAt = $derived(readyAt(last?.startedAt, MANSION_BOOST.cooldownMs))
  const choices = $derived(boostableBusinesses(catalog, owned, MANSION_BOOST, last))
  let chosen = $state('')
  const target = $derived(choices.some((p) => p.id === chosen) ? chosen : choices[0]?.id)
</script>

<CardGrid items={CARDS} id={(card) => card.id} label={(card) => card.label} {order} {onorder}>
  {#snippet card({ id }, move, moving)}
    {#if id === 'lucky-wheel'}
      <Panel title="Lucky Wheel" focus="lucky-wheel" {move} {moving}>
        {#if now < spinAt}
          <EditableValue
            label="Next spin in"
            value={spinAt - now}
            unit="duration"
            min={0}
            max={LUCKY_WHEEL.cooldownMs}
            onresync={(ms) =>
              onchange({
                ...timers,
                luckyWheelSpunAt: startForRemaining(ms, LUCKY_WHEEL.cooldownMs, now),
              })}
          />
          <UndoStatus {undo} at="lucky-wheel" />
        {:else}
          <Fact label="Spin ready">
            <Button onclick={spin}>Spun</Button>
          </Fact>
        {/if}
        <Hint>One spin per 24 real hours, also while LSOS is closed.</Hint>
      </Panel>
    {:else}
      <Panel title="Mansion boost" focus="mansion" {move} {moving}>
        {#if !mansionOwned}
          <MarkOwned property={MANSION_BOOST.propertyId}
            >The production boost from the Mansion's AI assistant, once you own a Mansion.</MarkOwned
          >
        {:else}
          {#if boostOn}
            <Fact label="Boosting">{label(last!.propertyId)}</Fact>
            <UndoStatus {undo} at="mansion" />
            <EditableValue
              label="Ends in"
              value={endsAt - now}
              unit="duration"
              min={0}
              max={MANSION_BOOST.durationMs}
              onresync={(ms) =>
                onchange({
                  ...timers,
                  mansionBoost: {
                    ...last!,
                    startedAt: startForRemaining(ms, MANSION_BOOST.durationMs, now),
                  },
                })}
            />
          {/if}
          {#if now < nextBoostAt && nextBoostAt !== endsAt}
            <Countdown label="Next boost in" remainingMs={nextBoostAt - now} />
          {:else if now >= nextBoostAt}
            {#if choices.length > 0}
              <Fact label="Business" labelFor="mansion-target" wide>
                <Select
                  id="mansion-target"
                  value={target}
                  options={choices}
                  onchange={(id) => (chosen = id)}
                />
              </Fact>
              <Fact label="Boost ready">
                <Button disabled={!target} onclick={() => activate(target!)}>Activated</Button>
              </Fact>
            {:else}
              <Hint>
                Boost ready, but no business you own and run can take it{last
                  ? ` (${label(last.propertyId)} was boosted last time)`
                  : ''}.
              </Hint>
            {/if}
          {/if}
          <Hint>
            Production ×{MANSION_BOOST.speed} at one Bunker, Acid Lab or MC business for 24 real hours.
            The next boost is ready 24 real hours after the last one, for a different business.
          </Hint>
        {/if}
      </Panel>
    {/if}
  {/snippet}
</CardGrid>

<script lang="ts">
  // Real-time timers (issues #13, #14): the Lucky Wheel cooldown and the Mansion production
  // boost. They run on the wall clock, also while LSOS is closed (decision 003); each countdown
  // can be corrected by hand (decision 010). Logic: lib/timers.ts.
  import type { Property } from '../data/properties'
  import { LUCKY_WHEEL, MANSION_BOOST } from '../data/timers'
  import { isOwned, type OwnedProperties } from '../lib/properties'
  import { hashForTab } from '../lib/tabs'
  import {
    boostableBusinesses,
    mansionBoostOn,
    readyAt,
    startForRemaining,
    type Timers,
  } from '../lib/timers'
  import Button from './ui/Button.svelte'
  import Countdown from './ui/Countdown.svelte'
  import EditableValue from './ui/EditableValue.svelte'
  import Fact from './ui/Fact.svelte'
  import Panel from './ui/Panel.svelte'
  import Select from './ui/Select.svelte'

  interface Props {
    catalog: readonly Property[]
    owned: OwnedProperties
    timers: Timers
    /** Wall-clock time. */
    now: number
    onchange: (timers: Timers) => void
  }

  let { catalog, owned, timers, now, onchange }: Props = $props()

  // What the last button press replaced, so a press by mistake can be taken back.
  let undo = $state<{ timer: 'wheel' | 'mansion'; before: Timers } | null>(null)

  function press(timer: 'wheel' | 'mansion', next: Timers) {
    undo = { timer, before: timers }
    onchange(next)
  }

  function takeBack() {
    if (!undo) return
    const { before, timer } = undo
    onchange(
      timer === 'wheel'
        ? { ...timers, luckyWheelSpunAt: before.luckyWheelSpunAt }
        : { ...timers, mansionBoost: before.mansionBoost },
    )
    undo = null
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

<div class="grid">
  <Panel title="Lucky Wheel">
    {#if now < spinAt}
      {#if undo?.timer === 'wheel'}
        <Fact label="Spun">
          <Button onclick={takeBack} title="Take back a spin marked by mistake">Undo</Button>
        </Fact>
      {/if}
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
    {:else}
      <Fact label="Spin ready">
        <Button onclick={() => press('wheel', { ...timers, luckyWheelSpunAt: now })}>Spun</Button>
      </Fact>
    {/if}
    <p class="hint">One spin per 24 real hours, also while LSOS is closed.</p>
  </Panel>

  <Panel title="Mansion boost">
    {#if !mansionOwned}
      <p class="hint">
        The production boost from the Mansion's AI assistant. Mark a Mansion as owned in
        <a href={hashForTab('settings')}>Settings</a> to track it.
      </p>
    {:else}
      {#if boostOn}
        <Fact label="Boost on ×{MANSION_BOOST.speed}">
          {label(last!.propertyId)}
          {#if undo?.timer === 'mansion'}
            <Button onclick={takeBack} title="Take back a boost marked by mistake">Undo</Button>
          {/if}
        </Fact>
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
            <Button
              disabled={!target}
              onclick={() =>
                press('mansion', {
                  ...timers,
                  mansionBoost: { propertyId: target!, startedAt: now },
                })}>Activated</Button
            >
          </Fact>
        {:else}
          <p class="hint">
            Boost ready, but no business you own and run can take it{last
              ? ` (${label(last.propertyId)} was boosted last time)`
              : ''}.
          </p>
        {/if}
      {/if}
      <p class="hint">
        Production ×{MANSION_BOOST.speed} at one of the Bunker, Acid Lab or MC businesses for 24 real
        hours. The next boost can start 24 real hours after the last one, on a different business.
      </p>
    {/if}
  </Panel>
</div>

<style>
  .grid {
    display: grid;
    gap: var(--space-5);
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 20rem), 1fr));
  }

  .hint {
    color: var(--muted);
    font-size: var(--text-sm);
    margin: 0;
  }

  .hint a {
    color: var(--accent-text);
  }
</style>

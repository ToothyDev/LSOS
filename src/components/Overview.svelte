<script lang="ts">
  // The Overview (issue #15): made to stay open on a second screen and be read at a glance.
  // Money waiting and nightclub popularity on top, then what to do now, then everything coming
  // up, soonest first. Each item links to its card, which scrolls into view and glows. Timers
  // that need nothing else (a spin, a boost) are marked done right here, with an undo. A card
  // the user does not care about can be hidden from here (issue #62); Settings shows it again.
  // Logic: lib/overview.ts, lib/events.ts.
  import { formatDuration } from '../lib/clock'
  import { isDue, type NextEvent } from '../lib/events'
  import { PROPERTIES } from '../data/properties'
  import { hiddenLabel, type Holdings, type Popularity, type QuickResult } from '../lib/overview'
  import { formatValue } from '../lib/resync'
  import { hashForTab } from '../lib/tabs'
  import Button from './ui/Button.svelte'
  import Digits from './ui/Digits.svelte'
  import Meter from './ui/Meter.svelte'
  import Select from './ui/Select.svelte'

  interface Props {
    /** Sorted, due ones first (`sortEvents`). */
    events: readonly NextEvent[]
    holdings: Holdings
    /** Nightclub popularity, if a nightclub is owned. */
    popularity: Popularity | null
    /** Play time is paused: play-time countdowns stand still. */
    paused: boolean
    /** Marks an event done (its `quick`); returns what undoes it, if done. */
    onquick: (event: NextEvent, choice?: string) => QuickResult | null
    onundo: (eventId: string, undo: QuickResult['undo']) => void
    /** Leaves a card's items (event `focus`) out of the Overview and the alerts. */
    onhide: (focus: string) => void
    /** Shows a hidden card's items again. */
    onshow: (focus: string) => void
  }

  let { events, holdings, popularity, paused, onquick, onundo, onhide, onshow }: Props = $props()

  // The last quick action or hide, offered for undo for a while (a UI timer, not game time).
  const UNDO_MS = 15_000
  let undo = $state<{ text: string; run: () => void } | null>(null)
  let undoTimer: ReturnType<typeof setTimeout> | undefined
  // The business picked for each event with choices (the Mansion boost).
  let picked = $state<Record<string, string>>({})

  function press(event: NextEvent) {
    const choices = event.quick?.choices
    const choice = choices && (picked[event.id] ?? choices[0]?.id)
    const result = onquick(event, choice)
    if (!result) return
    offerUndo(result.done, () => onundo(event.id, result.undo))
  }

  function hide(event: NextEvent) {
    onhide(event.focus)
    offerUndo(`Hid ${card(event)} from the Overview`, () => onshow(event.focus))
  }

  function offerUndo(text: string, run: () => void) {
    undo = { text, run }
    clearTimeout(undoTimer)
    undoTimer = setTimeout(() => (undo = null), UNDO_MS)
  }

  function takeBack() {
    undo?.run()
    undo = null
  }

  const link = (e: NextEvent) => hashForTab(e.tab, e.focus)
  // Hide works on the whole card, e.g. the Money Fronts items hide with the Hands On Car Wash.
  const card = (e: NextEvent) => hiddenLabel(e.focus, PROPERTIES)
  const cut = $derived(popularity !== null && popularity.payout < popularity.best)

  const due = $derived(events.filter(isDue))
  const coming = $derived(events.filter((e) => !isDue(e)))
  const stopped = $derived(due.filter((e) => e.tone === 'bad').length)
  const total = $derived(holdings.stock + holdings.goods + holdings.safes)
  const money = (value: number) => formatValue(value, 'money')
  const what = (e: NextEvent) => (e.estimated ? `${e.what} (est.)` : e.what)
  const tiles = $derived(
    [
      { label: 'Business stock', value: holdings.stock, est: holdings.estimated },
      { label: 'Nightclub goods', value: holdings.goods, est: false },
      { label: 'In safes', value: holdings.safes, est: false },
    ].filter((tile) => tile.value > 0),
  )
</script>

<div class="overview">
  <section class="summary" aria-label="Summary">
    <div class="tile count" class:bad={stopped > 0} class:good={due.length > 0 && stopped === 0}>
      <span class="label">Ready now</span>
      <span class="big">{due.length}</span>
    </div>
    {#each tiles as tile (tile.label)}
      <div class="tile">
        <span class="label">{tile.label}{tile.est ? ' (est.)' : ''}</span>
        <span class="big">{money(tile.value)}</span>
      </div>
    {/each}
    <div class="tile total">
      <span class="label">Waiting in total{holdings.estimated ? ' (est.)' : ''}</span>
      <span class="big">{money(total)}</span>
    </div>
    {#if popularity}
      <!-- Easy to forget in game: the payout drops with it. -->
      <a
        class="tile popularity"
        class:cut
        href={hashForTab('safes', 'nightclub')}
        title={cut
          ? `The nightclub safe gets ${money(popularity.payout)} a day; full popularity pays ${money(popularity.best)}`
          : `The nightclub safe gets the most it can: ${money(popularity.best)} a day`}
      >
        <span class="label">Club popularity (est.)</span>
        <span class="big">{Math.round(popularity.value)}%</span>
        <Meter label="Nightclub popularity" value={popularity.value} max={100} bare />
      </a>
    {/if}
  </section>

  <section aria-labelledby="ready-heading">
    <h2 id="ready-heading">
      Ready now
      {#if undo}
        <span class="undo" role="status">
          {undo.text}.
          <Button onclick={takeBack}>Undo</Button>
        </span>
      {/if}
    </h2>
    {#if due.length === 0}
      <p class="quiet">Nothing to do right now.</p>
    {:else}
      <ul class="due">
        {#each due as event (event.id)}
          <li class="card {event.tone}">
            <a class="jump" href={link(event)}>
              <span class="action">{event.action ?? 'Done'}</span>
              <span class="name">
                <span class="source">{event.source}</span>
                <span class="what">{what(event)}</span>
                {#if event.value}<span class="money">{money(event.value)}</span>{/if}
              </span>
            </a>
            {#if event.quick}
              <span class="quick">
                {#if event.quick.choices}
                  <span class="pick">
                    <Select
                      id="pick-{event.id}"
                      value={picked[event.id] ?? event.quick.choices[0]?.id}
                      options={event.quick.choices}
                      onchange={(id) => (picked = { ...picked, [event.id]: id })}
                    />
                  </span>
                {/if}
                <Button
                  variant="primary"
                  onclick={() => press(event)}
                  aria-label="{event.source}: {event.quick.label}"
                  title="Press once you have done it in game">{event.quick.label}</Button
                >
              </span>
            {/if}
            <button
              type="button"
              class="hide"
              aria-label="Hide {card(event)} from the Overview"
              title="Hide {card(event)} here and in alerts. Show it again in Settings."
              onclick={() => hide(event)}>Hide</button
            >
          </li>
        {/each}
      </ul>
    {/if}
  </section>

  <section aria-labelledby="next-heading">
    <h2 id="next-heading">
      Coming up
      {#if paused}<span class="paused">Paused: play-time countdowns wait for Start</span>{/if}
    </h2>
    {#if coming.length === 0}
      <p class="quiet">
        Nothing else is tracked. Mark what you own in <a href={hashForTab('settings')}>Settings</a>.
      </p>
    {:else}
      <ul class="next">
        {#each coming as event (event.id)}
          <li class="item">
            <a
              class="row {event.tone}"
              class:frozen={paused && event.clock === 'play'}
              href={link(event)}
              title={event.clock === 'real'
                ? 'Real time: runs also while LSOS is closed'
                : 'Play time: runs while LSOS is tracking'}
            >
              <span class="time">
                <Digits text={formatDuration(event.inMs)} />
              </span>
              <span class="name">
                <span class="source">{event.source}</span>
                <span class="what">{what(event)}</span>
              </span>
              <span class="level">
                {#if event.level}
                  <Meter
                    label="{event.source} {event.what}"
                    value={event.level.value}
                    max={event.level.max}
                    kind={event.level.kind}
                    bare
                  />
                {:else if event.clock === 'real'}
                  <span class="real">Real time</span>
                {/if}
              </span>
              <span class="value">{event.value ? money(event.value) : ''}</span>
            </a>
            <button
              type="button"
              class="hide"
              aria-label="Hide {card(event)} from the Overview"
              title="Hide {card(event)} here and in alerts. Show it again in Settings."
              onclick={() => hide(event)}>Hide</button
            >
          </li>
        {/each}
      </ul>
    {/if}
  </section>
</div>

<style>
  .overview {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  h2 {
    align-items: baseline;
    color: var(--muted);
    display: flex;
    flex-wrap: wrap;
    font-size: var(--text-sm);
    gap: var(--space-3);
    letter-spacing: var(--tracking-wide);
    margin: 0 0 var(--space-2);
  }

  .paused {
    color: var(--warn);
    font-size: var(--text-xs);
    letter-spacing: var(--tracking);
  }

  ul {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  a {
    color: inherit;
    text-decoration: none;
  }

  .quiet {
    color: var(--muted);
    margin: 0;
  }

  .quiet a {
    color: var(--accent-text);
    text-decoration: underline;
  }

  /* Money waiting: one strip of readouts, like the in-game business totals. */
  .summary {
    display: grid;
    gap: var(--space-2);
    grid-template-columns: repeat(auto-fit, minmax(9.5rem, 1fr));
  }

  .tile {
    background: var(--panel);
    border: 1px solid var(--line);
    border-radius: var(--radius);
    display: flex;
    flex-direction: column;
    padding: var(--space-1) var(--space-3);
  }

  .label {
    color: var(--muted);
    font-family: var(--font-display);
    font-size: var(--text-xs);
    letter-spacing: var(--tracking);
    text-transform: uppercase;
  }

  .big {
    font-family: var(--font-display);
    font-size: var(--text-xl);
    letter-spacing: var(--tracking);
    line-height: 1.2;
  }

  .count.good {
    border-color: var(--accent);
  }

  .count.good .big {
    color: var(--accent-text);
  }

  .count.bad {
    border-color: var(--danger);
  }

  .count.bad .big {
    color: var(--danger);
  }

  .total {
    background: var(--accent-deep);
    border-color: var(--accent);
  }

  .total .big {
    color: var(--accent-text);
  }

  /* Ready now: big enough to read from across the desk, the action first. */
  .due {
    display: grid;
    gap: var(--space-2);
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 24rem), 1fr));
  }

  .card {
    align-items: center;
    background: var(--panel);
    border: 1px solid var(--accent);
    border-left-width: 6px;
    border-radius: var(--radius);
    display: flex;
    gap: var(--space-2);
    height: 100%;
    padding-right: var(--space-2);
  }

  .card.bad {
    border-color: var(--danger);
  }

  .card:hover {
    background: var(--panel-raised);
  }

  .jump {
    align-items: center;
    align-self: stretch;
    display: flex;
    flex: 1;
    gap: var(--space-3);
    min-width: 0;
    padding: var(--space-2) var(--space-1) var(--space-2) var(--space-3);
  }

  .quick {
    align-items: center;
    display: flex;
    flex: none;
    gap: var(--space-2);
  }

  /* A pick (the Mansion boost's business) needs room next to the name: two columns, or below. */
  .card:has(.pick) {
    flex-wrap: wrap;
  }

  @media (min-width: 60rem) {
    .card:has(.pick) {
      grid-column: span 2;
    }
  }

  .card:has(.pick) .jump {
    min-width: 14rem;
  }

  .pick {
    width: 12rem;
  }

  .undo {
    align-items: center;
    color: var(--fg);
    display: inline-flex;
    font-family: var(--font-body);
    font-size: var(--text-sm);
    gap: var(--space-2);
    letter-spacing: normal;
    text-transform: none;
  }

  .popularity {
    gap: 2px;
  }

  .popularity:hover {
    border-color: var(--accent);
  }

  .popularity.cut {
    border-color: var(--warn);
  }

  .popularity.cut .big {
    color: var(--warn);
  }

  .action {
    color: var(--accent-text);
    flex: none;
    font-family: var(--font-display);
    font-size: var(--text-lg);
    letter-spacing: var(--tracking);
    min-width: 6.5rem;
    text-transform: uppercase;
    white-space: nowrap;
  }

  .bad .action {
    color: var(--danger);
  }

  .name {
    display: flex;
    flex: 1;
    flex-direction: column;
    line-height: 1.25;
    min-width: 0;
  }

  .source {
    font-family: var(--font-display);
    letter-spacing: var(--tracking);
    overflow: hidden;
    text-overflow: ellipsis;
    text-transform: uppercase;
    white-space: nowrap;
  }

  .what {
    color: var(--muted);
    font-size: var(--text-sm);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .value {
    font-variant-numeric: tabular-nums;
    text-align: right;
    white-space: nowrap;
  }

  .money {
    color: var(--accent-text);
    font-size: var(--text-sm);
    font-variant-numeric: tabular-nums;
  }

  /* Coming up: one line per item in as many columns as fit, read down then across. */
  .next {
    column-gap: var(--space-5);
    columns: 2 30rem;
  }

  .next li {
    break-inside: avoid;
  }

  .item {
    align-items: center;
    border-bottom: 1px solid var(--line);
    display: flex;
  }

  .row {
    align-items: center;
    display: grid;
    flex: 1;
    min-width: 0;
    gap: var(--space-3);
    grid-template-columns: 5.5rem minmax(0, 1fr) 4.5rem 6.5rem;
    padding: var(--space-1) var(--space-2);
  }

  .row:hover {
    background: var(--panel-raised);
  }

  /* Hide (issue #62): small and quiet, so it is not pressed instead of the item. */
  .hide {
    background: none;
    border: 1px solid transparent;
    border-radius: var(--radius);
    color: var(--muted);
    cursor: pointer;
    flex: none;
    font-family: var(--font-display);
    font-size: var(--text-xs);
    letter-spacing: var(--tracking);
    padding: var(--space-1) var(--space-2);
    text-transform: uppercase;
  }

  .hide:hover,
  .hide:focus-visible {
    border-color: var(--line);
    color: var(--fg);
  }

  .row .name {
    align-items: baseline;
    flex-direction: row;
    gap: var(--space-2);
  }

  /* The name stays whole; what happens gives way first. */
  .row .source {
    flex: none;
    font-size: var(--text-sm);
    max-width: 100%;
  }

  .row .what {
    min-width: 0;
  }

  .time {
    color: var(--warn);
    font-family: var(--font-display);
    font-size: var(--text-md);
    letter-spacing: var(--tracking);
  }

  .bad .time {
    color: var(--danger);
  }

  .frozen .time {
    color: var(--muted);
  }

  .real {
    color: var(--muted);
    font-family: var(--font-display);
    font-size: var(--text-xs);
    letter-spacing: var(--tracking);
    text-transform: uppercase;
  }

  .row .value {
    color: var(--muted);
    font-size: var(--text-sm);
  }

  @media (max-width: 40rem) {
    .action {
      min-width: 4.5rem;
    }

    .hide {
      padding: var(--space-1);
    }

    .row {
      grid-template-columns: 5rem minmax(0, 1fr) 5.5rem;
    }

    .row .level {
      display: none;
    }

    .row .name {
      align-items: stretch;
      flex-direction: column;
      gap: 0;
    }
  }
</style>

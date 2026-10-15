<script lang="ts">
  // The Overview (issue #15): made to stay open on a second screen and be read at a glance.
  // Money waiting on top, then what to do now, then everything coming up, soonest first. Each
  // item links to the tab where it is handled. Logic: lib/overview.ts, lib/events.ts.
  import { formatDuration } from '../lib/clock'
  import { isDue, type NextEvent } from '../lib/events'
  import type { Holdings } from '../lib/overview'
  import { formatValue } from '../lib/resync'
  import { hashForTab } from '../lib/tabs'
  import Digits from './ui/Digits.svelte'
  import Meter from './ui/Meter.svelte'

  interface Props {
    /** Sorted, due ones first (`sortEvents`). */
    events: readonly NextEvent[]
    holdings: Holdings
    /** Play time is paused: play-time countdowns stand still. */
    paused: boolean
  }

  let { events, holdings, paused }: Props = $props()

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
  </section>

  <section aria-labelledby="ready-heading">
    <h2 id="ready-heading">Ready now</h2>
    {#if due.length === 0}
      <p class="quiet">Nothing to do right now.</p>
    {:else}
      <ul class="due">
        {#each due as event (event.id)}
          <li>
            <a class="card {event.tone}" href={hashForTab(event.tab)}>
              <span class="action">{event.action ?? 'Done'}</span>
              <span class="name">
                <span class="source">{event.source}</span>
                <span class="what">{what(event)}</span>
              </span>
              {#if event.value}<span class="value">{money(event.value)}</span>{/if}
            </a>
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
          <li>
            <a
              class="row {event.tone}"
              class:frozen={paused && event.clock === 'play'}
              href={hashForTab(event.tab)}
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
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 19rem), 1fr));
  }

  .card {
    align-items: center;
    background: var(--panel);
    border: 1px solid var(--accent);
    border-left-width: 6px;
    border-radius: var(--radius);
    display: flex;
    gap: var(--space-3);
    height: 100%;
    padding: var(--space-2) var(--space-3);
  }

  .card.bad {
    border-color: var(--danger);
  }

  .card:hover {
    background: var(--panel-raised);
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

  .card .value {
    color: var(--accent-text);
  }

  /* Coming up: one line per item in as many columns as fit, read down then across. */
  .next {
    column-gap: var(--space-5);
    columns: 2 30rem;
  }

  .next li {
    break-inside: avoid;
  }

  .row {
    align-items: center;
    border-bottom: 1px solid var(--line);
    display: grid;
    gap: var(--space-3);
    grid-template-columns: 5.5rem minmax(0, 1fr) 4.5rem 6.5rem;
    padding: var(--space-1) var(--space-2);
  }

  .row:hover {
    background: var(--panel-raised);
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

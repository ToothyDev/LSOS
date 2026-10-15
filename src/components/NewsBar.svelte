<script lang="ts">
  // The Breaking News bar on every tab (issue #16): this week's bonus payouts and gifts scroll by,
  // the ones paid through an owned property first. Says so when the week's data is out of date
  // instead of showing old bonuses as current. Links to the Weekly tab. Logic: lib/weekly.ts.
  import type { OwnedProperties } from '../lib/properties'
  import { hashForTab } from '../lib/tabs'
  import { newsItems, weekStatus, type Week } from '../lib/weekly'

  interface Props {
    week: Week
    owned: OwnedProperties
    /** Wall-clock time. */
    now: number
  }

  let { week, owned, now }: Props = $props()

  const status = $derived(weekStatus(week, now))
  const items = $derived(newsItems(week, owned))
  // Seconds per item, so a long week does not scroll faster than a short one.
  const duration = $derived(Math.max(20, items.length * 6))
</script>

<a class="news" href={hashForTab('weekly')} aria-label="This week's events, open the Weekly tab">
  <span class="label">Breaking news</span>
  {#if status === 'ended'}
    <span class="stale">Weekly events out of date: the new week is not in yet</span>
  {:else if status === 'upcoming' || items.length === 0}
    <span class="quiet">No weekly events yet</span>
  {:else}
    <span class="window">
      <span class="track" style:animation-duration="{duration}s">
        {#each [0, 1] as copy (copy)}
          <span class="copy" aria-hidden={copy === 1}>
            {#each items as item (item.text)}
              <span class="item" class:owned={item.owned}>{item.text}</span>
            {/each}
          </span>
        {/each}
      </span>
    </span>
  {/if}
</a>

<style>
  .news {
    align-items: center;
    background: var(--panel);
    border-bottom: 1px solid var(--line);
    color: var(--fg);
    display: flex;
    font-size: var(--text-sm);
    gap: var(--space-3);
    min-width: 0;
    overflow: hidden;
    padding: var(--space-1) var(--space-3);
    text-decoration: none;
  }

  .news:hover .track {
    animation-play-state: paused;
  }

  .label {
    background: var(--accent-deep);
    border-radius: var(--radius);
    color: var(--accent-text);
    flex-shrink: 0;
    font-family: var(--font-display);
    font-size: var(--text-xs);
    letter-spacing: var(--tracking-wide);
    padding: 0 var(--space-2);
    text-transform: uppercase;
  }

  .stale {
    color: var(--warn);
  }

  .quiet {
    color: var(--muted);
  }

  .window {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    white-space: nowrap;
  }

  .track {
    animation: ticker linear infinite;
    display: inline-flex;
  }

  .copy {
    display: inline-flex;
  }

  .item {
    padding-right: var(--space-6);
  }

  .item::before {
    color: var(--accent-text);
    content: '■ ';
  }

  .owned {
    color: var(--accent-text);
  }

  @keyframes ticker {
    to {
      transform: translateX(-50%);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .track {
      animation: none;
    }

    .window {
      text-overflow: ellipsis;
    }

    .copy[aria-hidden='true'] {
      display: none;
    }
  }
</style>

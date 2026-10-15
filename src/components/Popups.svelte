<script lang="ts">
  // In-site alerts (issue #15): one pop-up per Overview item that came due, or within the alert
  // time, on any tab. It shows the live countdown, links to the item's card, and closes when
  // dismissed or once the item is handled. Which ones are open: lib/overview.svelte.ts.
  import { formatDuration } from '../lib/clock'
  import { isDue, type NextEvent } from '../lib/events'
  import { hashForTab } from '../lib/tabs'
  import Digits from './ui/Digits.svelte'

  interface Props {
    events: readonly NextEvent[]
    /** Event ids with a pop-up open, oldest first. */
    open: readonly string[]
    ondismiss: (id: string) => void
  }

  let { events, open, ondismiss }: Props = $props()

  const shown = $derived(open.flatMap((id) => events.filter((e) => e.id === id)))
</script>

{#if shown.length > 0}
  <section class="popups" aria-label="Alerts" aria-live="polite">
    {#each shown as event (event.id)}
      <div class="popup {event.tone}" role="status">
        <a href={hashForTab(event.tab, event.focus)} onclick={() => ondismiss(event.id)}>
          <span class="source">{event.source}</span>
          <span class="what">{event.what}{event.estimated ? ' (est.)' : ''}</span>
          <span class="when">
            {#if isDue(event)}
              {event.action ? `${event.action} now` : 'Now'}
            {:else}
              in <Digits text={formatDuration(event.inMs)} />
            {/if}
          </span>
        </a>
        <button
          type="button"
          class="close"
          aria-label="Dismiss {event.source}: {event.what}"
          onclick={() => ondismiss(event.id)}>×</button
        >
      </div>
    {/each}
  </section>
{/if}

<style>
  .popups {
    bottom: var(--space-4);
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    max-height: calc(100vh - 2 * var(--space-4));
    max-width: calc(100vw - 2 * var(--space-4));
    overflow-y: auto;
    position: fixed;
    right: var(--space-4);
    width: 20rem;
    z-index: 50;
  }

  .popup {
    align-items: flex-start;
    animation: slide-in 0.25s ease-out;
    background: var(--panel-raised);
    border: 1px solid var(--accent);
    border-left-width: 6px;
    border-radius: var(--radius);
    box-shadow: 0 0.5rem 1.5rem rgb(0 0 0 / 0.45);
    display: flex;
  }

  .popup.bad {
    border-color: var(--danger);
  }

  a {
    color: inherit;
    display: flex;
    flex: 1;
    flex-direction: column;
    min-width: 0;
    padding: var(--space-2) var(--space-3);
    text-decoration: none;
  }

  .source {
    font-family: var(--font-display);
    letter-spacing: var(--tracking);
    text-transform: uppercase;
  }

  .what {
    color: var(--muted);
    font-size: var(--text-sm);
  }

  .when {
    color: var(--accent-text);
    font-family: var(--font-display);
    font-size: var(--text-lg);
    letter-spacing: var(--tracking);
    text-transform: uppercase;
  }

  .bad .when {
    color: var(--danger);
  }

  .close {
    background: none;
    border: none;
    color: var(--muted);
    cursor: pointer;
    font-size: var(--text-lg);
    line-height: 1;
    padding: var(--space-2) var(--space-3);
  }

  .close:hover {
    color: var(--fg);
  }

  @keyframes slide-in {
    from {
      opacity: 0;
      transform: translateX(1rem);
    }
  }
</style>

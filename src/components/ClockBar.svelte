<script lang="ts">
  import { formatDuration } from '../lib/clock'
  import { clocks, togglePause } from '../lib/clock.svelte'
  import { store } from '../lib/store.svelte'

  const paused = $derived(store.state.clock.paused)
  const playTime = $derived(formatDuration(store.state.clock.playMs))
  const realTime = $derived(
    new Date(clocks.now).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }),
  )
</script>

<section class="clocks" aria-label="Clocks">
  <span class="indicator" class:paused role="status">{paused ? 'PAUSED' : 'TRACKING'}</span>
  <span>Play time <strong>{playTime}</strong></span>
  <span>Real time <strong>{realTime}</strong></span>
  <button type="button" aria-pressed={paused} onclick={togglePause}>
    {paused ? 'Resume' : 'Pause'}
  </button>
</section>

<style>
  .clocks {
    align-items: center;
    border-bottom: 1px solid var(--line);
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem 1.5rem;
    padding: 0.5rem 1rem;
  }

  .indicator {
    border: 1px solid var(--accent);
    color: var(--accent);
    font-weight: bold;
    letter-spacing: 0.1em;
    padding: 0.125rem 0.5rem;
  }

  .indicator.paused {
    border-color: var(--warn);
    color: var(--warn);
  }

  strong {
    font-variant-numeric: tabular-nums;
  }

  button {
    background: none;
    border: 1px solid var(--line);
    color: var(--fg);
    cursor: pointer;
    font: inherit;
    padding: 0.25rem 0.75rem;
    text-transform: uppercase;
  }

  button:hover,
  button:focus-visible {
    border-color: var(--accent);
  }
</style>

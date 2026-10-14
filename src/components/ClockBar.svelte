<script lang="ts">
  import { formatDuration } from '../lib/clock'
  import { answerGaps, clocks, togglePause } from '../lib/clock.svelte'

  const paused = $derived(clocks.play.paused)
  const playTime = $derived(formatDuration(clocks.play.playMs))
  const unconfirmed = $derived(clocks.play.unconfirmedMs)
  const realTime = $derived(
    new Date(clocks.now).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      // Always 24h: browsers expose only their language, not the OS 12h/24h setting.
      hourCycle: 'h23',
    }),
  )
</script>

<section class="clocks" aria-label="Clocks">
  <span class="indicator" class:paused role="status">{paused ? 'PAUSED' : 'TRACKING'}</span>
  <span>Session play time <strong>{playTime}</strong></span>
  <span>Real time <strong>{realTime}</strong></span>
  <button type="button" aria-pressed={paused} onclick={togglePause}>
    {paused ? 'Start' : 'Pause'}
  </button>
  {#if paused}
    <span class="hint">
      Press Start once you have loaded into a GTA Online session, not during loading screens: that
      is when the game starts counting.
    </span>
  {/if}
</section>

{#if unconfirmed > 0}
  <section class="gap" aria-label="Unconfirmed time" role="status">
    <span>
      LSOS could not track <strong>{formatDuration(unconfirmed)}</strong>: the browser paused this
      tab or the computer slept. Were you playing?
    </span>
    <button type="button" onclick={() => answerGaps(true)}>Count it</button>
    <button type="button" onclick={() => answerGaps(false)}>Skip</button>
  </section>
{/if}

<style>
  .clocks {
    align-items: center;
    border-bottom: 1px solid var(--line);
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem 1.5rem;
    padding: 0.5rem 1rem;
  }

  .gap {
    align-items: center;
    border-bottom: 1px solid var(--warn);
    color: var(--warn);
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem 1rem;
    padding: 0.5rem 1rem;
  }

  .hint {
    color: var(--muted);
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

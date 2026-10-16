<script lang="ts">
  import { formatDuration } from '../lib/clock'
  import { tick } from 'svelte'
  import { answerGaps, clocks, skipPlayTime, togglePause } from '../lib/clock.svelte'
  import { parseValue } from '../lib/resync'
  import Button from './ui/Button.svelte'
  import Digits from './ui/Digits.svelte'

  let { title }: { title: string } = $props()

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

  // Skip time (issue #70): play time spent without LSOS tracking, added to every tracker.
  let skipping = $state(false)
  let draft = $state('')
  let invalid = $state(false)
  let skipped = $state<string | null>(null)
  let input = $state<HTMLInputElement>()
  const preview = $derived(parseValue(draft, 'duration'))

  async function startSkipping() {
    draft = ''
    invalid = false
    skipped = null
    skipping = true
    await tick()
    input?.focus()
  }

  function stopSkipping() {
    skipping = false
  }

  function confirmSkip(event: SubmitEvent) {
    event.preventDefault()
    if (preview === null) {
      invalid = true
      return
    }
    if (preview > 0) {
      skipPlayTime(preview)
      skipped = formatDuration(preview)
    }
    stopSkipping()
  }
</script>

<!-- The portal bar at the top of the window, like "Business Management Portal" in game. -->
<section class="clocks" aria-label="Clocks">
  <h2>{title}</h2>
  <div class="readouts">
    <span class="indicator" class:paused role="status">
      <span class="dot" aria-hidden="true"></span>{paused ? 'Paused' : 'Tracking'}
    </span>
    <span class="readout">Session play time <strong><Digits text={playTime} /></strong></span>
    <span class="readout">Real time <strong><Digits text={realTime} /></strong></span>
    <Button variant={paused ? 'primary' : 'ghost'} aria-pressed={paused} onclick={togglePause}>
      {paused ? 'Start' : 'Pause'}
    </Button>
    <Button
      aria-expanded={skipping}
      title="Played without LSOS tracking? Move every play-time tracker forward"
      onclick={() => (skipping ? stopSkipping() : startSkipping())}
    >
      Skip time
    </Button>
  </div>
</section>

{#if skipping}
  <form class="skip" aria-label="Skip time" onsubmit={confirmSkip}>
    <label for="skip-time">Played without LSOS tracking? How long:</label>
    <input
      id="skip-time"
      bind:this={input}
      bind:value={draft}
      aria-invalid={invalid}
      aria-describedby="skip-time-hint"
      autocomplete="off"
      placeholder="10m"
      oninput={() => (invalid = false)}
      onkeydown={(event) => {
        if (event.key === 'Escape') stopSkipping()
      }}
    />
    <Button variant="primary" type="submit">
      {preview ? `Skip ${formatDuration(preview)}` : 'Skip'}
    </Button>
    <Button onclick={stopSkipping}>Cancel</Button>
    <span id="skip-time-hint" class="skip-hint" class:invalid>
      {invalid ? 'Not a duration. ' : ''}Minutes (10), 1h 30m or 1:30. Every play-time tracker moves
      forward by that much; real-time timers already count time away.
    </span>
  </form>
{:else if skipped}
  <p class="hint" role="status">
    Skipped {skipped} of play time.
    <Button small onclick={() => (skipped = null)}>OK</Button>
  </p>
{/if}

{#if paused}
  <p class="hint">
    Press Start once you have loaded into a GTA Online session, not during loading screens: that is
    when the game starts counting.
  </p>
{/if}

{#if unconfirmed > 0}
  <section class="gap" aria-label="Unconfirmed time" role="status">
    <span>
      LSOS could not track <strong>{formatDuration(unconfirmed)}</strong>: the browser paused this
      tab or the computer slept. Were you playing?
    </span>
    <Button variant="primary" onclick={() => answerGaps(true)}>Count it</Button>
    <Button onclick={() => answerGaps(false)}>Skip</Button>
  </section>
{/if}

<style>
  .clocks {
    align-items: center;
    background: var(--panel);
    border-bottom: 1px solid var(--line);
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2) var(--space-5);
    justify-content: space-between;
    padding: var(--space-3) var(--space-4);
  }

  h2 {
    font-size: var(--text-lg);
    margin: 0;
  }

  .readouts {
    align-items: center;
    display: flex;
    flex-wrap: wrap;
    font-family: var(--font-display);
    font-size: var(--text-sm);
    gap: var(--space-2) var(--space-4);
    letter-spacing: var(--tracking);
    text-transform: uppercase;
  }

  .readout {
    color: var(--muted);
  }

  strong {
    color: var(--fg);
    font-size: var(--text-md);
    font-weight: 500;
    margin-left: var(--space-1);
  }

  .indicator {
    align-items: center;
    color: var(--accent-text);
    display: flex;
    gap: var(--space-2);
    letter-spacing: var(--tracking-wide);
  }

  .indicator.paused {
    color: var(--warn);
  }

  .dot {
    background: currentColor;
    border-radius: 50%;
    height: 0.625rem;
    width: 0.625rem;
  }

  .hint {
    border-bottom: 1px solid var(--line);
    color: var(--muted);
    font-size: var(--text-sm);
    margin: 0;
    padding: var(--space-2) var(--space-4);
  }

  .skip {
    align-items: center;
    border-bottom: 1px solid var(--line);
    display: flex;
    flex-wrap: wrap;
    font-size: var(--text-sm);
    gap: var(--space-2) var(--space-3);
    padding: var(--space-2) var(--space-4);
  }

  .skip input {
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: var(--radius);
    color: var(--fg);
    font-family: var(--font-display);
    font-size: var(--text-md);
    letter-spacing: var(--tracking);
    min-height: 2.25rem;
    min-width: 0;
    padding: 0 var(--space-2);
    width: 8rem;
  }

  .skip input[aria-invalid='true'] {
    border-color: var(--danger);
  }

  .skip-hint {
    color: var(--muted);
    flex-basis: 100%;
  }

  .skip-hint.invalid {
    color: var(--danger);
  }

  .gap {
    align-items: center;
    border-bottom: 1px solid var(--warn);
    color: var(--warn);
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2) var(--space-4);
    padding: var(--space-2) var(--space-4);
  }
</style>

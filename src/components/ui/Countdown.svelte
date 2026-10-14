<script lang="ts">
  import { formatDuration } from '../../lib/clock'
  import Digits from './Digits.svelte'

  interface Props {
    label: string
    /** Time left; the caller computes it from the clock it tracks (decision 003). */
    remainingMs: number | null
    /** Shown once the time is up. */
    readyText?: string
    /** Shown instead of a time when it will not happen, e.g. "Supplies run out first". */
    neverText?: string
  }

  let { label, remainingMs, readyText = 'Ready', neverText = 'Not running' }: Props = $props()

  const never = $derived(remainingMs === null)
  const ready = $derived(remainingMs !== null && remainingMs <= 0)
</script>

<div class="countdown" class:ready class:never>
  <span class="label">{label}</span>
  <span class="time"
    >{#if remainingMs === null}{neverText}{:else if ready}{readyText}{:else}<Digits
        text={formatDuration(remainingMs)}
      />{/if}</span
  >
</div>

<style>
  .countdown {
    align-items: baseline;
    display: flex;
    font-family: var(--font-display);
    gap: var(--space-2);
    justify-content: space-between;
    letter-spacing: var(--tracking);
    text-transform: uppercase;
  }

  .label {
    color: var(--muted);
    font-size: var(--text-sm);
  }

  .time {
    color: var(--warn);
    font-size: var(--text-lg);
  }

  .ready .time {
    color: var(--accent-text);
  }

  .never .time {
    color: var(--muted);
    font-size: var(--text-sm);
  }
</style>

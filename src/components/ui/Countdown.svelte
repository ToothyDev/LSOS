<script lang="ts">
  import { formatDuration } from '../../lib/clock'

  interface Props {
    label: string
    /** Time left; the caller computes it from the clock it tracks (decision 003). */
    remainingMs: number
    /** Shown once the time is up. */
    readyText?: string
  }

  let { label, remainingMs, readyText = 'Ready' }: Props = $props()

  const ready = $derived(remainingMs <= 0)
</script>

<div class="countdown" class:ready>
  <span class="label">{label}</span>
  <span class="time">{ready ? readyText : formatDuration(remainingMs)}</span>
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
    font-variant-numeric: tabular-nums;
  }

  .ready .time {
    color: var(--accent-text);
  }
</style>

<script lang="ts">
  import { formatDuration } from '../../lib/clock'
  import Digits from './Digits.svelte'

  interface Props {
    label: string
    /** Time left; the caller computes it from the clock it tracks (decision 003). */
    remainingMs: number
    /** Shown once the time is up. */
    readyText?: string
    /** Whether the time being up is good news (green) or bad news (red, e.g. supplies out). */
    readyTone?: 'good' | 'bad'
  }

  let { label, remainingMs, readyText = 'Ready', readyTone = 'good' }: Props = $props()

  const ready = $derived(remainingMs <= 0)
</script>

<div class="countdown" class:ready class:bad={readyTone === 'bad'}>
  <span class="label">{label}</span>
  <span class="time"
    >{#if ready}{readyText}{:else}<Digits text={formatDuration(remainingMs)} />{/if}</span
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

  .ready.bad .time {
    color: var(--danger);
  }
</style>

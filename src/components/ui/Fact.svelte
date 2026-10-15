<script lang="ts">
  // One fact on a card: a label on the left, its value (text, buttons) on the right.
  import type { Snippet } from 'svelte'

  interface Props {
    label: string
    /** The id of a control in the value that the label names, e.g. a `Select`. */
    labelFor?: string
    /** Shown on hover over the value. */
    title?: string
    /** Let the value take the room the label leaves, e.g. for a `Select`. */
    wide?: boolean
    children: Snippet
  }

  let { label, labelFor, title, wide = false, children }: Props = $props()
</script>

<div class="fact">
  {#if labelFor}
    <label class="label" for={labelFor}>{label}</label>
  {:else}
    <span class="label">{label}</span>
  {/if}
  <span class="value" class:wide {title}>{@render children()}</span>
</div>

<style>
  .fact {
    align-items: baseline;
    display: flex;
    gap: var(--space-3);
    justify-content: space-between;
  }

  .label {
    flex-shrink: 0;
    color: var(--muted);
    font-family: var(--font-display);
    font-size: var(--text-sm);
    letter-spacing: var(--tracking);
    text-transform: uppercase;
  }

  .value {
    font-variant-numeric: tabular-nums;
    text-align: right;
  }

  .value.wide {
    flex: 1;
  }
</style>

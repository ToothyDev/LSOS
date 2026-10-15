<script lang="ts">
  // What a quick press just did, with an Undo for a while (`TimedUndo`, issue #60).
  import type { TimedUndo } from '../../lib/cards.svelte'
  import Button from './Button.svelte'

  interface Props {
    undo: TimedUndo
    /** Where the press was; shows only that offer. Leave out to show any. */
    at?: string
  }

  let { undo, at }: Props = $props()
  const offer = $derived(at === undefined ? undo.current : undo.at(at))
</script>

{#if offer}
  <span class="undo" role="status">
    {offer.text}.
    <Button small onclick={() => undo.take()}>Undo</Button>
  </span>
{/if}

<style>
  .undo {
    align-items: center;
    color: var(--fg);
    display: inline-flex;
    flex-wrap: wrap;
    font-family: var(--font-body);
    font-size: var(--text-sm);
    gap: var(--space-2);
    letter-spacing: normal;
    text-transform: none;
  }
</style>

<script lang="ts">
  // A callout on a card, a bar on its left in the tone's colour (issue #60): `warn` for what
  // needs a look ("Estimate.", "Payout cut."), `quiet` for a plain state ("Shut down."), `good`
  // for a tip. The title leads in bold; `actions` go on their own line under the text.
  import type { Snippet } from 'svelte'

  interface Props {
    tone?: 'warn' | 'quiet' | 'good'
    title?: string
    children: Snippet
    actions?: Snippet
  }

  let { tone = 'warn', title, children, actions }: Props = $props()
</script>

<div class="note {tone}" role="note">
  <p>
    {#if title}<strong>{title}</strong>{/if}
    {@render children()}
  </p>
  {#if actions}{@render actions()}{/if}
</div>

<style>
  .note {
    border-left: 3px solid var(--warn);
    display: flex;
    flex-direction: column;
    font-size: var(--text-sm);
    gap: var(--space-2);
    padding-left: var(--space-2);
  }

  p {
    margin: 0;
  }

  strong {
    color: var(--warn);
  }

  .quiet {
    border-left-color: var(--muted);
  }

  .quiet strong {
    color: inherit;
  }

  .good {
    border-left-color: var(--accent);
  }

  .good strong {
    color: var(--accent-text);
  }
</style>

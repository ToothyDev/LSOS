<script lang="ts">
  // Muted helper text on a card or panel (issue #60). `fine` is the smaller size for footnotes,
  // like how an estimate is made.
  import type { Snippet } from 'svelte'
  import type { HTMLAttributes } from 'svelte/elements'

  interface Props extends HTMLAttributes<HTMLParagraphElement> {
    fine?: boolean
    children: Snippet
  }

  let { fine = false, children, ...rest }: Props = $props()
</script>

<p class="hint" class:fine {...rest}>{@render children()}</p>

<style>
  .hint {
    color: var(--muted);
    font-size: var(--text-sm);
    margin: 0;
  }

  .fine {
    font-size: var(--text-xs);
  }
</style>

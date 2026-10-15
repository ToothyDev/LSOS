<script lang="ts">
  import type { Snippet } from 'svelte'
  import type { HTMLButtonAttributes } from 'svelte/elements'

  interface Props extends HTMLButtonAttributes {
    /**
     * primary: filled green, for the main action. ghost: outlined, for everything else.
     * A toggle button passes `aria-pressed`: not pressed reads muted, so pair it with `primary`
     * when pressed and `ghost` when not.
     */
    variant?: 'primary' | 'ghost'
    /** Smaller, for a row of several actions or a title bar. */
    small?: boolean
    children: Snippet
  }

  let { variant = 'ghost', small = false, type = 'button', children, ...rest }: Props = $props()
</script>

<button class={variant} class:small {type} {...rest}>{@render children()}</button>

<style>
  button {
    background: var(--panel-raised);
    border: 1px solid var(--line);
    border-radius: var(--radius);
    color: var(--fg);
    cursor: pointer;
    font-family: var(--font-display);
    font-size: var(--text-sm);
    letter-spacing: var(--tracking-wide);
    min-height: 2.25rem;
    padding: var(--space-1) var(--space-4);
    text-transform: uppercase;
    transition:
      background-color 0.12s,
      border-color 0.12s;
  }

  button.small {
    font-size: var(--text-xs);
    letter-spacing: var(--tracking);
    min-height: 1.75rem;
    padding: 0 var(--space-2);
  }

  button:hover {
    border-color: var(--accent);
  }

  button.primary {
    background: var(--accent-deep);
    border-color: var(--accent);
  }

  button.primary:hover {
    background: var(--accent-hover);
  }

  button[aria-pressed='false'] {
    color: var(--muted);
  }

  button:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }
</style>

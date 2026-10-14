<script lang="ts">
  import type { Snippet } from 'svelte'

  interface Props {
    title: string
    children: Snippet
    /** Optional strip under the body, like the action row on the in-game business cards. */
    footer?: Snippet
  }

  let { title, children, footer }: Props = $props()
</script>

<section class="panel" aria-label={title}>
  <h3>
    <span class="grip" aria-hidden="true"></span>{title}<span class="grip" aria-hidden="true"
    ></span>
  </h3>
  <div class="body">{@render children()}</div>
  {#if footer}
    <div class="footer">{@render footer()}</div>
  {/if}
</section>

<style>
  .panel {
    background: var(--panel);
    border: 1px solid var(--line);
    border-radius: var(--radius);
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  h3 {
    align-items: center;
    background: var(--panel-raised);
    border-bottom: 1px solid var(--line);
    display: flex;
    font-size: var(--text-md);
    gap: var(--space-3);
    justify-content: center;
    margin: 0;
    padding: var(--space-2) var(--space-3);
    text-align: center;
  }

  /* The two-column dot grip either side of the in-game card titles. */
  .grip {
    background-image: radial-gradient(var(--muted) 1px, transparent 1.5px);
    background-size: 4px 4px;
    flex: none;
    height: 12px;
    opacity: 0.6;
    width: 8px;
  }

  .body {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: var(--space-3);
    padding: var(--space-3) var(--space-4);
  }

  .footer {
    border-top: 1px solid var(--line);
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-4);
  }
</style>

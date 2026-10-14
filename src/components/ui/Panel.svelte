<script lang="ts">
  import type { Snippet } from 'svelte'
  import type { HTMLAttributes } from 'svelte/elements'

  interface Props {
    title: string
    children: Snippet
    /** Optional strip under the body, like the action row on the in-game business cards. */
    footer?: Snippet
    /**
     * Makes the title bar a handle to move the panel: these handlers go on it, it takes focus,
     * and the parent does the moving (issue #30).
     */
    move?: HTMLAttributes<HTMLDivElement>
    /** Highlights the panel while it is being moved. */
    moving?: boolean
  }

  let { title, children, footer, move, moving = false }: Props = $props()
  const id = $props.id()
</script>

<section class="panel" class:moving aria-label={title}>
  <h3>
    {#if move}
      <div
        class="title handle"
        role="button"
        tabindex="0"
        aria-describedby="{id}-move"
        data-move-handle
        {...move}
      >
        {@render heading()}
      </div>
      <span id="{id}-move" hidden>Drag, or press the arrow keys, to move this card.</span>
    {:else}
      <div class="title">{@render heading()}</div>
    {/if}
  </h3>
  <div class="body">{@render children()}</div>
  {#if footer}
    <div class="footer">{@render footer()}</div>
  {/if}
</section>

{#snippet heading()}
  <span class="grip" aria-hidden="true"></span>{title}<span class="grip" aria-hidden="true"></span>
{/snippet}

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
    background: var(--panel-raised);
    border-bottom: 1px solid var(--line);
    font-size: var(--text-md);
    margin: 0;
  }

  .title {
    align-items: center;
    display: flex;
    gap: var(--space-3);
    justify-content: center;
    padding: var(--space-2) var(--space-3);
    text-align: center;
  }

  .handle {
    cursor: grab;
    touch-action: none;
    user-select: none;
  }

  .handle:hover .grip {
    opacity: 1;
  }

  .moving {
    border-color: var(--accent);
    box-shadow: 0 0 0 1px var(--accent);
  }

  .moving .handle {
    cursor: grabbing;
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

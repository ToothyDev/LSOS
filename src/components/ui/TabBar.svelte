<script lang="ts">
  import { TABS, hashForTab, type TabId } from '../../lib/tabs'

  let { active }: { active: TabId | undefined } = $props()
</script>

<!-- Browser-style tabs: the active one joins the window below it. -->
<nav aria-label="Sections">
  {#each TABS as tab (tab.id)}
    <a href={hashForTab(tab.id)} aria-current={tab.id === active ? 'page' : undefined}>
      <span class="dot" aria-hidden="true"></span>{tab.label}
    </a>
  {/each}
</nav>

<style>
  /* Overlaps the window's top border by 1px, so the active tab can hide it. */
  nav {
    display: flex;
    margin-bottom: -1px;
    position: relative;
    z-index: 1;
    gap: 2px;
    overflow-x: auto;
    padding: var(--space-2) var(--space-2) 0;
    scrollbar-width: thin;
  }

  a {
    align-items: center;
    background: var(--bg);
    border: 1px solid var(--line);
    border-radius: 6px 6px 0 0;
    color: var(--muted);
    display: flex;
    flex: 0 1 11rem;
    font-family: var(--font-display);
    font-size: var(--text-sm);
    gap: var(--space-2);
    letter-spacing: var(--tracking-wide);
    min-width: max-content;
    padding: var(--space-2) var(--space-4);
    text-decoration: none;
    text-transform: uppercase;
    white-space: nowrap;
  }

  a:hover {
    color: var(--fg);
  }

  /* Same color as the portal bar under it, with no line between them: one piece. */
  a[aria-current='page'] {
    background: var(--panel);
    border-bottom-color: var(--panel);
    border-top: 2px solid var(--accent);
    color: var(--fg);
  }

  a:focus-visible {
    outline-offset: -3px;
  }

  /* Phones: tighter tabs so all of them fit; the strip still scrolls if they do not. */
  @media (max-width: 40rem) {
    nav {
      padding-inline: 0;
    }

    a {
      flex: 1 0 auto;
      font-size: var(--text-xs);
      justify-content: center;
      letter-spacing: 0.04em;
      padding-inline: var(--space-2);
    }

    .dot {
      display: none;
    }
  }

  .dot {
    background: var(--line);
    border-radius: 50%;
    height: 0.5rem;
    width: 0.5rem;
  }

  [aria-current='page'] .dot {
    background: var(--accent);
  }
</style>

<script lang="ts">
  import SaveStatus from './components/SaveStatus.svelte'
  import Settings from './components/Settings.svelte'
  import { TABS, hashForTab, tabFromHash, type TabId } from './lib/tabs'

  let active: TabId = $state(tabFromHash(location.hash))

  $effect(() => {
    const onHashChange = () => (active = tabFromHash(location.hash))
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  })
</script>

<header>
  <h1>LSOS <span>Los Santos Operating System</span></h1>
  <nav aria-label="Sections">
    {#each TABS as tab (tab.id)}
      <a href={hashForTab(tab.id)} aria-current={tab.id === active ? 'page' : undefined}>
        {tab.label}
      </a>
    {/each}
  </nav>
</header>

<SaveStatus />

<main>
  {#if active === 'settings'}
    <Settings />
  {:else}
    <p class="placeholder">&gt; {TABS.find((tab) => tab.id === active)?.label}: not built yet_</p>
  {/if}
</main>

<style>
  header {
    border-bottom: 1px solid var(--line);
    padding: 1rem;
  }

  h1 {
    margin: 0 0 0.75rem;
    font-size: 1.5rem;
    letter-spacing: 0.1em;
  }

  h1 span {
    color: var(--muted);
    font-size: 0.875rem;
    letter-spacing: normal;
  }

  nav {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  nav a {
    border: 1px solid var(--line);
    color: var(--fg);
    padding: 0.25rem 0.75rem;
    text-decoration: none;
    text-transform: uppercase;
  }

  nav a[aria-current='page'] {
    background: var(--accent);
    border-color: var(--accent);
    color: var(--bg);
  }

  main {
    padding: 1rem;
  }

  .placeholder {
    color: var(--muted);
  }
</style>

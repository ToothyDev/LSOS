<script lang="ts">
  import ClockBar from './components/ClockBar.svelte'
  import SaveStatus from './components/SaveStatus.svelte'
  import Settings from './components/Settings.svelte'
  import TabBar from './components/ui/TabBar.svelte'
  import { TABS, tabFromHash } from './lib/tabs'

  let hash = $state(location.hash)
  const active = $derived(tabFromHash(hash))
  // Dev-only preview of the base components at #/kit; the import is dropped from production builds.
  const kitModule = import.meta.env.DEV ? import('./components/ui/Kit.svelte') : null
  const kit = $derived(kitModule !== null && hash === '#/kit')

  $effect(() => {
    const onHashChange = () => (hash = location.hash)
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  })
</script>

<div class="terminal">
  <header>
    <span class="bar" aria-hidden="true"></span>
    <h1>Los Santos <em>Operating</em> System</h1>
    <span class="bar" aria-hidden="true"></span>
  </header>

  <TabBar active={kit ? undefined : active} />

  <div class="window">
    <ClockBar title={kit ? 'Component kit' : TABS.find((tab) => tab.id === active)!.label} />
    <SaveStatus />

    <main>
      {#if kit && kitModule}
        {#await kitModule then { default: Kit }}
          <Kit />
        {/await}
      {:else if active === 'settings'}
        <Settings />
      {:else}
        <p class="placeholder">Not built yet.</p>
      {/if}
    </main>
  </div>

  <footer>Fan-made tracker. Not affiliated with Rockstar Games.</footer>
</div>

<style>
  .terminal {
    margin: 0 auto;
    max-width: var(--max-width);
    padding: var(--space-4) var(--space-4) 0;
  }

  header {
    align-items: center;
    display: flex;
    gap: var(--space-4);
    padding: var(--space-2) 0;
  }

  .bar {
    background: var(--accent-deep);
    flex: 1;
    height: 1.25rem;
  }

  h1 {
    font-size: var(--text-2xl);
    letter-spacing: var(--tracking-wider);
    margin: 0;
    text-align: center;
  }

  h1 em {
    color: var(--accent-text);
    font-style: normal;
  }

  .window {
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: 0 0 var(--radius) var(--radius);
  }

  main {
    padding: var(--space-5) var(--space-4);
  }

  .placeholder {
    color: var(--muted);
    font-family: var(--font-display);
    letter-spacing: var(--tracking-wide);
    margin: 0;
    text-transform: uppercase;
  }

  footer {
    color: var(--muted);
    font-family: var(--font-display);
    font-size: var(--text-xs);
    letter-spacing: var(--tracking-wide);
    padding: var(--space-4) 0;
    text-align: center;
    text-transform: uppercase;
  }

  @media (max-width: 40rem) {
    .terminal {
      padding: var(--space-2) var(--space-2) 0;
    }

    .bar {
      display: none;
    }

    h1 {
      flex: 1;
      letter-spacing: var(--tracking-wide);
    }

    main {
      padding: var(--space-4) var(--space-3);
    }
  }
</style>

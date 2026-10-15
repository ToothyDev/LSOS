<script lang="ts">
  import Boot from './components/Boot.svelte'
  import Businesses from './components/Businesses.svelte'
  import ClockBar from './components/ClockBar.svelte'
  import Safes from './components/Safes.svelte'
  import SaveStatus from './components/SaveStatus.svelte'
  import Settings from './components/Settings.svelte'
  import TabBar from './components/ui/TabBar.svelte'
  import { GOODS } from './data/nightclub'
  import { PRODUCTION } from './data/production'
  import { PROPERTIES } from './data/properties'
  import { SAFES } from './data/safes'
  import { clocks } from './lib/clock.svelte'
  import './lib/production.svelte'
  import './lib/safes.svelte'
  import { setProperties, store } from './lib/store.svelte'
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
      {:else if active === 'businesses'}
        <Businesses
          catalog={PROPERTIES}
          owned={store.state.properties}
          onchange={setProperties}
          productions={PRODUCTION}
          businesses={store.state.businesses}
          now={clocks.now}
          onresync={(id, bars) =>
            (store.state.businesses = { ...store.state.businesses, [id]: bars })}
          boosts={store.state.boosts}
          onboost={(id, boost) => {
            const { [id]: _, ...rest } = store.state.boosts
            store.state.boosts = boost ? { ...rest, [id]: boost } : rest
          }}
          order={store.state.businessOrder}
          onorder={(order) => (store.state.businessOrder = order)}
          goods={GOODS}
          nightclubStock={store.state.nightclub}
          onnightclub={(id, crates) =>
            (store.state.nightclub = { ...store.state.nightclub, [id]: crates })}
        />
      {:else if active === 'safes'}
        <Safes
          safes={SAFES}
          catalog={PROPERTIES}
          owned={store.state.properties}
          onchange={setProperties}
          stored={store.state.safes}
          onresync={(id, safe) => (store.state.safes = { ...store.state.safes, [id]: safe })}
        />
      {:else if active === 'settings'}
        <Settings />
      {:else}
        <p class="placeholder">Not built yet.</p>
      {/if}
    </main>
  </div>

  <footer>
    <p>Fan-made tracker. Not affiliated with Rockstar Games.</p>
    <p>Vibe coded: this whole project is written by AI.</p>
    <a class="github" href="https://github.com/ToothyDev/LSOS" target="_blank" rel="noopener">
      <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
        <path
          fill="currentColor"
          d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"
        />
      </svg>
      View on GitHub
    </a>
  </footer>
</div>

<Boot />

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
    align-items: center;
    color: var(--muted);
    display: flex;
    flex-direction: column;
    font-family: var(--font-display);
    font-size: var(--text-xs);
    gap: var(--space-2);
    letter-spacing: var(--tracking-wide);
    padding: var(--space-4) 0 var(--space-5);
    text-align: center;
    text-transform: uppercase;
  }

  footer p {
    margin: 0;
  }

  .github {
    align-items: center;
    background: var(--panel-raised);
    border: 1px solid var(--line);
    border-radius: var(--radius);
    color: var(--fg);
    display: inline-flex;
    gap: var(--space-2);
    margin-top: var(--space-1);
    padding: var(--space-1) var(--space-3);
    text-decoration: none;
  }

  .github:hover {
    border-color: var(--accent);
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

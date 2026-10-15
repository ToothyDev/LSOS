<script lang="ts">
  // Every property LSOS supports, to mark what the user owns (decision 011).
  import type { Property } from '../data/properties'
  import type { OwnedProperties } from '../lib/properties'
  import PropertySettings from './PropertySettings.svelte'
  import Panel from './ui/Panel.svelte'

  interface Props {
    catalog: readonly Property[]
    owned: OwnedProperties
    onchange: (owned: OwnedProperties) => void
  }

  let { catalog, owned, onchange }: Props = $props()
</script>

<Panel title="Properties">
  <div class="list">
    {#each catalog as property (property.id)}
      <PropertySettings {property} {owned} {onchange} />
    {:else}
      <p>No properties yet. They appear here as their trackers are built.</p>
    {/each}
  </div>
  <p class="hint">Trackers show only what you own. Upgrades change how fast they count.</p>
</Panel>

<style>
  .list {
    align-items: start;
    display: grid;
    gap: var(--space-3) var(--space-6);
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 22rem), 1fr));
  }

  p {
    margin: 0;
  }

  .hint {
    color: var(--muted);
    font-size: var(--text-sm);
  }
</style>

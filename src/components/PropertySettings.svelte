<script lang="ts">
  // Owned yes/no, shut down (issue #38) and the upgrades of one property (decision 011), as a
  // card's gear shows them.
  import type { Property } from '../data/properties'
  import { isOwned, type OwnedProperties } from '../lib/properties'
  import PropertyToggles from './PropertyToggles.svelte'
  import PropertyUpgrades from './PropertyUpgrades.svelte'

  interface Props {
    property: Property
    owned: OwnedProperties
    onchange: (owned: OwnedProperties) => void
  }

  let { property, owned, onchange }: Props = $props()
  const id = $props.id()
</script>

<div class="property">
  <div class="owned">
    <span id="{id}-name" class="name">{property.label}</span>
    <PropertyToggles {property} {owned} {onchange} labelledby="{id}-name" />
  </div>

  {#if isOwned(owned, property.id) && property.upgrades.length > 0}
    <div class="upgrades">
      <PropertyUpgrades {property} {owned} {onchange} />
    </div>
  {/if}
</div>

<style>
  .property {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .owned {
    align-items: center;
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
    justify-content: space-between;
  }

  .name {
    font-family: var(--font-display);
    letter-spacing: var(--tracking);
    text-transform: uppercase;
  }

  .upgrades {
    border-left: 2px solid var(--line);
    margin-left: 0.5rem;
    padding-left: var(--space-3);
  }
</style>

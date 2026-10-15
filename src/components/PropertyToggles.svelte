<script lang="ts">
  // Owned yes/no and, for a business that can be shut down, running or shut down (issue #38).
  // Each button keeps its width and place whatever it says, so marking a property owned moves
  // nothing around it (issue #60).
  import type { Property } from '../data/properties'
  import {
    isOwned,
    isShutDown,
    setOwned,
    setShutDown,
    type OwnedProperties,
  } from '../lib/properties'
  import Button from './ui/Button.svelte'

  interface Props {
    property: Property
    owned: OwnedProperties
    onchange: (owned: OwnedProperties) => void
    /** The id of the element naming the property, for the Owned button's label. */
    labelledby: string
  }

  let { property, owned, onchange, labelledby }: Props = $props()
  const isPropertyOwned = $derived(isOwned(owned, property.id))
  const isPropertyRunning = $derived(!isShutDown(owned, property.id))
</script>

<div class="toggles">
  {#if property.canShutDown}
    <span class="slot">
      {#if isPropertyOwned}
        <Button
          variant={isPropertyRunning ? 'primary' : 'ghost'}
          aria-label="{property.label} running"
          aria-pressed={isPropertyRunning}
          onclick={() => onchange(setShutDown(owned, property.id, isPropertyRunning))}
        >
          {isPropertyRunning ? 'Running' : 'Shut down'}
        </Button>
      {/if}
    </span>
  {/if}
  <span class="slot">
    <Button
      variant={isPropertyOwned ? 'primary' : 'ghost'}
      aria-labelledby={labelledby}
      aria-pressed={isPropertyOwned}
      onclick={() => onchange(setOwned(owned, property.id, !isPropertyOwned))}
    >
      {isPropertyOwned ? 'Owned' : 'Not owned'}
    </Button>
  </span>
</div>

<style>
  .toggles {
    display: flex;
    flex: none;
    gap: var(--space-2);
    margin-left: auto;
  }

  /* Wide enough for the longer label, "Shut down" or "Not owned". */
  .slot {
    display: grid;
    width: 7.5rem;
  }
</style>

<script lang="ts">
  // Owned yes/no and the upgrades of one property (decision 011).
  import type { Property } from '../data/properties'
  import Button from './ui/Button.svelte'
  import {
    isOwned,
    setOwned,
    setUpgrade,
    upgradeValue,
    type OwnedProperties,
  } from '../lib/properties'

  interface Props {
    property: Property
    owned: OwnedProperties
    onchange: (owned: OwnedProperties) => void
  }

  let { property, owned, onchange }: Props = $props()
  const id = $props.id()
  const isPropertyOwned = $derived(isOwned(owned, property.id))
</script>

<div class="property">
  <div class="owned">
    <span id="{id}-name" class="name">{property.label}</span>
    <Button
      variant={isPropertyOwned ? 'primary' : 'ghost'}
      aria-labelledby="{id}-name"
      aria-pressed={isPropertyOwned}
      onclick={() => onchange(setOwned(owned, property.id, !isPropertyOwned))}
    >
      {isPropertyOwned ? 'Owned' : 'Not owned'}
    </Button>
  </div>

  {#if isPropertyOwned && property.upgrades.length > 0}
    <div class="upgrades">
      {#each property.upgrades as upgrade (upgrade.id)}
        {#if upgrade.kind === 'toggle'}
          <label>
            <input
              type="checkbox"
              checked={upgradeValue(owned, property.id, upgrade) === true}
              onchange={(event) =>
                onchange(setUpgrade(owned, property.id, upgrade.id, event.currentTarget.checked))}
            />
            {upgrade.label}
          </label>
        {:else}
          <div class="choice">
            <label for="{id}-{upgrade.id}">{upgrade.label}</label>
            <select
              id="{id}-{upgrade.id}"
              value={upgradeValue(owned, property.id, upgrade)}
              onchange={(event) =>
                onchange(setUpgrade(owned, property.id, upgrade.id, event.currentTarget.value))}
            >
              {#each upgrade.options as option (option.id)}
                <option value={option.id}>{option.label}</option>
              {/each}
            </select>
          </div>
        {/if}
      {/each}
    </div>
  {/if}
</div>

<style>
  .property {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  label {
    align-items: center;
    cursor: pointer;
    display: flex;
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

  /* Labels in one column and selects in the other, so every choice lines up. */
  .upgrades {
    align-items: center;
    border-left: 2px solid var(--line);
    display: grid;
    gap: var(--space-2) var(--space-3);
    grid-template-columns: auto minmax(0, 1fr);
    margin-left: 0.5rem;
    padding-left: var(--space-3);
  }

  .upgrades > label {
    grid-column: 1 / -1;
  }

  .choice {
    display: contents;
  }

  input[type='checkbox'] {
    accent-color: var(--accent);
    flex: none;
    height: 1.125rem;
    width: 1.125rem;
  }

  select {
    background: var(--panel-raised);
    border: 1px solid var(--line);
    border-radius: var(--radius);
    color: var(--fg);
    font: inherit;
    min-height: 2.25rem;
    min-width: 0;
    padding: var(--space-1) var(--space-2);
    width: 100%;
  }

  select:hover {
    border-color: var(--accent);
  }
</style>

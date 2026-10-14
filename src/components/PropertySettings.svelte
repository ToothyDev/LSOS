<script lang="ts">
  // Owned yes/no and the upgrades of one property (decision 011).
  import type { Property } from '../data/properties'
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
</script>

<div class="property">
  <label class="owned">
    <input
      type="checkbox"
      checked={isOwned(owned, property.id)}
      onchange={(event) => onchange(setOwned(owned, property.id, event.currentTarget.checked))}
    />
    <span>Own {property.label}</span>
  </label>

  {#if isOwned(owned, property.id) && property.upgrades.length > 0}
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
    font-family: var(--font-display);
    letter-spacing: var(--tracking);
    text-transform: uppercase;
  }

  .upgrades {
    border-left: 2px solid var(--line);
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    margin-left: 0.5rem;
    padding-left: var(--space-3);
  }

  .choice {
    align-items: center;
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
    justify-content: space-between;
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
    padding: var(--space-1) var(--space-2);
  }

  select:hover {
    border-color: var(--accent);
  }
</style>

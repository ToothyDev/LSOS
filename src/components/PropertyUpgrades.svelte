<script lang="ts">
  // The upgrades of one property (decision 011). `disabled` shows them greyed, e.g. while the
  // property is not owned, so owning it changes their state and not the layout (issue #60).
  import type { Property } from '../data/properties'
  import { setUpgrade, upgradeValue, type OwnedProperties } from '../lib/properties'
  import NumberField from './ui/NumberField.svelte'
  import Select from './ui/Select.svelte'

  interface Props {
    property: Property
    owned: OwnedProperties
    onchange: (owned: OwnedProperties) => void
    disabled?: boolean
  }

  let { property, owned, onchange, disabled = false }: Props = $props()
  const id = $props.id()
</script>

<fieldset class="upgrades" {disabled}>
  <legend class="visually-hidden">{property.label} upgrades</legend>
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
    {:else if upgrade.kind === 'count'}
      <div class="count">
        <NumberField
          label={upgrade.label}
          value={upgradeValue(owned, property.id, upgrade) as number}
          min={0}
          max={upgrade.max}
          onchange={(value) => onchange(setUpgrade(owned, property.id, upgrade.id, value))}
        />
      </div>
    {:else}
      <div class="choice">
        <label for="{id}-{upgrade.id}">{upgrade.label}</label>
        <Select
          id="{id}-{upgrade.id}"
          value={upgradeValue(owned, property.id, upgrade) as string}
          options={upgrade.options}
          onchange={(value) => onchange(setUpgrade(owned, property.id, upgrade.id, value))}
        />
      </div>
    {/if}
  {/each}
</fieldset>

<style>
  /* Labels in one column and selects in the other, so every choice lines up. */
  .upgrades {
    align-items: center;
    border: 0;
    display: grid;
    gap: var(--space-2) var(--space-3);
    grid-template-columns: auto minmax(0, 1fr);
    margin: 0;
    min-width: 0;
    padding: 0;
  }

  .upgrades:disabled {
    opacity: 0.6;
  }

  label {
    align-items: center;
    cursor: pointer;
    display: flex;
    gap: var(--space-2);
  }

  .upgrades:disabled label {
    cursor: default;
  }

  .upgrades > label,
  .count {
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

  .visually-hidden {
    clip-path: inset(50%);
    height: 1px;
    overflow: hidden;
    position: absolute;
    white-space: nowrap;
    width: 1px;
  }
</style>

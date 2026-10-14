<script lang="ts">
  // The owned businesses, each with a gear to change what is owned and upgraded (decision 011).
  import type { Property } from '../data/properties'
  import { ownedProperties, upgradeValue, type OwnedProperties } from '../lib/properties'
  import { hashForTab } from '../lib/tabs'
  import PropertySettings from './PropertySettings.svelte'
  import Button from './ui/Button.svelte'
  import Panel from './ui/Panel.svelte'

  interface Props {
    catalog: readonly Property[]
    owned: OwnedProperties
    onchange: (owned: OwnedProperties) => void
  }

  let { catalog, owned, onchange }: Props = $props()
  const shown = $derived(ownedProperties(catalog, owned))
  let open = $state<string | null>(null)

  /** Short summary of the bought upgrades, e.g. "Equipment, Technician: Cash". */
  function summary(property: Property): string {
    const parts = property.upgrades.flatMap((upgrade) => {
      const value = upgradeValue(owned, property.id, upgrade)
      if (upgrade.kind === 'toggle') return value === true ? [upgrade.label] : []
      if (value === upgrade.options[0]?.id) return []
      const option = upgrade.options.find((o) => o.id === value)
      return option ? [`${upgrade.label}: ${option.label}`] : []
    })
    return parts.length > 0 ? parts.join(', ') : 'No upgrades'
  }
</script>

{#if shown.length === 0}
  <p class="empty">
    {#if catalog.length === 0}
      No businesses are tracked yet.
    {:else}
      You do not own any business yet. Mark what you own in
      <a href={hashForTab('settings')}>Settings</a>.
    {/if}
  </p>
{:else}
  <div class="grid">
    {#each shown as property (property.id)}
      <Panel title={property.label}>
        {#if open === property.id}
          <PropertySettings {property} {owned} {onchange} />
        {:else}
          <p class="hint">{summary(property)}</p>
        {/if}
        {#snippet footer()}
          <Button
            aria-label="Settings for {property.label}"
            aria-expanded={open === property.id}
            onclick={() => (open = open === property.id ? null : property.id)}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
              <path
                fill="currentColor"
                d="M19.14 12.94a7.07 7.07 0 0 0 0-1.88l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.39.96a7 7 0 0 0-1.62-.94l-.36-2.54a.5.5 0 0 0-.5-.42h-3.84a.5.5 0 0 0-.5.42l-.36 2.54a7 7 0 0 0-1.62.94l-2.39-.96a.5.5 0 0 0-.6.22L2.71 8.84a.5.5 0 0 0 .12.64l2.03 1.58a7.07 7.07 0 0 0 0 1.88l-2.03 1.58a.5.5 0 0 0-.12.64l1.92 3.32a.5.5 0 0 0 .6.22l2.39-.96a7 7 0 0 0 1.62.94l.36 2.54a.5.5 0 0 0 .5.42h3.84a.5.5 0 0 0 .5-.42l.36-2.54a7 7 0 0 0 1.62-.94l2.39.96a.5.5 0 0 0 .6-.22l1.92-3.32a.5.5 0 0 0-.12-.64zM12 15.5A3.5 3.5 0 1 1 12 8.5a3.5 3.5 0 0 1 0 7z"
              />
            </svg>
          </Button>
        {/snippet}
      </Panel>
    {/each}
  </div>
{/if}

<style>
  .grid {
    display: grid;
    gap: var(--space-5);
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 24rem), 1fr));
  }

  p {
    margin: 0;
  }

  .empty {
    color: var(--muted);
  }

  .empty a {
    color: var(--accent-text);
  }

  .hint {
    color: var(--muted);
    font-size: var(--text-sm);
  }

  svg {
    display: block;
  }
</style>

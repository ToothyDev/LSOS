<script lang="ts">
  // The safes of owned properties (issue #8), each with a gear to change what is owned and
  // upgraded (decision 011). Logic: lib/safes.ts.
  import type { Property } from '../data/properties'
  import type { Safe } from '../data/safes'
  import { isOwned, type OwnedProperties } from '../lib/properties'
  import { emptySafe, type SafesById, type SafeState } from '../lib/safes'
  import { hashForTab } from '../lib/tabs'
  import PropertySettings from './PropertySettings.svelte'
  import SafeCard from './SafeCard.svelte'
  import Button from './ui/Button.svelte'
  import Panel from './ui/Panel.svelte'
  import SettingsButton from './ui/SettingsButton.svelte'

  interface Props {
    safes: readonly Safe[]
    catalog: readonly Property[]
    owned: OwnedProperties
    onchange: (owned: OwnedProperties) => void
    /** Saved safes by property id. */
    stored: SafesById
    onresync: (propertyId: string, state: SafeState) => void
  }

  let { safes, catalog, owned, onchange, stored, onresync }: Props = $props()

  const shown = $derived(
    safes.flatMap((safe) => {
      const property = catalog.find((p) => p.id === safe.propertyId)
      return property && isOwned(owned, property.id) ? [{ safe, property }] : []
    }),
  )
  let open = $state<string | null>(null)
  let editing = $state<string | null>(null)
</script>

{#if shown.length === 0}
  <p class="empty">
    You do not own a property with a safe yet: {safes
      .map((safe) => catalog.find((p) => p.id === safe.propertyId)?.label)
      .join(', ')}. Mark what you own in <a href={hashForTab('settings')}>Settings</a>.
  </p>
{:else}
  <div class="grid">
    {#each shown as { safe, property } (property.id)}
      <Panel title={property.label}>
        {#if open === property.id}
          <PropertySettings {property} {owned} {onchange} />
        {/if}
        <SafeCard
          {safe}
          {property}
          {owned}
          safeState={stored[property.id] ?? emptySafe(safe)}
          editing={editing === property.id}
          onresync={(state) => onresync(property.id, state)}
        />
        {#snippet footer()}
          <Button
            aria-expanded={editing === property.id}
            onclick={() => (editing = editing === property.id ? null : property.id)}
            >{editing === property.id ? 'Done' : 'Edit'}</Button
          >
          <SettingsButton
            label={property.label}
            open={open === property.id}
            onclick={() => (open = open === property.id ? null : property.id)}
          />
        {/snippet}
      </Panel>
    {/each}
  </div>
{/if}

<style>
  .grid {
    display: grid;
    gap: var(--space-5);
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 20rem), 1fr));
  }

  .empty {
    color: var(--muted);
    margin: 0;
  }

  .empty a {
    color: var(--accent-text);
  }
</style>

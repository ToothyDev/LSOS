<script lang="ts">
  // The safes of owned properties (issue #8) and the Money Fronts safe (issue #11), each with a
  // gear to change what is owned and upgraded (decision 011). Cards move like the business cards
  // (decision 026). Logic: lib/safes.ts, lib/fronts.ts.
  import { CAR_WASH, FRONTS } from '../data/fronts'
  import type { Property } from '../data/properties'
  import type { Safe } from '../data/safes'
  import { isOwned, type OwnedProperties } from '../lib/properties'
  import { emptyFronts } from '../lib/fronts'
  import { emptySafe, type SafesById, type SafeState } from '../lib/safes'
  import { hashForTab } from '../lib/tabs'
  import PropertySettings from './PropertySettings.svelte'
  import MoneyFrontsCard from './MoneyFrontsCard.svelte'
  import SafeCard from './SafeCard.svelte'
  import Button from './ui/Button.svelte'
  import CardGrid from './ui/CardGrid.svelte'
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
    /** Saved card order: property ids, the car wash for Money Fronts (issue #51). */
    order?: readonly string[]
    onorder?: (order: string[]) => void
  }

  let {
    safes,
    catalog,
    owned,
    onchange,
    stored,
    onresync,
    order = [],
    onorder = () => {},
  }: Props = $props()

  const shown = $derived(
    safes.flatMap((safe) => {
      const property = catalog.find((p) => p.id === safe.propertyId)
      return property && isOwned(owned, property.id) ? [{ safe, property }] : []
    }),
  )
  const fronts = $derived(isOwned(owned, CAR_WASH))
  const frontProperties = $derived(
    FRONTS.flatMap((front) => catalog.filter((p) => p.id === front.propertyId)),
  )
  // Money Fronts first until moved, then the property safes.
  const cards = $derived([
    ...(fronts ? [{ id: CAR_WASH, label: 'Money Fronts' }] : []),
    ...shown.map(({ property }) => ({ id: property.id, label: property.label })),
  ])
  let open = $state<string | null>(null)
  let editing = $state<string | null>(null)
</script>

{#if shown.length === 0 && !fronts}
  <p class="empty">
    You do not own a property with a safe yet: {[CAR_WASH, ...safes.map((safe) => safe.propertyId)]
      .map((id) => catalog.find((p) => p.id === id)?.label)
      .join(', ')}. Mark what you own in <a href={hashForTab('settings')}>Settings</a>.
  </p>
{:else}
  <CardGrid items={cards} id={(card) => card.id} label={(card) => card.label} {order} {onorder}>
    {#snippet card({ id }, move, moving)}
      {@const entry = shown.find(({ property }) => property.id === id)}
      {#if id === CAR_WASH}
        <Panel title="Money Fronts" focus={CAR_WASH} {move} {moving}>
          {#if open === CAR_WASH}
            {#each frontProperties as property (property.id)}
              <PropertySettings {property} {owned} {onchange} />
            {/each}
          {/if}
          <MoneyFrontsCard
            {catalog}
            {owned}
            {onchange}
            safeState={stored[CAR_WASH] ?? emptyFronts()}
            editing={editing === CAR_WASH}
            onresync={(state) => onresync(CAR_WASH, state)}
          />
          {#snippet footer()}
            <Button
              aria-expanded={editing === CAR_WASH}
              onclick={() => (editing = editing === CAR_WASH ? null : CAR_WASH)}
              >{editing === CAR_WASH ? 'Done' : 'Edit'}</Button
            >
            <SettingsButton
              label="Money Fronts"
              open={open === CAR_WASH}
              onclick={() => (open = open === CAR_WASH ? null : CAR_WASH)}
            />
          {/snippet}
        </Panel>
      {:else if entry}
        {@const { safe, property } = entry}
        <Panel title={property.label} focus={property.id} {move} {moving}>
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
      {/if}
    {/snippet}
  </CardGrid>
{/if}

<style>
  .empty {
    color: var(--muted);
    margin: 0;
  }

  .empty a {
    color: var(--accent-text);
  }
</style>

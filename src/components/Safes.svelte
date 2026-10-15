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
  import PropertySettings from './PropertySettings.svelte'
  import MoneyFrontsCard from './MoneyFrontsCard.svelte'
  import SafeCard from './SafeCard.svelte'
  import CardGrid from './ui/CardGrid.svelte'
  import MarkOwned from './ui/MarkOwned.svelte'
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
  // The card whose settings are open, one at a time.
  let open = $state<string | null>(null)
</script>

{#snippet gear(id: string, label: string)}
  <SettingsButton {label} open={open === id} onclick={() => (open = open === id ? null : id)} />
{/snippet}

{#if shown.length === 0 && !fronts}
  <MarkOwned>
    You do not own a property with a safe yet: {[CAR_WASH, ...safes.map((safe) => safe.propertyId)]
      .map((id) => catalog.find((p) => p.id === id)?.label)
      .join(', ')}.
  </MarkOwned>
{:else}
  <CardGrid items={cards} id={(card) => card.id} label={(card) => card.label} {order} {onorder}>
    {#snippet card({ id }, move, moving)}
      {@const entry = shown.find(({ property }) => property.id === id)}
      {#if id === CAR_WASH}
        <Panel title="Money Fronts" focus={CAR_WASH} {move} {moving}>
          {#snippet actions()}{@render gear(CAR_WASH, 'Money Fronts')}{/snippet}
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
            onresync={(state) => onresync(CAR_WASH, state)}
          />
        </Panel>
      {:else if entry}
        {@const { safe, property } = entry}
        <Panel title={property.label} focus={property.id} {move} {moving}>
          {#snippet actions()}{@render gear(property.id, property.label)}{/snippet}
          {#if open === property.id}
            <PropertySettings {property} {owned} {onchange} />
          {/if}
          <SafeCard
            {safe}
            {property}
            {owned}
            safeState={stored[property.id] ?? emptySafe(safe)}
            onresync={(state) => onresync(property.id, state)}
          />
        </Panel>
      {/if}
    {/snippet}
  </CardGrid>
{/if}

<script lang="ts">
  // The owned businesses, each with a gear to change what is owned and upgraded (decision 011),
  // and its stock and supplies if LSOS has production data for it (issue #6). Cards move by
  // dragging or with the arrow keys on their title bar (issue #30, decision 026). The nightclub shows its
  // warehouse goods (issue #7).
  import { NIGHTCLUB_ID, type Goods } from '../data/nightclub'
  import type { Production } from '../data/production'
  import type { Property } from '../data/properties'
  import {
    emptyBars,
    matchingRate,
    rateFor,
    valueBonus,
    farValueEstimated,
    type Boost,
    type BoostsById,
    type BusinessBarsById,
  } from '../lib/production'
  import {
    isShutDown,
    ownedProperties,
    upgradeSummary,
    type OwnedProperties,
  } from '../lib/properties'
  import type { GoodsStock } from '../lib/nightclub'
  import type { Bars } from '../lib/resync'
  import type { MansionBoost } from '../lib/timers'
  import { CardModes } from '../lib/cards.svelte'
  import BusinessProduction from './BusinessProduction.svelte'
  import NightclubWarehouse from './NightclubWarehouse.svelte'
  import PropertySettings from './PropertySettings.svelte'
  import Button from './ui/Button.svelte'
  import CardGrid from './ui/CardGrid.svelte'
  import Hint from './ui/Hint.svelte'
  import MarkOwned from './ui/MarkOwned.svelte'
  import Panel from './ui/Panel.svelte'
  import CardFooter from './ui/CardFooter.svelte'

  interface Props {
    catalog: readonly Property[]
    owned: OwnedProperties
    onchange: (owned: OwnedProperties) => void
    productions?: readonly Production[]
    /** Saved stock and supplies by property id. */
    businesses?: BusinessBarsById
    /** Wall-clock time, for supply deliveries. */
    now?: number
    onresync?: (propertyId: string, bars: Bars) => void
    /** The last production boost by property id (issue #9). */
    boosts?: BoostsById
    onboost?: (propertyId: string, boost: Boost | undefined) => void
    /** The last Mansion boost (issue #14). */
    mansionBoost?: MansionBoost
    /** Saved card order: property ids (issue #30). */
    order?: readonly string[]
    onorder?: (order: string[]) => void
    /** Nightclub warehouse goods and their saved crates (issue #7). */
    goods?: readonly Goods[]
    nightclubStock?: GoodsStock
    onnightclub?: (goodsId: string, crates: number) => void
  }

  let {
    catalog,
    owned,
    onchange,
    productions = [],
    businesses = {},
    now = 0,
    onresync = () => {},
    boosts = {},
    onboost = () => {},
    mansionBoost,
    order = [],
    onorder = () => {},
    goods = [],
    nightclubStock = {},
    onnightclub = () => {},
  }: Props = $props()
  const ownedList = $derived(
    ownedProperties(catalog, owned).filter((property) => property.card !== false),
  )
  // Cards start collapsed: bars, value and next countdown only (issue #6).
  const modes = new CardModes()
  // The boost a press replaced, so a press by mistake can be taken back from the footer.
  let undoBoost = $state<{ id: string; before: Boost | undefined } | null>(null)
</script>

{#snippet boostUndo()}
  <Button
    onclick={() => {
      onboost(undoBoost!.id, undoBoost!.before)
      undoBoost = null
    }}
    title="Take back a boost started by mistake">Undo boost</Button
  >
{/snippet}

{#if ownedList.length === 0}
  <MarkOwned>You do not own any business yet.</MarkOwned>
{:else}
  <CardGrid
    items={ownedList}
    id={(property) => property.id}
    label={(property) => property.label}
    {order}
    {onorder}
  >
    {#snippet card(property, move, moving)}
      {@const production = productions.find((p) => p.propertyId === property.id)}
      {@const warehouse = property.id === NIGHTCLUB_ID && goods.length > 0}
      <div class="shell" class:shut={isShutDown(owned, property.id)}>
        <Panel title={property.label} {move} {moving} focus={property.id}>
          {#if modes.is(property.id, 'settings')}
            <PropertySettings {property} {owned} {onchange} />
          {:else}
            <Hint>{upgradeSummary(owned, property)}</Hint>
          {/if}
          {#if production}
            <BusinessProduction
              {production}
              rate={matchingRate(production, owned, property)}
              running={rateFor(production, owned, property)}
              shutDown={isShutDown(owned, property.id)}
              bars={businesses[property.id] ?? emptyBars()}
              {now}
              editing={modes.editing(property.id)}
              onresync={(bars) => onresync(property.id, bars)}
              bonus={valueBonus(production, owned, property)}
              farEstimated={farValueEstimated(production, owned)}
              boost={boosts[property.id]}
              onboost={(boost) => {
                undoBoost = { id: property.id, before: boosts[property.id] }
                onboost(property.id, boost)
              }}
              {mansionBoost}
            />
          {/if}
          {#if warehouse}
            <NightclubWarehouse
              {goods}
              nightclub={property}
              {owned}
              {onchange}
              stock={nightclubStock}
              editing={modes.editing(property.id)}
              onresync={onnightclub}
            />
          {/if}
          {#snippet footer()}
            <CardFooter
              id={property.id}
              label={property.label}
              {modes}
              editable={!!(production || warehouse)}
              undo={undoBoost?.id === property.id ? boostUndo : undefined}
            />
          {/snippet}
        </Panel>
      </div>
    {/snippet}
  </CardGrid>
{/if}

<style>
  /* Lets the panel fill its grid cell. */
  .shell {
    display: grid;
  }

  /* A shut-down business is dimmed like a disabled control: same colours, darker (issue #38). */
  .shell.shut {
    filter: brightness(0.65);
  }
</style>

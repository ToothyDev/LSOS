<script lang="ts">
  // Every property LSOS supports, to mark what the user owns (decision 011), and the upgrades of
  // the one picked in the list (issue #60). Rows keep their height whatever is owned, so marking
  // properties moves nothing. The gear on a row opens its upgrades in a panel beside the list,
  // level with the row, or under the row where there is no room beside it.
  import type { Property } from '../data/properties'
  import { isOwned, upgradeSummary, type OwnedProperties } from '../lib/properties'
  import PropertyToggles from './PropertyToggles.svelte'
  import PropertyUpgrades from './PropertyUpgrades.svelte'
  import GearIcon from './ui/GearIcon.svelte'
  import Hint from './ui/Hint.svelte'
  import Panel from './ui/Panel.svelte'

  interface Props {
    catalog: readonly Property[]
    owned: OwnedProperties
    onchange: (owned: OwnedProperties) => void
    /** A property to pick, e.g. from a link to it. */
    select?: string
  }

  let { catalog, owned, onchange, select }: Props = $props()
  const id = $props.id()

  let picked = $state<string | undefined>()
  $effect(() => {
    if (select && catalog.some((p) => p.id === select)) picked = select
  })
  const current = $derived(catalog.find((p) => p.id === picked) ?? catalog[0])

  // The detail panel sits level with the picked row: centred on it, kept within the list.
  let grid = $state<HTMLElement>()
  let detail = $state<HTMLElement>()
  let offset = $state(0)
  let arrow = $state(0)

  function place() {
    const list = grid?.firstElementChild as HTMLElement | null
    const row = grid?.querySelector<HTMLElement>(
      `.row[data-focus="${CSS.escape(current?.id ?? '')}"]`,
    )
    if (!grid || !list || !row || !detail) return
    const middle =
      row.getBoundingClientRect().top - grid.getBoundingClientRect().top + row.offsetHeight / 2
    const room = Math.max(0, list.offsetHeight - detail.offsetHeight)
    offset = Math.min(room, Math.max(0, middle - detail.offsetHeight / 2))
    arrow = middle - offset
  }

  $effect(() => {
    void current
    place()
    const observer = new ResizeObserver(place)
    if (grid) observer.observe(grid)
    if (detail) observer.observe(detail)
    return () => observer.disconnect()
  })

  function summary(property: Property): string {
    if (!isOwned(owned, property.id)) return 'Not owned'
    if (property.upgrades.length === 0) return 'Nothing to set'
    return upgradeSummary(owned, property)
  }
</script>

<div class="wrap">
  <div class="properties" bind:this={grid}>
    <Panel title="Properties">
      <Hint>Trackers show only what you own. Pick one to set its upgrades.</Hint>
      <ul class="list">
        {#each catalog as property (property.id)}
          {@const isPicked = property.id === current?.id}
          <li
            class="row"
            class:picked={isPicked}
            class:off={!isOwned(owned, property.id)}
            data-focus={property.id}
          >
            <button
              type="button"
              class="pick"
              aria-current={isPicked}
              aria-controls="{id}-detail"
              onclick={() => (picked = property.id)}
            >
              <!-- In front of the name, so the gears line up; kept empty without upgrades. -->
              <span class="gear" title={property.upgrades.length > 0 ? 'Upgrades' : undefined}>
                {#if property.upgrades.length > 0}<GearIcon />{/if}
              </span>
              <span class="text">
                <span id="{id}-{property.id}" class="name">{property.label}</span>
                <span class="summary">{summary(property)}</span>
              </span>
            </button>
            <PropertyToggles
              {property}
              {owned}
              labelledby="{id}-{property.id}"
              onchange={(next) => {
                picked = property.id
                onchange(next)
              }}
            />
          </li>
          {#if isPicked}
            <li class="inline">{@render upgrades(property)}</li>
          {/if}
        {:else}
          <li>No properties yet. They appear here as their trackers are built.</li>
        {/each}
      </ul>
    </Panel>

    {#if current}
      <div
        class="detail"
        id="{id}-detail"
        bind:this={detail}
        style:--offset="{offset}px"
        style:--arrow="{arrow}px"
      >
        <Panel title={current.label}>{@render upgrades(current)}</Panel>
      </div>
    {/if}
  </div>
</div>

{#snippet upgrades(property: Property)}
  {#if property.upgrades.length === 0}
    <Hint>Nothing to set: LSOS tracks it as soon as you mark it owned.</Hint>
  {:else}
    <!-- Always one line, so marking it owned does not move the upgrades. -->
    <Hint
      >{isOwned(owned, property.id)
        ? 'Upgrades change how fast its trackers count.'
        : `Mark ${property.label} owned to set its upgrades.`}</Hint
    >
    <PropertyUpgrades {property} {owned} {onchange} disabled={!isOwned(owned, property.id)} />
  {/if}
{/snippet}

<style>
  /* The list and the picked property side by side once both fit, else one under the other. */
  .wrap {
    container-type: inline-size;
  }

  .properties {
    display: grid;
    gap: var(--space-5);
  }

  .list {
    display: flex;
    flex-direction: column;
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .row {
    align-items: center;
    border-left: 3px solid transparent;
    border-top: 1px solid var(--line);
    display: flex;
    gap: var(--space-2);
    padding: var(--space-2);
  }

  .row:hover {
    background: var(--surface);
  }

  .row.picked {
    background: var(--panel-raised);
    border-left-color: var(--accent);
  }

  .pick {
    background: none;
    border: 0;
    color: inherit;
    cursor: pointer;
    align-items: center;
    display: flex;
    flex: 1;
    font: inherit;
    gap: var(--space-2);
    min-width: 0;
    padding: 0;
    text-align: left;
  }

  .text {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-width: 0;
  }

  /* Says the row opens something; lit on the open one. */
  .gear {
    color: var(--muted);
    flex: none;
    width: 16px;
  }

  .pick:hover .gear,
  .picked .gear {
    color: var(--accent-text);
  }

  .name {
    font-family: var(--font-display);
    letter-spacing: var(--tracking);
    text-transform: uppercase;
  }

  .off .name {
    color: var(--muted);
  }

  /* One line: the full list of upgrades is in the panel. */
  .summary {
    color: var(--muted);
    font-size: var(--text-sm);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .inline {
    border-left: 3px solid var(--accent);
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    padding: 0 0 var(--space-3) var(--space-4);
  }

  /* Last, so these win over the rules above. */
  @container (width >= 44rem) {
    .properties {
      align-items: start;
      grid-template-columns: minmax(0, 3fr) minmax(0, 2fr);
    }

    .detail {
      position: relative;
      transform: translateY(var(--offset));
      transition: transform 0.15s ease-out;
    }

    /* Points at the picked row. */
    .detail::before {
      border-bottom: 0.5rem solid transparent;
      border-right: 0.5rem solid var(--accent);
      border-top: 0.5rem solid transparent;
      content: '';
      left: -0.5rem;
      position: absolute;
      top: calc(var(--arrow) - 0.5rem);
    }

    .inline {
      display: none;
    }
  }

  @container (width < 44rem) {
    .detail {
      display: none;
    }
  }
</style>

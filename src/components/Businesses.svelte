<script lang="ts">
  // The owned businesses, each with a gear to change what is owned and upgraded (decision 011),
  // and its stock and supplies if LSOS has production data for it (issue #6). Cards move by
  // dragging their title bar or with its arrow keys (issue #30).
  import { tick } from 'svelte'
  import type { HTMLAttributes } from 'svelte/elements'
  import { flip } from 'svelte/animate'
  import { cubicOut } from 'svelte/easing'
  import type { Production } from '../data/production'
  import type { Property } from '../data/properties'
  import { applyOrder, cardAt, moveId, saveOrder, swapAt, type CardBox } from '../lib/order'
  import { emptyBars, matchingRate, rateFor, type BusinessBarsById } from '../lib/production'
  import { ownedProperties, upgradeValue, type OwnedProperties } from '../lib/properties'
  import type { Bars } from '../lib/resync'
  import { hashForTab } from '../lib/tabs'
  import BusinessProduction from './BusinessProduction.svelte'
  import PropertySettings from './PropertySettings.svelte'
  import Button from './ui/Button.svelte'
  import Panel from './ui/Panel.svelte'

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
    /** Saved card order: property ids (issue #30). */
    order?: readonly string[]
    onorder?: (order: string[]) => void
  }

  let {
    catalog,
    owned,
    onchange,
    productions = [],
    businesses = {},
    now = 0,
    onresync = () => {},
    order = [],
    onorder = () => {},
  }: Props = $props()
  const ownedList = $derived(ownedProperties(catalog, owned))
  const sorted = $derived(
    applyOrder(
      ownedList.map((property) => property.id),
      order,
    ),
  )
  // While a card is dragged: the order as it would drop now, the dragged card swapped with the
  // one under the pointer (only those two move). Saved on release.
  let preview = $state<string[] | null>(null)
  let moving = $state<string | null>(null)
  // The dragged card follows the pointer: where on the card it was grabbed, and how far it is
  // from its slot in the grid. Its slot stays outlined.
  let grab = { x: 0, y: 0 }
  let lift = $state({ x: 0, y: 0 })
  // After release the card glides into its slot before it counts as put down.
  let settling = $state<string | null>(null)
  let announcement = $state('')
  const shown = $derived(
    (preview ?? sorted).flatMap((id) => ownedList.filter((property) => property.id === id)),
  )

  function save(ids: string[]) {
    if (ids.join() !== sorted.join()) onorder(saveOrder(ids, order))
  }

  const slotOf = (id: string) => document.querySelector<HTMLElement>(`[data-card="${id}"]`)

  /** Puts the lifted card under the pointer, measured from its slot. */
  function follow(id: string, x: number, y: number) {
    const slot = slotOf(id)?.getBoundingClientRect()
    if (slot) lift = { x: x - grab.x - slot.left, y: y - grab.y - slot.top }
  }

  function stopMoving() {
    moving = null
    preview = null
    lift = { x: 0, y: 0 }
  }

  // A swap needs the pointer this far inside the other card (share of its size per side).
  const SWAP_INSET = 0.2

  /** The card slots where they end up, in viewport pixels: offsets skip the slide transforms. */
  function slots(): CardBox[] {
    const cards = [...document.querySelectorAll<HTMLElement>('[data-card]')]
    const parent = cards[0]?.offsetParent
    if (!parent) return []
    const origin = parent.getBoundingClientRect()
    return cards.map((card) => ({
      id: card.dataset.card!,
      left: origin.left + parent.clientLeft + card.offsetLeft,
      top: origin.top + parent.clientTop + card.offsetTop,
      width: card.offsetWidth,
      height: card.offsetHeight,
    }))
  }

  // The rest of a drag is followed on the window, where the pointer goes when it leaves the
  // handle.
  async function drag(event: PointerEvent) {
    if (moving === null || !preview) return
    const { clientX: x, clientY: y } = event
    const target = cardAt(slots(), x, y, SWAP_INSET)
    if (target !== null && target !== moving) {
      preview = swapAt(sorted, moving, preview.indexOf(target))
      await tick()
    }
    if (moving !== null) follow(moving, x, y)
  }

  function drop() {
    if (moving === null || !preview) return
    const id = moving
    save(preview)
    stopMoving()
    // Glide from where it was let go into its slot (a style transition, not game time).
    settling = id
    setTimeout(() => {
      if (settling === id) settling = null
    }, SETTLE_MS)
  }

  const SETTLE_MS = 200

  /** Slides cards to their new places; the lifted card follows the pointer instead. */
  function slide(node: HTMLElement, rects: { from: DOMRect; to: DOMRect }) {
    if (node.dataset.card === moving) return { duration: 0 }
    return flip(node, rects, { duration: 250, easing: cubicOut })
  }

  /** Handlers for the title bar of one card. */
  function handle(id: string): HTMLAttributes<HTMLDivElement> {
    return {
      onpointerdown: (event) => {
        if (event.button !== 0) return
        event.preventDefault()
        const slot = slotOf(id)?.getBoundingClientRect()
        if (!slot) return
        grab = { x: event.clientX - slot.left, y: event.clientY - slot.top }
        moving = id
        preview = [...sorted]
        lift = { x: 0, y: 0 }
      },
      onkeydown: async (event) => {
        const from = sorted.indexOf(id)
        const to =
          event.key === 'ArrowLeft' || event.key === 'ArrowUp'
            ? from - 1
            : event.key === 'ArrowRight' || event.key === 'ArrowDown'
              ? from + 1
              : event.key === 'Home'
                ? 0
                : event.key === 'End'
                  ? sorted.length - 1
                  : null
        if (to === null) return
        event.preventDefault()
        const next = moveId(sorted, id, to)
        save(next)
        announcement = `${ownedList.find((p) => p.id === id)?.label} moved to place ${next.indexOf(id) + 1} of ${next.length}.`
        // Moving the card in the page can take the focus away from its handle.
        await tick()
        document.querySelector<HTMLElement>(`[data-card="${id}"] [data-move-handle]`)?.focus()
      },
    }
  }
  let open = $state<string | null>(null)
  // Cards start collapsed: bars, value and next countdown only (issue #6).
  let editing = $state<string | null>(null)

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

<svelte:window onpointermove={drag} onpointerup={drop} onpointercancel={stopMoving} />

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
      {@const production = productions.find((p) => p.propertyId === property.id)}
      <div class="card" class:slot={moving === property.id} data-card={property.id} animate:slide>
        <div
          class="lift"
          class:lifted={moving === property.id}
          class:settling={settling === property.id}
          style:translate={moving === property.id ? `${lift.x}px ${lift.y}px` : undefined}
        >
          <Panel title={property.label} move={handle(property.id)} moving={moving === property.id}>
            {#if open === property.id}
              <PropertySettings {property} {owned} {onchange} />
            {:else}
              <p class="hint">{summary(property)}</p>
            {/if}
            {#if production}
              <BusinessProduction
                {production}
                rate={matchingRate(production, owned, property)}
                running={rateFor(production, owned, property)}
                bars={businesses[property.id] ?? emptyBars()}
                {now}
                editing={editing === property.id}
                onresync={(bars) => onresync(property.id, bars)}
              />
            {/if}
            {#snippet footer()}
              {#if production}
                <Button
                  aria-expanded={editing === property.id}
                  onclick={() => (editing = editing === property.id ? null : property.id)}
                  >{editing === property.id ? 'Done' : 'Edit'}</Button
                >
              {/if}
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
        </div>
      </div>
    {/each}
  </div>
  <p class="announcement" aria-live="polite">{announcement}</p>
{/if}

<style>
  .grid {
    display: grid;
    gap: var(--space-5);
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 20rem), 1fr));
  }

  /* Lets the panel fill its grid cell. */
  .card,
  .lift {
    display: grid;
  }

  /* Where the lifted card goes back to. */
  .slot {
    border-radius: var(--radius);
    outline: 1px dashed var(--track-edge);
    outline-offset: -1px;
  }

  .lift.lifted {
    box-shadow: 0 0.75rem 2rem rgb(0 0 0 / 0.5);
    pointer-events: none;
    position: relative;
    scale: 1.02;
    z-index: 1;
  }

  .lift.settling {
    position: relative;
    transition:
      translate 0.2s ease-out,
      scale 0.2s ease-out;
    z-index: 1;
  }

  p {
    margin: 0;
  }

  .announcement {
    clip-path: inset(50%);
    height: 1px;
    overflow: hidden;
    position: absolute;
    white-space: nowrap;
    width: 1px;
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

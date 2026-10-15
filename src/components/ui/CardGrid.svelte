<script lang="ts" generics="T">
  // A grid of cards the user can put in their own order (decisions 014, 026): drag a card by its
  // title bar, or press the arrow keys there. The cards are snippets; each gets the handlers for
  // its title bar (`Panel`'s `move`) and whether it is being moved. The parent saves the order.
  import { tick, type Snippet } from 'svelte'
  import type { HTMLAttributes } from 'svelte/elements'
  import { flip } from 'svelte/animate'
  import { cubicOut } from 'svelte/easing'
  import { applyOrder, cardAt, moveId, saveOrder, swapAt, type CardBox } from '../../lib/order'

  interface Props {
    items: readonly T[]
    /** Id of an item: what the saved order lists. */
    id: (item: T) => string
    /** Name of an item, for the announcement after a keyboard move. */
    label: (item: T) => string
    /** Saved order: item ids. Items it does not list come after, in their own order. */
    order?: readonly string[]
    onorder?: (order: string[]) => void
    card: Snippet<[T, HTMLAttributes<HTMLDivElement>, boolean]>
  }

  let { items, id, label, order = [], onorder = () => {}, card }: Props = $props()

  const sorted = $derived(applyOrder(items.map(id), order))
  // While a card is dragged: the order as it would drop now, the dragged card swapped with the
  // one it is over (only those two move). Saved on release.
  let preview = $state<string[] | null>(null)
  let moving = $state<string | null>(null)
  // A press on a title bar that has not moved far enough yet to lift it, so a click stays a click.
  let pressed: { id: string; x: number; y: number } | null = null
  // The dragged card follows the pointer: where on the card it was grabbed, and how far it is
  // from its slot in the grid. Its slot stays outlined.
  let grab = { x: 0, y: 0 }
  let lift = $state({ x: 0, y: 0 })
  // After release the card glides into its slot before it counts as put down.
  let settling = $state<string | null>(null)
  let announcement = $state('')
  let grid = $state<HTMLElement>()
  const shown = $derived(
    (preview ?? sorted).flatMap((key) => items.filter((item) => id(item) === key)),
  )

  // Pointer travel (px) that turns a press into a drag.
  const DRAG_START = 4
  // A swap needs the middle of the dragged card this far inside the other card (share of its
  // size per side), so a card resting on a border does not flick back and forth.
  const SWAP_INSET = 0.1
  const SETTLE_MS = 200

  function save(ids: string[]) {
    if (ids.join() !== sorted.join()) onorder(saveOrder(ids, order))
  }

  const slotOf = (key: string) =>
    [...(grid?.querySelectorAll<HTMLElement>('[data-card]') ?? [])].find(
      (slot) => slot.dataset.card === key,
    )

  /** Puts the lifted card under the pointer, measured from its slot. */
  function follow(key: string, x: number, y: number) {
    const slot = slotOf(key)?.getBoundingClientRect()
    if (slot) lift = { x: x - grab.x - slot.left, y: y - grab.y - slot.top }
  }

  function stopMoving() {
    pressed = null
    moving = null
    preview = null
    lift = { x: 0, y: 0 }
  }

  /** The card slots where they end up, in viewport pixels: offsets skip the slide transforms. */
  function slots(): CardBox[] {
    const cards = [...(grid?.querySelectorAll<HTMLElement>('[data-card]') ?? [])]
    const parent = cards[0]?.offsetParent
    if (!parent) return []
    const origin = parent.getBoundingClientRect()
    return cards.map((slot) => ({
      id: slot.dataset.card!,
      left: origin.left + parent.clientLeft + slot.offsetLeft,
      top: origin.top + parent.clientTop + slot.offsetTop,
      width: slot.offsetWidth,
      height: slot.offsetHeight,
    }))
  }

  function start(key: string, x: number, y: number) {
    const slot = slotOf(key)?.getBoundingClientRect()
    if (!slot) return
    grab = { x: x - slot.left, y: y - slot.top }
    moving = key
    preview = [...sorted]
    follow(key, x, y)
  }

  // The rest of a drag is followed on the window, where the pointer goes when it leaves the
  // title bar.
  async function drag(event: PointerEvent) {
    const { clientX: x, clientY: y } = event
    if (moving === null && pressed) {
      if (Math.hypot(x - pressed.x, y - pressed.y) < DRAG_START) return
      start(pressed.id, pressed.x, pressed.y)
      pressed = null
    }
    if (moving === null || !preview) return
    // Where the dragged card is, not just the pointer: it may hang far below where it was held.
    const boxes = slots()
    const own = boxes.find((box) => box.id === moving)
    const middle = own
      ? { x: x - grab.x + own.width / 2, y: y - grab.y + own.height / 2 }
      : { x, y }
    const target = cardAt(boxes, middle.x, middle.y, SWAP_INSET)
    if (target !== null && target !== moving) {
      preview = swapAt(sorted, moving, preview.indexOf(target))
      await tick()
    }
    if (moving !== null) follow(moving, x, y)
  }

  function drop() {
    pressed = null
    if (moving === null || !preview) return
    const key = moving
    save(preview)
    stopMoving()
    // Glide from where it was let go into its slot (a style transition, not game time).
    settling = key
    setTimeout(() => {
      if (settling === key) settling = null
    }, SETTLE_MS)
  }

  /** Slides cards to their new places; the lifted card follows the pointer instead. */
  function slide(node: HTMLElement, rects: { from: DOMRect; to: DOMRect }) {
    if (node.dataset.card === moving) return { duration: 0 }
    return flip(node, rects, { duration: 250, easing: cubicOut })
  }

  /**
   * Handlers for the title bar of one card, the only place to pick it up, so text and controls
   * on the card work as usual. `touch-action: none` there makes a touch drag instead of scroll.
   */
  function handle(key: string): HTMLAttributes<HTMLDivElement> {
    return {
      onpointerdown: (event) => {
        if (event.button !== 0 || moving !== null) return
        // No text selection or focus change while dragging.
        event.preventDefault()
        pressed = { id: key, x: event.clientX, y: event.clientY }
      },
      onkeydown: async (event) => {
        const from = sorted.indexOf(key)
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
        const next = moveId(sorted, key, to)
        save(next)
        const item = items.find((other) => id(other) === key)
        announcement = `${item ? label(item) : key} moved to place ${next.indexOf(key) + 1} of ${next.length}.`
        // Moving the card in the page can take the focus away from its handle.
        await tick()
        slotOf(key)?.querySelector<HTMLElement>('[data-move-handle]')?.focus()
      },
    }
  }
</script>

<svelte:window onpointermove={drag} onpointerup={drop} onpointercancel={stopMoving} />

<div class="grid" bind:this={grid}>
  {#each shown as item (id(item))}
    {@const key = id(item)}
    <div class="card" class:slot={moving === key} data-card={key} animate:slide>
      <div
        class="lift"
        class:lifted={moving === key}
        class:settling={settling === key}
        style:translate={moving === key ? `${lift.x}px ${lift.y}px` : undefined}
      >
        {@render card(item, handle(key), moving === key)}
      </div>
    </div>
  {/each}
</div>
<p class="announcement" aria-live="polite">{announcement}</p>

<style>
  .grid {
    display: grid;
    gap: var(--space-5);
    grid-template-columns: repeat(auto-fill, minmax(min(100%, var(--card-width)), 1fr));
  }

  /* Lets the card fill its grid cell. */
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
    cursor: grabbing;
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

  .announcement {
    clip-path: inset(50%);
    height: 1px;
    margin: 0;
    overflow: hidden;
    position: absolute;
    white-space: nowrap;
    width: 1px;
  }
</style>

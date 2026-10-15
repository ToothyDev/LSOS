<script lang="ts">
  import { dragValue, keyValue, meterFraction } from '../../lib/ui'

  interface Props {
    label: string
    value: number
    max: number
    /**
     * stock: green, supplies: blue, as on the in-game business screens; heat: amber, red when
     * full, like the in-game heat bar.
     */
    kind?: 'stock' | 'supplies' | 'heat'
    /** Text shown next to the label, e.g. "40 / 100" or "$120,000". Defaults to a percentage. */
    valueText?: string
    /** Only the bar, for when the label and value are shown next to it (e.g. by EditableValue). */
    bare?: boolean
    /** Equal segments the bar is split into, like the in-game business bars. */
    segments?: number
    /**
     * Makes the bar a slider: drag its handle or use the keys, and this gets the new value
     * (rounded to 1% of max, segment edges snap; decision 010). Called once per drag, on release.
     */
    onset?: (value: number) => void
    /** While dragging, the value under the pointer; null once the drag ends. */
    onpreview?: (value: number | null) => void
  }

  let {
    label,
    value,
    max,
    kind = 'stock',
    valueText,
    bare = false,
    segments,
    onset,
    onpreview,
  }: Props = $props()

  let track = $state<HTMLDivElement>()
  let dragging = $state<number | null>(null)

  const shown = $derived(dragging ?? value)
  const fraction = $derived(meterFraction(shown, max))
  // While dragging, the percentage under the pointer replaces any custom text.
  const text = $derived(
    dragging === null && valueText !== undefined ? valueText : `${Math.round(fraction * 100)}%`,
  )
  const scale = $derived({ max, segments })

  function at(event: PointerEvent): number {
    const rect = track!.getBoundingClientRect()
    return dragValue((event.clientX - rect.left) / rect.width, scale)
  }

  function preview(next: number | null) {
    dragging = next
    onpreview?.(next)
  }

  function start(event: PointerEvent) {
    if (!onset || event.button !== 0) return
    const slider = event.currentTarget as HTMLElement
    slider.setPointerCapture(event.pointerId)
    slider.focus()
    event.preventDefault()
    preview(at(event))
  }

  function move(event: PointerEvent) {
    if (dragging !== null) preview(at(event))
  }

  function end() {
    if (dragging === null) return
    const next = dragging
    preview(null)
    if (next !== value) onset?.(next)
  }

  function key(event: KeyboardEvent) {
    const next = keyValue(shown, event.key, scale)
    if (next === null) return
    event.preventDefault()
    if (next !== value) onset?.(next)
  }
</script>

<div class="meter {kind}" class:maxed={kind === 'heat' && shown >= max}>
  {#if !bare}
    <div class="labels">
      <span class="label">{label}</span>
      <span class="value">{text}</span>
    </div>
  {/if}
  {#if onset}
    <div
      class="slider"
      role="slider"
      tabindex="0"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={Math.round(shown)}
      aria-valuetext={text}
      onpointerdown={start}
      onpointermove={move}
      onpointerup={end}
      onpointercancel={() => preview(null)}
      onlostpointercapture={end}
      onkeydown={key}
    >
      {@render bar()}
      <div
        class="handle"
        style:left="calc(var(--reach) + (100% - 2 * var(--reach)) * {fraction})"
      ></div>
    </div>
  {:else}
    <div
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-valuetext={text}
    >
      {@render bar()}
    </div>
  {/if}
</div>

{#snippet bar()}
  {#if segments && segments > 1}
    <!-- Separate boxes like the in-game HUD, each filled by its share of the value. -->
    <div class="segments" bind:this={track}>
      {#each { length: segments }, i (i)}
        <div class="track segment">
          <div
            class="fill"
            class:dragging={dragging !== null}
            style:width="{meterFraction(fraction * segments - i, 1) * 100}%"
          ></div>
        </div>
      {/each}
    </div>
  {:else}
    <div class="track" bind:this={track}>
      <div class="fill" class:dragging={dragging !== null} style:width="{fraction * 100}%"></div>
    </div>
  {/if}
{/snippet}

<style>
  .meter {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .labels {
    display: flex;
    font-family: var(--font-display);
    font-size: var(--text-sm);
    gap: var(--space-2);
    justify-content: space-between;
    letter-spacing: var(--tracking);
    text-transform: uppercase;
  }

  .label {
    color: var(--muted);
  }

  .value {
    font-variant-numeric: tabular-nums;
  }

  .stock .value {
    color: var(--accent-text);
  }

  .supplies .value {
    color: var(--supplies-text);
  }

  .heat .value {
    color: var(--warn);
  }

  .track {
    background: var(--track);
    border-radius: var(--radius);
    height: var(--bar-height);
    overflow: hidden;
    position: relative;
  }

  .fill {
    height: 100%;
    transition: width 0.3s;
  }

  .fill.dragging {
    transition: none;
  }

  .stock .fill {
    background: var(--accent);
  }

  .supplies .fill {
    background: var(--supplies);
  }

  .heat .fill {
    background: var(--warn);
  }

  .heat.maxed .value {
    color: var(--danger);
  }

  .heat.maxed .fill {
    background: var(--danger);
  }

  .segments {
    display: flex;
    gap: 4px;
  }

  /* Taller than a plain bar, with an edge so empty segments stand out from the panel. */
  .segment {
    box-shadow: inset 0 0 0 1px var(--track-edge);
    flex: 1;
    height: calc(var(--bar-height) + 0.25rem);
  }

  /* Taller than the bar to give fingers and the pointer room; vertical scrolling still works. */
  /* Reaches half a handle past both ends of the bar, so a handle at 0% or 100% can be grabbed
     anywhere on it. The value is still measured on the bar. */
  .slider {
    --reach: 0.5rem;
    border-radius: var(--radius);
    cursor: ew-resize;
    margin-inline: calc(-1 * var(--reach));
    padding: var(--space-2) var(--reach);
    position: relative;
    touch-action: pan-y;
  }

  .handle {
    background: var(--fg);
    border: 1px solid var(--bg);
    border-radius: var(--radius);
    height: 1.25rem;
    pointer-events: none;
    position: absolute;
    top: 50%;
    transform: translate(-50%, -50%);
    width: 0.5rem;
  }

  /* Every card's bars can be dragged (issue #60): the handle shows only over the card, or while
     the bar has focus, so a tab of cards reads as plain bars. Touch screens always show it. */
  @media (hover: hover) {
    .handle {
      opacity: 0;
      transition: opacity 0.12s;
    }

    :global(.panel:hover) .handle,
    .slider:focus-visible .handle,
    .slider:active .handle {
      opacity: 1;
    }
  }
</style>

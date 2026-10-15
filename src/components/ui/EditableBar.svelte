<script lang="ts">
  // A percentage bar you can correct by typing, a preset or dragging the bar (decision 010).
  // While dragging, the value shown follows the pointer; the change is stored on release.
  import type { Snippet } from 'svelte'
  import EditableValue from './EditableValue.svelte'
  import Meter from './Meter.svelte'

  interface Props {
    label: string
    /** Percent, 0 to 100. */
    value: number
    kind?: 'stock' | 'supplies' | 'heat'
    segments?: number
    presets?: { label: string; value: number; title?: string }[]
    /** Muted text after the label, e.g. "40 / 100 units". */
    detail?: string
    undoable?: boolean
    /** Called with a typed value or a preset. */
    onresync: (value: number) => void
    /** Called once a drag or key nudge ends; defaults to `onresync`. */
    onset?: (value: number) => void
    /** Shown under the bar, e.g. a countdown. */
    children?: Snippet
  }

  let {
    label,
    value,
    kind,
    segments,
    presets,
    detail,
    undoable,
    onresync,
    onset = onresync,
    children,
  }: Props = $props()

  let dragging = $state<number | null>(null)
</script>

<EditableValue
  {label}
  value={dragging ?? value}
  unit="percent"
  min={0}
  max={100}
  {presets}
  {detail}
  {undoable}
  {onresync}
>
  <Meter
    {label}
    {value}
    max={100}
    {kind}
    {segments}
    bare
    onpreview={(next) => (dragging = next)}
    {onset}
  />
  {@render children?.()}
</EditableValue>

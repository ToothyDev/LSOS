<script lang="ts">
  import { tick, type Snippet } from 'svelte'
  import {
    clampValue,
    formatValue,
    parseValue,
    undoValue,
    type Resync,
    type ValueUnit,
  } from '../../lib/resync'
  import Button from './Button.svelte'
  import Digits from './Digits.svelte'

  interface Preset {
    label: string
    value: number
    /** What the preset stands for in game, shown on hover. */
    title?: string
  }

  interface Props {
    label: string
    /** The tracker's current estimate, in the unit's base: percent, dollars or milliseconds. */
    value: number
    unit: ValueUnit
    min?: number
    max?: number
    /** One-click values, e.g. "Sold" setting stock to 0. The tracker decides what each one means. */
    presets?: Preset[]
    /** Show an Undo button for the last edit. Off when the parent keeps one undo for several values. */
    undoable?: boolean
    /** Shown under the value, e.g. a bare Meter. */
    children?: Snippet
    /** Called with the corrected value; the tracker stores it as of now (decision 003). */
    onresync: (value: number) => void
  }

  let {
    label,
    value,
    unit,
    min,
    max,
    presets = [],
    undoable = true,
    children,
    onresync,
  }: Props = $props()

  const HINTS: Record<ValueUnit, string> = {
    percent: 'A percentage, e.g. 40',
    money: 'An amount, e.g. 120,000 or 120k',
    duration: 'Time left, e.g. 21:30 (hours:minutes) or 5h 30m',
    crates: 'Whole crates, e.g. 12',
  }

  const id = $props.id()
  const bounds = $derived({ min, max })
  const text = $derived(formatValue(value, unit))

  let editing = $state(false)
  let draft = $state('')
  let invalid = $state(false)
  let last = $state<Resync | null>(null)
  let valueButton = $state<HTMLButtonElement>()
  let input = $state<HTMLInputElement>()

  async function startEditing() {
    draft = text
    invalid = false
    editing = true
    await tick()
    input?.select()
  }

  async function stopEditing() {
    editing = false
    await tick()
    valueButton?.focus()
  }

  function apply(next: number) {
    const after = clampValue(next, bounds)
    if (after === value) return
    if (undoable) last = { before: value, after }
    onresync(after)
  }

  function confirm(event: SubmitEvent) {
    event.preventDefault()
    const parsed = parseValue(draft, unit)
    if (parsed === null) {
      invalid = true
      return
    }
    apply(parsed)
    stopEditing()
  }

  function undo() {
    if (!last) return
    onresync(undoValue(last, value, bounds))
    last = null
  }
</script>

<div class="editable">
  <div class="row">
    <span class="label" id="{id}-label">{label}</span>
    {#if editing}
      <form class="edit" onsubmit={confirm}>
        <input
          bind:this={input}
          bind:value={draft}
          aria-labelledby="{id}-label"
          aria-invalid={invalid}
          aria-describedby="{id}-hint"
          autocomplete="off"
          inputmode={unit === 'duration' ? 'text' : unit === 'crates' ? 'numeric' : 'decimal'}
          oninput={() => (invalid = false)}
          onkeydown={(event) => {
            if (event.key === 'Escape') stopEditing()
          }}
        />
        <Button variant="primary" type="submit">Set</Button>
        <Button onclick={stopEditing}>Cancel</Button>
      </form>
    {:else}
      <button
        bind:this={valueButton}
        type="button"
        class="value"
        aria-label="Resync {label}, now {text}"
        title="Click to type the value from the game"
        onclick={startEditing}><Digits {text} /></button
      >
    {/if}
  </div>

  {@render children?.()}

  {#if editing}
    <p class="hint" class:invalid id="{id}-hint" aria-live="polite">
      {invalid ? `Not understood. ${HINTS[unit]}.` : HINTS[unit]}
    </p>
  {/if}

  {#if presets.length > 0 || last}
    <div class="actions">
      {#each presets as preset (preset.label)}
        <Button title={preset.title} onclick={() => apply(preset.value)}>{preset.label}</Button>
      {/each}
      {#if last}
        <Button
          onclick={undo}
          title="Take back the last edit (was {formatValue(last.before, unit)})">Undo</Button
        >
      {/if}
    </div>
  {/if}
</div>

<style>
  .editable {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .row {
    align-items: center;
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
    justify-content: space-between;
  }

  .label {
    color: var(--muted);
    font-family: var(--font-display);
    font-size: var(--text-sm);
    letter-spacing: var(--tracking);
    text-transform: uppercase;
  }

  .value {
    background: none;
    border: 1px dashed var(--line);
    border-radius: var(--radius);
    color: var(--fg);
    cursor: text;
    font-family: var(--font-display);
    font-size: var(--text-lg);
    letter-spacing: var(--tracking);
    padding: 0 var(--space-2);
  }

  .value:hover {
    border-color: var(--accent);
  }

  .edit {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
  }

  input {
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: var(--radius);
    color: var(--fg);
    font-family: var(--font-display);
    font-size: var(--text-md);
    letter-spacing: var(--tracking);
    min-height: 2.25rem;
    min-width: 0;
    padding: 0 var(--space-2);
    width: 8rem;
  }

  input[aria-invalid='true'] {
    border-color: var(--danger);
  }

  .hint {
    color: var(--muted);
    font-size: var(--text-xs);
    margin: 0;
  }

  .hint.invalid {
    color: var(--danger);
  }

  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
  }
</style>

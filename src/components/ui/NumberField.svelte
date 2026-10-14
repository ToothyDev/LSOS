<script lang="ts">
  import { parseNumberField } from '../../lib/ui'

  interface Props {
    label: string
    value: number
    min?: number
    max?: number
    step?: number
    /** Called with the new, clamped value. Invalid input reverts to the current value. */
    onchange: (value: number) => void
  }

  let { label, value, min, max, step = 1, onchange }: Props = $props()

  const id = $props.id()
  const bounds = $derived({ min, max, integer: Number.isInteger(step) })

  function commit(input: HTMLInputElement) {
    const parsed = parseNumberField(input.value, bounds)
    input.value = String(parsed ?? value)
    if (parsed !== null && parsed !== value) onchange(parsed)
  }

  function nudge(by: number) {
    const next = parseNumberField(String(value + by), bounds)
    if (next !== null && next !== value) onchange(next)
  }
</script>

<div class="field">
  <label for={id}>{label}</label>
  <div class="control">
    <button
      type="button"
      aria-label="Decrease {label}"
      disabled={min !== undefined && value <= min}
      onclick={() => nudge(-step)}>−</button
    >
    <input
      {id}
      type="number"
      inputmode={Number.isInteger(step) ? 'numeric' : 'decimal'}
      {value}
      {min}
      {max}
      {step}
      onchange={(event) => commit(event.currentTarget)}
    />
    <button
      type="button"
      aria-label="Increase {label}"
      disabled={max !== undefined && value >= max}
      onclick={() => nudge(step)}>+</button
    >
  </div>
</div>

<style>
  .field {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  label {
    color: var(--muted);
    font-family: var(--font-display);
    font-size: var(--text-sm);
    letter-spacing: var(--tracking);
    text-transform: uppercase;
  }

  .control {
    display: flex;
  }

  input,
  button {
    background: var(--surface);
    border: 1px solid var(--line);
    color: var(--fg);
    font-size: var(--text-md);
    min-height: 2.25rem;
  }

  input {
    border-inline: none;
    font-family: var(--font-display);
    font-variant-numeric: tabular-nums;
    letter-spacing: var(--tracking);
    min-width: 0;
    text-align: center;
    width: 6rem;
    -moz-appearance: textfield;
    appearance: textfield;
  }

  input::-webkit-inner-spin-button,
  input::-webkit-outer-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }

  button {
    cursor: pointer;
    width: 2.25rem;
  }

  button:first-child {
    border-radius: var(--radius) 0 0 var(--radius);
  }

  button:last-child {
    border-radius: 0 var(--radius) var(--radius) 0;
  }

  button:hover:not(:disabled) {
    border-color: var(--accent);
    color: var(--accent-text);
  }

  button:disabled {
    color: var(--muted);
    cursor: not-allowed;
    opacity: 0.5;
  }

  input:focus-visible,
  button:focus-visible {
    outline-offset: -2px;
    position: relative;
  }
</style>

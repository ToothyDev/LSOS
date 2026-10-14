<script lang="ts">
  import { meterFraction } from '../../lib/ui'

  interface Props {
    label: string
    value: number
    max: number
    /** stock: green, supplies: blue, as on the in-game business screens. */
    kind?: 'stock' | 'supplies'
    /** Text shown next to the label, e.g. "40 / 100" or "$120,000". Defaults to a percentage. */
    valueText?: string
    /** Only the bar, for when the label and value are shown next to it (e.g. by EditableValue). */
    bare?: boolean
  }

  let { label, value, max, kind = 'stock', valueText, bare = false }: Props = $props()

  const fraction = $derived(meterFraction(value, max))
  const text = $derived(valueText ?? `${Math.round(fraction * 100)}%`)
</script>

<div class="meter {kind}">
  {#if !bare}
    <div class="labels">
      <span class="label">{label}</span>
      <span class="value">{text}</span>
    </div>
  {/if}
  <div
    class="track"
    role="meter"
    aria-label={label}
    aria-valuemin={0}
    aria-valuemax={max}
    aria-valuenow={value}
    aria-valuetext={text}
  >
    <div class="fill" style:width="{fraction * 100}%"></div>
  </div>
</div>

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

  .track {
    background: var(--track);
    border-radius: var(--radius);
    height: var(--bar-height);
    overflow: hidden;
  }

  .fill {
    height: 100%;
    transition: width 0.3s;
  }

  .stock .fill {
    background: var(--accent);
  }

  .supplies .fill {
    background: var(--supplies);
  }
</style>

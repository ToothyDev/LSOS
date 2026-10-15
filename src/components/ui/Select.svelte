<script lang="ts">
  // A dropdown of options by id; the caller keeps the chosen one.
  interface Option {
    id: string
    label: string
  }

  interface Props {
    id: string
    value: string | undefined
    options: readonly Option[]
    onchange: (id: string) => void
  }

  let { id, value, options, onchange }: Props = $props()
</script>

<select {id} {value} onchange={(event) => onchange(event.currentTarget.value)}>
  {#each options as option (option.id)}
    <option value={option.id}>{option.label}</option>
  {/each}
</select>

<style>
  select {
    background: var(--panel-raised);
    border: 1px solid var(--line);
    border-radius: var(--radius);
    color: var(--fg);
    font: inherit;
    min-height: 2.25rem;
    min-width: 0;
    padding: var(--space-1) var(--space-2);
    width: 100%;
  }

  select:hover {
    border-color: var(--accent);
  }
</style>

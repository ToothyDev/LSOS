<script lang="ts">
  // Dev-only preview of the base components (open #/kit with `npm run dev`).
  // Sample numbers only: no game values here (decision 004).
  import Button from './Button.svelte'
  import Countdown from './Countdown.svelte'
  import Meter from './Meter.svelte'
  import NumberField from './NumberField.svelte'
  import Panel from './Panel.svelte'

  let amount = $state(40)
</script>

<div class="grid">
  <Panel title="Meters">
    <Meter label="Stock" value={amount} max={100} />
    <Meter label="Supplies" value={15} max={100} kind="supplies" valueText="15 / 100" />
    <Meter label="Empty" value={0} max={100} kind="supplies" />
    {#snippet footer()}
      <Button variant="primary">Primary</Button>
      <Button>Ghost</Button>
      <Button disabled>Disabled</Button>
    {/snippet}
  </Panel>

  <Panel title="Countdowns">
    <Countdown label="Running" remainingMs={3_723_000} />
    <Countdown label="Done" remainingMs={0} />
  </Panel>

  <Panel title="Number field">
    <NumberField
      label="Stock (drives the meter)"
      value={amount}
      min={0}
      max={100}
      onchange={(value) => (amount = value)}
    />
  </Panel>
</div>

<style>
  .grid {
    display: grid;
    gap: var(--space-5);
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 20rem), 1fr));
  }
</style>

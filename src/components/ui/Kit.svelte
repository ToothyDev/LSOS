<script lang="ts">
  // Dev-only preview of the base components (open #/kit with `npm run dev`).
  // Sample numbers only: no game values here (decision 004).
  import Button from './Button.svelte'
  import Countdown from './Countdown.svelte'
  import EditableValue from './EditableValue.svelte'
  import Meter from './Meter.svelte'
  import NumberField from './NumberField.svelte'
  import Panel from './Panel.svelte'

  let amount = $state(40)
  let safe = $state(70_000)

  // A real-time cooldown, as a tracker would keep it: the moment it is ready.
  let now = $state(Date.now())
  let readyAt = $state(Date.now() + 90 * 60_000)
  $effect(() => {
    const timer = setInterval(() => (now = Date.now()), 1000)
    return () => clearInterval(timer)
  })
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

  <Panel title="Resync">
    <Meter label="Stock" value={amount} max={100} />
    <EditableValue
      label="Stock"
      value={amount}
      unit="percent"
      min={0}
      max={100}
      presets={[
        { label: 'Sold', value: 0 },
        { label: 'Full', value: 100 },
      ]}
      onresync={(value) => (amount = value)}
    />
    <EditableValue
      label="Safe"
      value={safe}
      unit="money"
      min={0}
      presets={[{ label: 'Collected', value: 0 }]}
      onresync={(value) => (safe = value)}
    />
    <EditableValue
      label="Cooldown"
      value={Math.max(0, readyAt - now)}
      unit="duration"
      min={0}
      presets={[{ label: 'Ready', value: 0 }]}
      onresync={(value) => {
        now = Date.now()
        readyAt = now + value
      }}
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

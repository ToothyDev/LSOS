<script lang="ts">
  // Dev-only preview of the base components (open #/kit with `npm run dev`).
  // Sample numbers only: no game values here (decision 004).
  import type { Production } from '../../data/production'
  import type { Property } from '../../data/properties'
  import type { BusinessBarsById } from '../../lib/production'
  import type { OwnedProperties } from '../../lib/properties'
  import type { Bars } from '../../lib/resync'
  import Businesses from '../Businesses.svelte'
  import PropertyList from '../PropertyList.svelte'
  import BusinessBars from './BusinessBars.svelte'
  import Button from './Button.svelte'
  import Countdown from './Countdown.svelte'
  import EditableValue from './EditableValue.svelte'
  import Fact from './Fact.svelte'
  import Hint from './Hint.svelte'
  import Meter from './Meter.svelte'
  import Note from './Note.svelte'
  import NumberField from './NumberField.svelte'
  import Panel from './Panel.svelte'
  import Select from './Select.svelte'

  let amount = $state(40)
  let picked = $state('a')
  let safe = $state(70_000)
  let bars = $state<Bars>({ stock: 60, supplies: 35 })
  let stockOnly = $state<Bars>({ stock: 45 })

  // Sample properties for the Settings list and the Businesses tab; made up, not game data.
  const sampleCatalog: Property[] = [
    {
      id: 'sample-a',
      label: 'Sample business',
      upgrades: [
        { kind: 'toggle', id: 'equipment', label: 'Equipment upgrade' },
        {
          kind: 'choice',
          id: 'worker',
          label: 'Worker',
          options: [
            { id: 'none', label: 'Not hired' },
            { id: 'a', label: 'Option A' },
            { id: 'b', label: 'Option B' },
          ],
        },
      ],
      source: 'sample',
      checked: '2026-10-14',
    },
    { id: 'sample-b', label: 'No upgrades', upgrades: [], source: 'sample', checked: '2026-10-14' },
  ]
  let owned = $state<OwnedProperties>({ 'sample-a': { owned: true, upgrades: {} } })
  // Made-up production for the sample business: runs without upgrades, value only with equipment.
  const sampleProductions: Production[] = [
    {
      propertyId: 'sample-a',
      unitName: 'crates',
      maxUnits: 10,
      farSale: { bonus: 0.5, label: 'far away' },
      rates: [
        { upgrades: [], minutesPerUnit: 30, unitValue: 10_000, unitsPerFullSupplies: 4 },
        { upgrades: ['equipment'], minutesPerUnit: 20, unitValue: 12_000 },
      ],
      source: 'sample',
      checked: '2026-10-14',
    },
  ]
  let businessOrder = $state<string[]>([])
  let businesses = $state<BusinessBarsById>({ 'sample-a': { stock: 20, supplies: 60 } })

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
    <Meter label="Heat" value={30} max={100} kind="heat" segments={10} />
    <Meter label="Five segments" value={amount} max={100} segments={5} />
    {#snippet footer()}
      <Button variant="primary">Primary</Button>
      <Button>Ghost</Button>
      <Button disabled>Disabled</Button>
      <Button variant="primary" aria-pressed="true">Owned</Button>
      <Button aria-pressed="false">Not owned</Button>
    {/snippet}
  </Panel>

  <Panel title="Countdowns">
    <Countdown label="Running" remainingMs={3_723_000} />
    <Countdown label="Done" remainingMs={0} />
  </Panel>

  <Panel title="Facts">
    <Fact label="Value">$120,000</Fact>
    <Fact label="Boost ready"><Button>Activated</Button></Fact>
    <Fact label="Pick one" labelFor="kit-select" wide>
      <Select
        id="kit-select"
        value={picked}
        options={[
          { id: 'a', label: 'Option A' },
          { id: 'b', label: 'Option B' },
        ]}
        onchange={(id) => (picked = id)}
      />
    </Fact>
  </Panel>

  <Panel title="Hints and notes">
    <Hint>A hint: muted help text.</Hint>
    <Hint fine>A fine hint, for footnotes like how an estimate is made.</Hint>
    <Note title="Estimate.">Warn: something to look at.</Note>
    <Note tone="quiet" title="Shut down.">Quiet: a plain state.</Note>
    <Note tone="good" title="Tip:">Good: a suggestion.</Note>
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

  <Panel title="Business bars">
    <BusinessBars {bars} {now} onresync={(value) => (bars = value)} />
  </Panel>

  <Panel title="Stock only">
    <BusinessBars bars={stockOnly} {now} onresync={(value) => (stockOnly = value)} />
  </Panel>

  <Panel title="Resync">
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

  <PropertyList catalog={sampleCatalog} {owned} onchange={(value) => (owned = value)} />
</div>

<h2>Businesses tab</h2>
<Businesses
  catalog={sampleCatalog}
  {owned}
  onchange={(value) => (owned = value)}
  productions={sampleProductions}
  {businesses}
  {now}
  onresync={(id, value) => (businesses = { ...businesses, [id]: value })}
  order={businessOrder}
  onorder={(value) => (businessOrder = value)}
/>

<style>
  .grid {
    display: grid;
    gap: var(--space-5);
    grid-template-columns: repeat(auto-fill, minmax(min(100%, var(--card-width)), 1fr));
  }

  h2 {
    font-size: var(--text-lg);
    margin: var(--space-6) 0 var(--space-4);
  }
</style>

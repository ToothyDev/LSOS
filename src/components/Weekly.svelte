<script lang="ts">
  // The Weekly tab (issue #16, decision 027): this week's bonuses, challenge, gifts, rotations and
  // discounts from `src/data/weekly.ts`, then the seasonal activities still running, kept quieter.
  // Logic: lib/weekly.ts.
  import { isOwned, type OwnedProperties } from '../lib/properties'
  import {
    discountText,
    multiplierText,
    weekStatus,
    type Discount,
    type Multiplier,
    type Week,
  } from '../lib/weekly'
  import Fact from './ui/Fact.svelte'
  import Panel from './ui/Panel.svelte'

  interface Props {
    week: Week
    owned: OwnedProperties
    /** Wall-clock time. */
    now: number
  }

  let { week, owned, now }: Props = $props()

  const status = $derived(weekStatus(week, now))
  const multipliers = $derived(
    [...week.multipliers].sort((a, b) => Number(ownsIt(b)) - Number(ownsIt(a))),
  )
  const DISCOUNT_GROUPS: { kind: Discount['kind']; label: string }[] = [
    { kind: 'vehicle', label: 'Vehicles' },
    { kind: 'property', label: 'Properties' },
    { kind: 'weapon', label: 'Gun Van' },
  ]
  const DATE = new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  function ownsIt(multiplier: Multiplier): boolean {
    return multiplier.property !== undefined && isOwned(owned, multiplier.property)
  }
</script>

<div class="weekly">
  <header>
    <h2>{week.title}</h2>
    <p class="dates">
      {DATE.format(Date.parse(week.start))} to {DATE.format(Date.parse(week.end))}
      <span class="links">
        <a href={week.source} target="_blank" rel="noopener">gta.wiki</a>
        {#if week.newswire}
          <a href={week.newswire} target="_blank" rel="noopener">Newswire</a>
        {/if}
      </span>
    </p>
    {#if status === 'ended'}
      <p class="stale" role="status">
        Out of date: this week has ended and the new one is not in yet. These bonuses may no longer
        apply.
      </p>
    {:else if status === 'upcoming'}
      <p class="stale" role="status">This week has not started yet.</p>
    {/if}
  </header>

  <div class="grid" class:ended={status === 'ended'}>
    <Panel title="Bonus payouts">
      <ul>
        {#each multipliers as multiplier (multiplier.activity)}
          <li class:owned={ownsIt(multiplier)}>
            {multiplierText(multiplier)}
            {#if ownsIt(multiplier)}<span class="tag">Owned</span>{/if}
          </li>
        {:else}
          <li class="quiet">None this week.</li>
        {/each}
      </ul>
    </Panel>

    <Panel title="Challenge and gifts">
      {#if week.challenge}
        <Fact label="Weekly Challenge">{week.challenge.task}</Fact>
        <Fact label="Reward">{week.challenge.reward}</Fact>
      {/if}
      <ul class="gifts">
        {#each week.gifts as gift (gift)}
          <li>{gift}</li>
        {/each}
      </ul>
    </Panel>

    <Panel title="This week's rotation">
      {#each week.rotations as rotation (rotation.label)}
        <Fact label={rotation.label} title={rotation.note}>
          {rotation.items.join(', ')}
          {#if rotation.note}<span class="note">{rotation.note}</span>{/if}
        </Fact>
      {/each}
    </Panel>

    <Panel title="Discounts">
      {#each DISCOUNT_GROUPS as group (group.kind)}
        {@const items = week.discounts.filter((discount) => discount.kind === group.kind)}
        {#if items.length > 0}
          <h3>{group.label}</h3>
          {#each items as discount (discount.item)}
            <Fact label={discount.item}>{discountText(discount)}</Fact>
          {/each}
        {/if}
      {/each}
    </Panel>
  </div>

  {#if week.alsoRunning.length > 0}
    <details class="also">
      <summary>Also running, no bonus this week ({week.alsoRunning.length})</summary>
      <p>{week.alsoRunning.join(', ')}</p>
    </details>
  {/if}
</div>

<style>
  .weekly {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  header h2 {
    font-size: var(--text-lg);
    letter-spacing: var(--tracking-wide);
    margin: 0;
  }

  .dates {
    color: var(--muted);
    display: flex;
    flex-wrap: wrap;
    font-size: var(--text-sm);
    gap: var(--space-3);
    margin: var(--space-1) 0 0;
  }

  .links {
    display: inline-flex;
    gap: var(--space-3);
  }

  a {
    color: var(--accent-text);
  }

  .stale {
    border: 1px solid var(--warn);
    border-radius: var(--radius);
    color: var(--warn);
    margin: var(--space-3) 0 0;
    padding: var(--space-2) var(--space-3);
  }

  .grid {
    display: grid;
    gap: var(--space-4);
    align-items: start;
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 22rem), 1fr));
  }

  .grid.ended {
    opacity: 0.6;
  }

  ul {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .gifts {
    margin-top: var(--space-3);
  }

  .gifts li::before {
    color: var(--accent-text);
    content: '+ ';
  }

  .owned {
    color: var(--accent-text);
  }

  .tag {
    border: 1px solid var(--accent);
    border-radius: var(--radius);
    font-family: var(--font-display);
    font-size: var(--text-xs);
    letter-spacing: var(--tracking);
    margin-left: var(--space-2);
    padding: 0 var(--space-1);
    text-transform: uppercase;
  }

  .quiet,
  .note {
    color: var(--muted);
  }

  .note {
    display: block;
    font-size: var(--text-xs);
  }

  h3 {
    color: var(--muted);
    font-family: var(--font-display);
    font-size: var(--text-xs);
    letter-spacing: var(--tracking-wide);
    margin: var(--space-3) 0 var(--space-1);
    text-transform: uppercase;
  }

  h3:first-child {
    margin-top: 0;
  }

  .also {
    color: var(--muted);
    font-size: var(--text-sm);
  }

  .also summary {
    cursor: pointer;
    font-family: var(--font-display);
    letter-spacing: var(--tracking);
    text-transform: uppercase;
  }

  .also p {
    margin: var(--space-2) 0 0;
  }
</style>

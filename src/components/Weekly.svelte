<script lang="ts">
  // The Weekly tab (issue #16, decision 027): this week's bonuses, challenge, gifts, rotation and
  // discounts from `src/data/weekly.ts`, then the seasonal activities still running, kept quieter.
  // Logic: lib/weekly.ts.
  import { isOwned, type OwnedProperties } from '../lib/properties'
  import {
    discountText,
    discountTiers,
    sortMultipliers,
    timeLeftText,
    weekStatus,
    type Discount,
    type Week,
  } from '../lib/weekly'
  import Panel from './ui/Panel.svelte'

  interface Props {
    week: Week
    owned: OwnedProperties
    /** Wall-clock time. */
    now: number
  }

  let { week, owned, now }: Props = $props()

  const status = $derived(weekStatus(week, now))
  const multipliers = $derived(sortMultipliers(week.multipliers, owned))
  const KINDS: { kind: Discount['kind']; label: string }[] = [
    { kind: 'vehicle', label: 'Vehicles' },
    { kind: 'property', label: 'Properties' },
    { kind: 'weapon', label: 'Gun Van' },
  ]
  const DATE = new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
</script>

<div class="weekly">
  <header class="head">
    <div>
      <h2>{week.title}</h2>
      <p class="dates">
        {DATE.format(Date.parse(week.start))} – {DATE.format(Date.parse(week.end))}
      </p>
    </div>
    <div class="meta">
      {#if status === 'current'}
        <span class="pill live">Live · {timeLeftText(Date.parse(week.end) - now)}</span>
      {:else if status === 'ended'}
        <span class="pill stale">Out of date</span>
      {:else}
        <span class="pill">Starts soon</span>
      {/if}
      <a href={week.source} target="_blank" rel="noopener">gta.wiki</a>
      {#if week.newswire}
        <a href={week.newswire} target="_blank" rel="noopener">Newswire</a>
      {/if}
    </div>
  </header>

  {#if status === 'ended'}
    <p class="warning" role="status">
      This week has ended and the new one is not in yet. The events below are last week's and may no
      longer apply.
    </p>
  {/if}

  <div class="layout" class:ended={status === 'ended'}>
    <div class="top">
      <Panel title="Bonus payouts">
        <ul class="bonuses">
          {#each multipliers as multiplier (multiplier.activity)}
            {@const mine = multiplier.property !== undefined && isOwned(owned, multiplier.property)}
            <li class:mine>
              <span class="factor" class:high={multiplier.factor >= 3}>{multiplier.factor}x</span>
              <span class="activity">
                {multiplier.activity}
                {#if mine}<span class="owned-tag">Owned</span>{/if}
              </span>
              <span class="pays">{multiplier.pays}</span>
            </li>
          {:else}
            <li class="quiet">No bonus payouts this week.</li>
          {/each}
        </ul>
      </Panel>

      <Panel title="Challenge and gifts">
        {#if week.challenge}
          <div class="challenge">
            <span class="kicker">Weekly Challenge</span>
            <strong>{week.challenge.task}</strong>
            <span class="reward">{week.challenge.reward}</span>
          </div>
        {/if}
        {#if week.gifts.length > 0}
          <ul class="gifts">
            {#each week.gifts as gift (gift)}
              <li>{gift}</li>
            {/each}
          </ul>
        {/if}
      </Panel>
    </div>

    <Panel title="This week's rotation">
      <div class="blocks">
        {#each week.rotations as rotation (rotation.label)}
          <section class="block">
            <h3>{rotation.label}</h3>
            <ul class="chips">
              {#each rotation.items as item (item)}
                <li>{item}</li>
              {/each}
            </ul>
            {#if rotation.note}<p class="note">{rotation.note}</p>{/if}
          </section>
        {/each}
      </div>
    </Panel>

    <Panel title="Discounts">
      <div class="blocks discounts">
        {#each KINDS as { kind, label } (kind)}
          {@const tiers = discountTiers(week.discounts, kind)}
          {#if tiers.length > 0}
            <section class="block">
              <h3>{label}</h3>
              {#each tiers as tier (tier.percent)}
                <div class="tier">
                  <span class="off" class:free={tier.percent >= 100}>
                    {discountText({ kind, item: '', percent: tier.percent })}
                  </span>
                  <ul class="chips">
                    {#each tier.items as item (item)}
                      <li>{item}</li>
                    {/each}
                  </ul>
                </div>
              {/each}
            </section>
          {/if}
        {/each}
      </div>
    </Panel>
  </div>

  {#if week.alsoRunning.length > 0}
    <details class="also">
      <summary>Also running, no bonus this week ({week.alsoRunning.length})</summary>
      <ul class="chips">
        {#each week.alsoRunning as item (item)}
          <li>{item}</li>
        {/each}
      </ul>
    </details>
  {/if}
</div>

<style>
  .weekly,
  .layout {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  ul {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  /* Header: title and dates on the left, status and sources on the right. */
  .head {
    align-items: flex-end;
    border-bottom: 1px solid var(--line);
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-3);
    justify-content: space-between;
    padding-bottom: var(--space-3);
  }

  h2 {
    font-size: var(--text-lg);
    letter-spacing: var(--tracking-wide);
    margin: 0;
  }

  .dates {
    color: var(--muted);
    font-size: var(--text-sm);
    margin: var(--space-1) 0 0;
  }

  .meta {
    align-items: center;
    display: flex;
    flex-wrap: wrap;
    font-size: var(--text-sm);
    gap: var(--space-3);
  }

  .meta a {
    color: var(--accent-text);
  }

  .pill {
    border: 1px solid var(--line);
    border-radius: 999px;
    color: var(--muted);
    font-family: var(--font-display);
    font-size: var(--text-xs);
    letter-spacing: var(--tracking);
    padding: 0.1rem var(--space-3);
    text-transform: uppercase;
  }

  .pill.live {
    border-color: var(--accent);
    color: var(--accent-text);
  }

  .pill.stale {
    border-color: var(--warn);
    color: var(--warn);
  }

  .warning {
    background: color-mix(in srgb, var(--warn) 10%, transparent);
    border: 1px solid var(--warn);
    border-radius: var(--radius);
    color: var(--warn);
    margin: 0;
    padding: var(--space-2) var(--space-3);
  }

  .layout.ended {
    filter: grayscale(0.6);
    opacity: 0.6;
  }

  /* Bonus payouts (wide) next to challenge and gifts. */
  .top {
    align-items: start;
    display: grid;
    gap: var(--space-4);
    grid-template-columns: minmax(0, 3fr) minmax(0, 2fr);
  }

  .bonuses li {
    align-items: center;
    border-bottom: 1px solid var(--line);
    display: grid;
    gap: var(--space-3);
    grid-template-columns: 2.75rem 1fr auto;
    padding: var(--space-2) 0;
  }

  .bonuses li:last-child {
    border-bottom: none;
  }

  .factor {
    border: 1px solid var(--accent);
    border-radius: var(--radius);
    color: var(--accent-text);
    font-family: var(--font-display);
    font-weight: 600;
    text-align: center;
  }

  .factor.high {
    background: var(--accent-deep);
  }

  .pays {
    color: var(--muted);
    font-size: var(--text-xs);
    white-space: nowrap;
  }

  .mine .activity {
    color: var(--accent-text);
  }

  .owned-tag {
    border: 1px solid var(--accent);
    border-radius: var(--radius);
    font-family: var(--font-display);
    font-size: var(--text-xs);
    letter-spacing: var(--tracking);
    margin-left: var(--space-2);
    padding: 0 var(--space-1);
    text-transform: uppercase;
  }

  .challenge {
    background: var(--panel-raised);
    border-left: 3px solid var(--accent);
    border-radius: var(--radius);
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    padding: var(--space-3);
  }

  .kicker,
  h3 {
    color: var(--muted);
    font-family: var(--font-display);
    font-size: var(--text-xs);
    font-weight: normal;
    letter-spacing: var(--tracking-wide);
    margin: 0;
    text-transform: uppercase;
  }

  .challenge strong {
    font-size: var(--text-md);
  }

  .reward {
    color: var(--accent-text);
    font-size: var(--text-sm);
  }

  .gifts {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    margin-top: var(--space-3);
  }

  .gifts li {
    font-size: var(--text-sm);
    padding-left: var(--space-4);
    position: relative;
  }

  .gifts li::before {
    color: var(--accent-text);
    content: '+';
    left: 0;
    position: absolute;
  }

  /* Rotation and discounts: labelled blocks of chips in an even grid. */
  .blocks {
    display: grid;
    gap: var(--space-4) var(--space-5);
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 16rem), 1fr));
  }

  .discounts {
    grid-template-columns: minmax(0, 2fr) minmax(0, 1fr) minmax(0, 1fr);
  }

  .block {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    min-width: 0;
  }

  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-1);
  }

  .chips li {
    background: var(--panel-raised);
    border: 1px solid var(--line);
    border-radius: var(--radius);
    font-size: var(--text-sm);
    padding: 0.1rem var(--space-2);
  }

  .note {
    color: var(--muted);
    font-size: var(--text-xs);
    margin: 0;
  }

  .tier {
    align-items: baseline;
    display: grid;
    gap: var(--space-2);
    grid-template-columns: 4.5rem 1fr;
  }

  .off {
    color: var(--accent-text);
    font-family: var(--font-display);
    font-size: var(--text-sm);
    letter-spacing: var(--tracking);
    text-transform: uppercase;
  }

  .off.free {
    color: var(--warn);
  }

  .quiet {
    color: var(--muted);
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

  .also .chips {
    margin-top: var(--space-2);
  }

  .also .chips li {
    background: none;
  }

  @media (max-width: 52rem) {
    .top,
    .discounts {
      grid-template-columns: minmax(0, 1fr);
    }
  }
</style>

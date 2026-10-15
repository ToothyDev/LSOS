<script lang="ts">
  // The action strip of a card (issue #60): an Undo right after a press on the left, Edit and the
  // settings gear on the right. Edit and settings close each other (`CardModes`).
  import type { Snippet } from 'svelte'
  import { editTrial, type CardModes } from '../../lib/cards.svelte'
  import Button from './Button.svelte'
  import SettingsButton from './SettingsButton.svelte'

  interface Props {
    id: string
    /** Card name, for the gear's accessible label. */
    label: string
    modes: CardModes
    /** The card has edit controls. */
    editable?: boolean
    /** The card has settings. */
    settings?: boolean
    /** An Undo for the last press on the card, shown first. */
    undo?: Snippet
  }

  let { id, label, modes, editable = false, settings = true, undo }: Props = $props()
</script>

{#if undo}{@render undo()}{/if}
<span class="end">
  {#if editable && editTrial.style === 'exclusive'}
    <Button aria-expanded={modes.is(id, 'edit')} onclick={() => modes.toggle(id, 'edit')}
      >{modes.is(id, 'edit') ? 'Done' : 'Edit'}</Button
    >
  {/if}
  {#if settings}
    <SettingsButton
      {label}
      open={modes.is(id, 'settings')}
      onclick={() => modes.toggle(id, 'settings')}
    />
  {/if}
</span>

<style>
  .end {
    display: flex;
    gap: var(--space-2);
    margin-left: auto;
  }
</style>

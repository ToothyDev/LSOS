<script lang="ts">
  // The small gear in a card's title bar that opens the property's settings (decision 011).
  import Button from './Button.svelte'
  import GearIcon from './GearIcon.svelte'

  interface Props {
    /** Property name, for the button's accessible label. */
    label: string
    open: boolean
    onclick: () => void
  }

  let { label, open, onclick }: Props = $props()
</script>

<Button small aria-label="Settings for {label}" aria-expanded={open} {onclick}><GearIcon /></Button>

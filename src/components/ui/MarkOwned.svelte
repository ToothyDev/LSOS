<script lang="ts">
  // What a tab shows while nothing on it is owned (issue #60): what is missing, then a link to
  // mark it in Settings. With `property`, Settings opens on that property.
  import type { Snippet } from 'svelte'
  import { hashForTab } from '../../lib/tabs'
  import Hint from './Hint.svelte'

  interface Props {
    property?: string
    children: Snippet
  }

  let { property, children }: Props = $props()
</script>

<Hint
  >{@render children()} Mark what you own in
  <a href={hashForTab('settings', property)}>Settings</a>.</Hint
>

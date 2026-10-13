<script lang="ts">
  import { hashForTab } from '../lib/tabs'
  import { store } from '../lib/store.svelte'

  const status = $derived(store.status)
</script>

{#if status.kind === 'memory'}
  <p class="warning" role="alert">
    {status.reason === 'full' ? 'Browser storage is full.' : 'Browser storage is not available.'}
    LSOS keeps working, but changes are lost when this tab closes.
    <a href={hashForTab('settings')}>Export a backup</a> before closing.
  </p>
{:else if status.kind === 'blocked'}
  <p class="warning" role="alert">
    {status.reason === 'newer'
      ? status.message
      : `Your saved data could not be read. ${status.message}`}
    It is kept as it is and will not be overwritten; changes are not saved for now.
    <a href={hashForTab('settings')}>Export it</a> as a backup{status.reason === 'newer'
      ? ', or open the newer LSOS'
      : ''}.
  </p>
{/if}

<style>
  .warning {
    border: 1px solid var(--warn);
    color: var(--warn);
    margin: 0;
    padding: 0.75rem 1rem;
  }

  .warning a {
    color: inherit;
  }
</style>

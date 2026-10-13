<script lang="ts">
  import { exportFileName } from '../lib/state'
  import { exportText, importText, store } from '../lib/store.svelte'

  let fileInput: HTMLInputElement
  let message: { text: string; error: boolean } | null = $state(null)

  function exportBackup() {
    const blob = new Blob([exportText()], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = exportFileName(new Date())
    link.click()
    // Revoking right away can cancel the download in some browsers.
    setTimeout(() => URL.revokeObjectURL(url))
    message = { text: `Exported ${link.download}.`, error: false }
  }

  async function importBackup() {
    const file = fileInput.files?.[0]
    fileInput.value = ''
    if (!file) return
    const warning =
      store.status.kind === 'blocked'
        ? 'This replaces the saved data LSOS could not read. Export it first if you may need it. Continue?'
        : 'Replace all LSOS data with this file?'
    if (!confirm(warning)) return
    const error = importText(await file.text())
    message = error
      ? { text: `Could not import ${file.name}: ${error}`, error: true }
      : { text: `Imported ${file.name}.`, error: false }
  }
</script>

<section>
  <h2>Clock</h2>
  <label>
    <input type="checkbox" bind:checked={store.state.clock.trackOnOpen} />
    Start tracking play time when LSOS opens
  </label>
  <p class="hint">Off: LSOS opens paused and you press Start when you start playing.</p>
</section>

<section>
  <h2>Backup</h2>
  <p>
    Your data lives only in this browser. Export it to keep a copy or to move to another device.
  </p>
  <div class="actions">
    <button type="button" onclick={exportBackup}>Export</button>
    <button type="button" onclick={() => fileInput.click()}>Import</button>
    <input
      bind:this={fileInput}
      type="file"
      accept=".json,application/json"
      hidden
      onchange={importBackup}
    />
  </div>
  {#if message}
    <p class:error={message.error} role="status">{message.text}</p>
  {/if}
</section>

<style>
  h2 {
    font-size: 1rem;
    text-transform: uppercase;
  }

  .actions {
    display: flex;
    gap: 0.5rem;
  }

  button {
    background: none;
    border: 1px solid var(--accent);
    color: var(--accent);
    cursor: pointer;
    font: inherit;
    padding: 0.25rem 0.75rem;
    text-transform: uppercase;
  }

  label {
    align-items: center;
    cursor: pointer;
    display: flex;
    gap: 0.5rem;
  }

  input[type='checkbox'] {
    accent-color: var(--accent);
  }

  .hint {
    color: var(--muted);
  }

  .error {
    color: var(--warn);
  }
</style>

<script lang="ts">
  import { PROPERTIES } from '../data/properties'
  import { exportFileName } from '../lib/state'
  import { notificationsSupported, setNotify } from '../lib/overview.svelte'
  import { exportText, importText, setProperties, store } from '../lib/store.svelte'
  import PropertyList from './PropertyList.svelte'
  import Button from './ui/Button.svelte'
  import Panel from './ui/Panel.svelte'

  let fileInput: HTMLInputElement
  let message: { text: string; error: boolean } | null = $state(null)
  let alertError: string | null = $state(null)

  async function toggleNotify(event: Event) {
    const box = event.currentTarget as HTMLInputElement
    alertError = await setNotify(box.checked)
    box.checked = store.state.alerts.notify
  }

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

<div class="grid">
  <Panel title="Clock">
    <label>
      <input type="checkbox" bind:checked={store.state.clock.trackOnOpen} />
      Start tracking play time when LSOS opens
    </label>
    <p class="hint">
      Off (recommended): LSOS opens paused. Press Start once you have loaded into a GTA Online
      session, since that is when the game starts counting. On: loading screens count as play time
      too, unless you open LSOS only once you are in.
    </p>
  </Panel>

  <Panel title="Alerts">
    <label>
      <input
        type="checkbox"
        checked={store.state.alerts.notify}
        disabled={!notificationsSupported()}
        onchange={toggleNotify}
      />
      Notify me when something on the Overview is ready
    </label>
    <p class="hint">
      A browser notification when stock is full, supplies run out, a safe is full or a timer is
      ready, while LSOS is open in a tab and you are in another window, such as the game.
    </p>
    {#if alertError}
      <p class="error" role="status">{alertError}</p>
    {:else if !notificationsSupported()}
      <p class="hint">This browser cannot show notifications.</p>
    {/if}
  </Panel>

  <Panel title="Backup">
    <p>
      Your data lives only in this browser. Export it to keep a copy or to move to another device.
    </p>
    <div class="actions">
      <Button variant="primary" onclick={exportBackup}>Export</Button>
      <Button onclick={() => fileInput.click()}>Import</Button>
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
  </Panel>

  <!-- The long list goes last, across the whole width, in as many columns as fit. -->
  <div class="wide">
    <PropertyList catalog={PROPERTIES} owned={store.state.properties} onchange={setProperties} />
  </div>
</div>

<style>
  .grid {
    display: grid;
    gap: var(--space-5);
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 24rem), 1fr));
  }

  .wide {
    display: grid;
    grid-column: 1 / -1;
  }

  p {
    margin: 0;
  }

  .actions {
    display: flex;
    gap: var(--space-2);
  }

  label {
    align-items: center;
    cursor: pointer;
    display: flex;
    gap: var(--space-2);
  }

  input[type='checkbox'] {
    accent-color: var(--accent);
    height: 1.125rem;
    width: 1.125rem;
  }

  .hint {
    color: var(--muted);
    font-size: var(--text-sm);
  }

  .error {
    color: var(--danger);
  }
</style>

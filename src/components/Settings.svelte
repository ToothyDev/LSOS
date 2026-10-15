<script lang="ts">
  import { PROPERTIES } from '../data/properties'
  import { hiddenLabel } from '../lib/overview'
  import { exportFileName } from '../lib/state'
  import { notificationsSupported, setBrowserAlerts, showOnOverview } from '../lib/overview.svelte'
  import { exportText, importText, setProperties, store } from '../lib/store.svelte'
  import PropertyList from './PropertyList.svelte'
  import Button from './ui/Button.svelte'
  import Hint from './ui/Hint.svelte'
  import Panel from './ui/Panel.svelte'
  import Select from './ui/Select.svelte'

  interface Props {
    /** A property to open in the list, e.g. from a link to it. */
    select?: string
  }

  let { select }: Props = $props()

  let fileInput: HTMLInputElement
  let message: { text: string; error: boolean } | null = $state(null)
  let alertError: string | null = $state(null)

  async function toggleBrowser(event: Event) {
    const box = event.currentTarget as HTMLInputElement
    alertError = await setBrowserAlerts(box.checked)
    box.checked = store.state.alerts.browser
  }

  // How long before an item is due to alert (issue #15).
  const LEADS = [0, 1, 5, 10, 15, 30].map((minutes) => ({
    id: String(minutes * 60_000),
    label: minutes === 0 ? 'When it happens' : `${minutes} min before`,
  }))
  const alerts = $derived(store.state.alerts)
  const off = $derived(!alerts.browser && !alerts.popup)
  // Cards hidden from the Overview and the alerts (issue #62), by name.
  const hidden = $derived(
    store.state.overviewHidden
      .map((focus) => ({ focus, label: hiddenLabel(focus, PROPERTIES) }))
      .sort((a, b) => a.label.localeCompare(b.label)),
  )

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

<div class="layout">
  <div class="side">
    <Panel title="Clock">
      <label>
        <input type="checkbox" bind:checked={store.state.clock.trackOnOpen} />
        Start tracking play time when LSOS opens
      </label>
      <Hint>
        Off (recommended): LSOS opens paused. Press Start once you have loaded into a GTA Online
        session, since that is when the game starts counting. On: loading screens count as play time
        too, unless you open LSOS only once you are in.
      </Hint>
    </Panel>

    <Panel title="Alerts">
      <Hint>
        When stock is full, supplies run out, a safe is full or a timer is ready: anything on the
        Overview.
      </Hint>
      <label>
        <input
          type="checkbox"
          checked={alerts.popup}
          onchange={(e) => (store.state.alerts = { ...alerts, popup: e.currentTarget.checked })}
        />
        Pop-ups in LSOS
      </label>
      <label>
        <input
          type="checkbox"
          checked={alerts.browser}
          disabled={!notificationsSupported()}
          onchange={toggleBrowser}
        />
        Browser notifications, also over other windows
      </label>
      {#if alertError}
        <p class="error" role="status">{alertError}</p>
      {:else if !notificationsSupported()}
        <Hint>This browser cannot show notifications.</Hint>
      {/if}
      <div class="row" class:muted={off}>
        <label for="alert-lead">Alert</label>
        <Select
          id="alert-lead"
          value={String(alerts.leadMs)}
          options={LEADS}
          onchange={(id) => (store.state.alerts = { ...alerts, leadMs: Number(id) })}
        />
      </div>
      <label class:muted={off}>
        <input
          type="checkbox"
          checked={alerts.unfocusedOnly}
          onchange={(e) =>
            (store.state.alerts = { ...alerts, unfocusedOnly: e.currentTarget.checked })}
        />
        Only while LSOS is not the focused window, e.g. while you play
      </label>
      <Hint>Alerts come only while LSOS is open in a tab.</Hint>
    </Panel>

    <Panel title="Hidden from Overview">
      <Hint>
        Left out of the Overview and the alerts, but still tracked on their own tabs and counted in
        the money waiting. Hide one with Hide on its Overview item.
      </Hint>
      {#if hidden.length === 0}
        <p>Nothing is hidden.</p>
      {:else}
        <ul class="hidden">
          {#each hidden as item (item.focus)}
            <li>
              <span>{item.label}</span>
              <Button onclick={() => showOnOverview(item.focus)} aria-label="Show {item.label}"
                >Show</Button
              >
            </li>
          {/each}
        </ul>
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
  </div>

  <!-- The long list: beside the other settings where there is room, else after them. -->
  <div class="main">
    <PropertyList
      catalog={PROPERTIES}
      owned={store.state.properties}
      onchange={setProperties}
      {select}
    />
  </div>
</div>

<style>
  .layout {
    display: grid;
    gap: var(--space-5);
  }

  .side {
    align-content: start;
    display: grid;
    gap: var(--space-5);
    grid-template-columns: repeat(auto-fill, minmax(min(100%, var(--card-width)), 1fr));
  }

  /* Wide: the properties take the room, the other settings a narrow column on the right. */
  @media (min-width: 64rem) {
    .layout {
      align-items: start;
      grid-template-columns: minmax(0, 1fr) var(--card-width);
    }

    .side {
      grid-column: 2;
      grid-row: 1;
      grid-template-columns: minmax(0, 1fr);
    }

    .main {
      grid-column: 1;
      grid-row: 1;
    }
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

  .row {
    align-items: center;
    display: grid;
    gap: var(--space-3);
    grid-template-columns: auto 1fr;
  }

  .muted {
    opacity: 0.6;
  }

  .error {
    color: var(--danger);
  }

  .hidden {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .hidden li {
    align-items: center;
    display: flex;
    gap: var(--space-3);
    justify-content: space-between;
  }
</style>
